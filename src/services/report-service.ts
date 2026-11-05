import { describeProofPhoto } from '../adapters/llm';
import { photoUploadedAt, readPhoto, readProofNote, saveProofNote, FOLDER, deletePhoto } from '../adapters/storage';
import {
  canResolve,
  toDTO,
  photoUrl,
  type ReportDTO,
  type ReportRow,
  type ReportStatus,
} from '../domain/types';
import { reportsChanged } from '../adapters/memo';
import type { Env } from '../env';
import * as cleaning from '../repositories/cleaning';
import * as reports from '../repositories/reports';
import { log, REPORTER, SYSTEM } from './activity-service';
import { runAnalysis } from './analysis-service';

/**
 * The use cases around a report.
 *
 * Business rules live here rather than in the route handlers, so the same rule
 * holds no matter which entry point triggers it — an HTTP request today, a cron
 * job or an admin tool tomorrow.
 */

export type SubmitResult =
  | { kind: 'ok'; id: string; location: string; duplicate: boolean }
  | { kind: 'unknown-location' };

/** A complaint about one location: a floor, a building's yard, or a place like Lapang Voli. */
export async function submitReport(
  env: Env,
  data: { area_id: string; description: string; photo_key: string },
  reporter: { id: string; name: string } | null,
): Promise<SubmitResult> {
  const area = await cleaning.activeArea(env, data.area_id);
  if (!area) return { kind: 'unknown-location' };

  const duplicate = await reports.findDuplicate(env, area.id, data.description);
  if (duplicate) return { kind: 'ok', id: duplicate, location: area.name, duplicate: true };

  const id = crypto.randomUUID();
  await reports.insert(env, { id, ...data, area_id: area.id, reporter_id: reporter?.id ?? null });
  reportsChanged();

  await log(env, {
    action: 'report_created',
    report_id: id,
    actor: reporter?.name ?? REPORTER,
    summary: `Laporan baru di ${area.name}`,
    details: { area_id: area.id, description: data.description },
  });

  return { kind: 'ok', id, location: area.name, duplicate: false };
}

export async function getReport(env: Env, id: string): Promise<ReportDTO | null> {
  const row = await reports.findById(env, id);
  return row ? toDTO(row) : null;
}

export async function dashboardReports(env: Env, filter: reports.ReportFilter) {
  return (await reports.findForDashboard(env, filter)).map(toDTO);
}

/**
 * What staff need to fix a complaint: the reporter's text and condition photo,
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
  | { kind: 'ok'; status: ReportStatus }
  | { kind: 'not-found' }
  | { kind: 'already-resolved' }
  | { kind: 'photo-not-found' }
  | { kind: 'proof-missing' };

export async function changeStatus(
  env: Env,
  id: string,
  status: ReportStatus,
  staffName: string,
  newProofPhoto: string | null,
): Promise<StatusChangeResult> {
  const before = await reports.findById(env, id);
  if (!before) return { kind: 'not-found' };

  // Closed is closed: nobody overwrites the name, time or photo of a finished report.
  // Only a supervisor can change it, by reopening it first (reopenReport).
  if (before.status === 'resolved') return { kind: 'already-resolved' };

  // Claiming what you already hold changes nothing, so it is neither written nor logged twice.
  if (status === 'in_progress' && before.status === 'in_progress' && before.staff_name === staffName) {
    return { kind: 'ok', status };
  }

  // Another staff member taking over a claim that never reached a proof photo.
  const handedOverFrom =
    status === 'in_progress' && before.status === 'in_progress' && before.staff_name ? before.staff_name : null;

  // Only a photo uploaded as proof counts: closing is open to anyone who picks a
  // staff name, so a reporter's condition photo must not be reusable here.
  if (newProofPhoto && !(newProofPhoto.startsWith(`${FOLDER.proof}/`) && (await photoUploadedAt(env, newProofPhoto)))) {
    return { kind: 'photo-not-found' };
  }
  const proofPhoto = newProofPhoto ?? before.proof_photo_key;

  if (!canResolve(status, proofPhoto)) {
    return { kind: 'proof-missing' };
  }

  await reports.updateStatus(env, id, status, staffName, proofPhoto);
  reportsChanged();

  await log(env, {
    action: 'status_changed',
    report_id: id,
    actor: staffName,
    summary: handedOverFrom
      ? `${staffName} mengambil alih laporan di ${before.location_name} dari ${handedOverFrom}`
      : `Status ${before.status} → ${status} di ${before.location_name}`,
    details: {
      from: before.status,
      to: status,
      handed_over_from: handedOverFrom,
      proof_photo: proofPhoto,
    },
  });

  return { kind: 'ok', status };
}

export async function requestReanalysis(env: Env, id: string): Promise<boolean> {
  const exists = await reports.findById(env, id);
  if (!exists) return false;
  await reports.markAnalysisPending(env, id);
  reportsChanged();
  return true;
}

/**
 * Deleting is the only action that destroys data, so the full report is copied
 * into the activity log first. That copy is what lets management inspect a
 * report that disappeared, along with who removed it.
 */
