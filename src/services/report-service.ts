import { checkProofPhoto } from '../adapters/llm';
import { readPhoto, FOLDER, deletePhoto } from '../adapters/storage';
import {
  canResolve,
  toDTO,
  photoUrl,
  type Category,
  type ProofVerdict,
  type ProofVerification,
  type ReportDTO,
  type ReportRow,
  type ReportStatus,
} from '../domain/types';
import type { Env } from '../env';
import * as locations from '../repositories/locations';
import * as reports from '../repositories/reports';
import { log, REPORTER } from './activity-service';
import { runAnalysis } from './analysis-service';

/**
 * The use cases around a report.
 *
 * Business rules live here rather than in the route handlers, so the same rule
 * holds no matter which entry point triggers it — an HTTP request today, a cron
 * job or an admin tool tomorrow.
 */

export type SubmitResult =
  | { kind: 'ok'; id: string; toilet: string; duplicate: boolean }
  | { kind: 'unknown-location' };

export async function submitReport(
  env: Env,
  data: { toilet_id: string; description: string; photo_key: string },
  reporter: { id: string; name: string } | null,
): Promise<SubmitResult> {
  const toiletName = await locations.activeToiletName(env, data.toilet_id);
  if (!toiletName) return { kind: 'unknown-location' };

  const duplicate = await reports.findDuplicate(env, data.toilet_id, data.description);
  if (duplicate) return { kind: 'ok', id: duplicate, toilet: toiletName, duplicate: true };

  const id = crypto.randomUUID();
  await reports.insert(env, { id, ...data, reporter_id: reporter?.id ?? null });

  await log(env, {
    action: 'report_created',
    report_id: id,
    actor: reporter?.name ?? REPORTER,
    summary: `Laporan baru di ${toiletName}`,
    details: { toilet_id: data.toilet_id, description: data.description },
  });

  return { kind: 'ok', id, toilet: toiletName, duplicate: false };
}

export async function getReport(env: Env, id: string): Promise<ReportDTO | null> {
  const row = await reports.findById(env, id);
  return row ? toDTO(row) : null;
}

export async function dashboardReports(env: Env, filter: reports.ReportFilter) {
  return (await reports.findForDashboard(env, filter)).map(toDTO);
}

/**
 * What staff need to fix a complaint: the student's text and condition photo,
 * the AI summary and advice. The reporter's account and the AI internals are
 * left out, since this list is readable without signing in.
 */
export async function openReports(
  env: Env,
  filter: { building?: string; floor?: number; limit?: number },
) {
  return (await reports.findOpen(env, filter)).map((row) => {
    const {
      reporter_id: _reporter,
      ai_error: _error,
      ai_model: _model,
      ai_ms: _ms,
      proof_model: _proofModel,
      proof_ms: _proofMs,
      ...dto
    } = toDTO(row);
    return dto;
  });
}

export async function reporterReports(env: Env, reporterId: string) {
  return (await reports.findByReporter(env, reporterId)).map(toDTO);
}

/**
 * The public board deliberately drops raw text, reporter photos, and staff
 * names; only the proof photo is exposed, because that is what makes the claim
 * "already handled" checkable by anyone.
 */
export async function publicBoard(env: Env, filter: reports.ReportFilter) {
  const { rows, counts } = await reports.findForPublic(env, filter);
  return {
    data: rows.map(({ proof_photo_key, categories, ...row }) => ({
      ...row,
      categories: categories ? (JSON.parse(categories) as string[]) : [],
      proof_photo_url: photoUrl(proof_photo_key),
    })),
    counts,
  };
}

export type StatusChangeResult =
  | { kind: 'ok'; status: ReportStatus; verification: ProofVerification | null }
  | { kind: 'not-found' }
  | { kind: 'photo-not-found' }
  | { kind: 'proof-missing' }
  | { kind: 'proof-rejected'; verdict: Exclude<ProofVerdict, 'clean'>; reason: string }
  | { kind: 'verification-failed'; message: string };

type StoredProof = { key: string; verification: ProofVerification } | null;

/** The proof already on the report, if it was ever verified. */
function existingProof(row: ReportRow): StoredProof {
  if (!row.proof_photo_key || !row.proof_verdict) return null;
  return {
    key: row.proof_photo_key,
    verification: {
      verdict: row.proof_verdict,
      reason: row.proof_reason ?? '',
      model: row.proof_model ?? '',
      ms: row.proof_ms ?? 0,
    },
  };
}

type ProofCheckResult =
  | { kind: 'accepted'; proof: NonNullable<StoredProof> }
  | Extract<
      StatusChangeResult,
      { kind: 'photo-not-found' | 'proof-rejected' | 'verification-failed' }
    >;