type ProofDescription = { text: string; ms: number };

/** Asks the vision model what a photo shows. Never throws: a failure is logged and means no description. */
async function describe(env: Env, row: ReportRow, photoKey: string): Promise<ProofDescription | null> {
  const start = Date.now();
  try {
    const photo = await readPhoto(env, photoKey);
    if (!photo) return null;
    const text = await describeProofPhoto(env, photo, {
      location: row.location_name ?? row.area_id ?? '',
      complaint: row.description,
    });
    const note = { text, ms: Date.now() - start };
    await saveProofNote(env, photoKey, photo, note);
    return note;
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Proof description failed for report ${row.id}: ${message}`);
    await log(env, {
      action: 'proof_description_failed',
      report_id: row.id,
      actor: SYSTEM,
      summary: 'Deskripsi foto bukti gagal dibuat',
      details: { error: message.slice(0, 300), model: env.VISION_MODEL },
    });
    return null;
  }
}

export type ProofPreviewResult =
  | { kind: 'ok'; description: string | null }
  | { kind: 'not-found' }
  | { kind: 'already-resolved' }
  | { kind: 'photo-not-found' };

/**
 * What staff see before sending: the model's description of the photo just taken.
 * It only informs. The report does not change, and a failed description (null)
 * does not stop staff from sending the photo.
 */
export async function previewProof(env: Env, reportId: string, photoKey: string): Promise<ProofPreviewResult> {
  const row = await reports.findById(env, reportId);
  if (!row) return { kind: 'not-found' };
  if (row.status === 'resolved') return { kind: 'already-resolved' };
  if (!photoKey.startsWith(`${FOLDER.proof}/`) || !(await photoUploadedAt(env, photoKey))) {
    return { kind: 'photo-not-found' };
  }
  return { kind: 'ok', description: (await describe(env, row, photoKey))?.text ?? null };
}

/**
 * Puts the description on the closed report, for the supervisor: the one staff
 * already saw, or a new try when there was none. Runs through `ctx.waitUntil()`,
 * after the response, so it can never hold up or refuse the close.
 */
export async function runProofDescription(env: Env, reportId: string, photoKey: string): Promise<void> {
  const row = await reports.findById(env, reportId);
  if (!row) return;
  const note = (await readProofNote(env, photoKey)) ?? (await describe(env, row, photoKey));
  if (note) await reports.saveProofDescription(env, reportId, photoKey, { ...note, model: env.VISION_MODEL });
}

export type ReopenResult = { kind: 'ok' } | { kind: 'not-found' } | { kind: 'not-resolved' };

/**
 * A supervisor sends a badly closed report back to the staff list. The photo it
 * was closed with stays in storage and in the log: it is the evidence of why.
 */
export async function reopenReport(env: Env, id: string, actor: string): Promise<ReopenResult> {
  const row = await reports.findById(env, id);
  if (!row) return { kind: 'not-found' };
  if (!(await reports.reopen(env, id))) return { kind: 'not-resolved' };
  reportsChanged();

  await log(env, {
    action: 'report_reopened',
    report_id: id,
    actor,
    summary: `Membuka kembali laporan di ${row.location_name} yang diselesaikan ${row.staff_name ?? 'petugas'}`,
    details: {
      closed_by: row.staff_name,
      resolved_at: row.resolved_at,
      proof_photo: row.proof_photo_key,
    },
  });
  return { kind: 'ok' };
}

export async function deleteReport(env: Env, id: string, actor: string): Promise<boolean> {
  const row = await reports.findById(env, id);
  if (!row) return false;

  await log(env, {
    action: 'report_deleted',
    report_id: id,
    actor,
    summary: `Menghapus laporan di ${row.location_name}`,
    details: {
      location_name: row.location_name,
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
  reportsChanged();
  await deletePhoto(env, row.photo_key, row.proof_photo_key);
  return true;
}

export { runAnalysis };