/**
 * Runs the vision check on a freshly uploaded proof photo.
 *
 * A photo that does not pass is deleted again: the bucket only ever holds
 * proof that passed, and the verdict survives in the activity log. A failure
 * of the checker itself is reported separately so staff know to retry rather
 * than to re-clean; the retry uploads a fresh copy, so that photo goes too.
 */
async function checkNewProof(
  env: Env,
  row: ReportRow,
  key: string,
  staffName: string,
): Promise<ProofCheckResult> {
  // Only a photo uploaded as proof counts: closing is open to anyone who picks
  // a staff name, so a student's condition photo must not be reusable here.
  const photo = key.startsWith(`${FOLDER.proof}/`) ? await readPhoto(env, key) : null;
  if (!photo) return { kind: 'photo-not-found' };

  const start = Date.now();
  let check;
  try {
    check = await checkProofPhoto(env, photo, {
      location: row.toilet_name ?? row.toilet_id,
      complaint: row.description,
      categories: row.categories ? (JSON.parse(row.categories) as Category[]) : [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Proof verification failed for report ${row.id}: ${message}`);
    await deletePhoto(env, key);
    await log(env, {
      action: 'verification_failed',
      report_id: row.id,
      actor: staffName,
      summary: `Pemeriksaan foto bukti gagal di ${row.toilet_name}`,
      details: { error: message.slice(0, 300), model: env.VISION_MODEL },
    });
    return { kind: 'verification-failed', message };
  }
  const ms = Date.now() - start;

  if (check.verdict !== 'clean') {
    await deletePhoto(env, key);
    await log(env, {
      action: 'proof_rejected',
      report_id: row.id,
      actor: staffName,
      summary: `Foto bukti ditolak (${check.verdict}) di ${row.toilet_name}: ${check.reason}`,
      details: {
        verdict: check.verdict,
        reason: check.reason,
        confidence: check.confidence,
        model: env.VISION_MODEL,
        ms,
      },
    });
    return { kind: 'proof-rejected', verdict: check.verdict, reason: check.reason };
  }

  return {
    kind: 'accepted',
    proof: {
      key,
      verification: { verdict: 'clean', reason: check.reason, model: env.VISION_MODEL, ms },
    },
  };
}

export async function changeStatus(
  env: Env,
  id: string,
  status: ReportStatus,
  staffName: string,
  newProofPhoto: string | null,
): Promise<StatusChangeResult> {
  const before = await reports.findById(env, id);
  if (!before) return { kind: 'not-found' };

  // A new photo must pass the vision check before anything else changes.
  let proof = existingProof(before);
  if (newProofPhoto) {
    const check = await checkNewProof(env, before, newProofPhoto, staffName);
    if (check.kind !== 'accepted') return check;
    proof = check.proof;
  }

  if (!canResolve(status, proof?.key ?? null, proof?.verification.verdict ?? null)) {
    return { kind: 'proof-missing' };
  }

  await reports.updateStatus(env, id, status, staffName, proof);

  await log(env, {
    action: 'status_changed',
    report_id: id,
    actor: staffName,
    summary: `Status ${before.status} → ${status} di ${before.toilet_name}`,
    details: {
      from: before.status,
      to: status,
      proof_photo: proof?.key ?? null,
      verification: proof?.verification ?? null,
    },
  });

  return { kind: 'ok', status, verification: proof?.verification ?? null };
}

export async function requestReanalysis(env: Env, id: string): Promise<boolean> {
  const exists = await reports.findById(env, id);
  if (!exists) return false;
  await reports.markAnalysisPending(env, id);
  return true;
}

/**
 * Deleting is the only action that destroys data, so the full report is copied
 * into the activity log first. That copy is what lets management inspect a
 * report that disappeared, along with who removed it.
 */
export async function deleteReport(env: Env, id: string, actor: string): Promise<boolean> {
  const row = await reports.findById(env, id);
  if (!row) return false;

  await log(env, {
    action: 'report_deleted',
    report_id: id,
    actor,
    summary: `Menghapus laporan di ${row.toilet_name}`,
    details: {
      toilet_name: row.toilet_name,
      description: row.description,
      status: row.status,
      priority: row.priority,
      categories: row.categories,
      summary: row.summary,
      created_at: row.created_at,
      had_photo: Boolean(row.photo_key),
    },
  });

  await reports.remove(env, id);
  await deletePhoto(env, row.photo_key, row.proof_photo_key);
  return true;
}

export { runAnalysis };
