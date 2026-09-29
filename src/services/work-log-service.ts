import { checkProofPhoto } from '../adapters/llm';
import { readPhoto, FOLDER, deletePhoto } from '../adapters/storage';
import { workLogToDTO, type ProofVerdict, type ProofVerification } from '../domain/types';
import type { Env } from '../env';
import * as locations from '../repositories/locations';
import * as workLogs from '../repositories/work-logs';
import { log } from './activity-service';

/**
 * Staff work logs: "I cleaned this toilet".
 *
 * The flow mirrors a student report (floor QR → pick the toilet → describe →
 * photograph), but the photo is judged by the vision model before anything is
 * stored, exactly like the proof photo that closes a complaint. A work log
 * that claims a clean toilet must show one.
 */

export type WorkLogSubmitResult =
  | {
      kind: 'ok';
      id: string;
      toilet: string;
      duplicate: boolean;
      verification: ProofVerification | null;
    }
  | { kind: 'unknown-location' }
  | { kind: 'photo-not-found' }
  | { kind: 'proof-rejected'; verdict: Exclude<ProofVerdict, 'clean'>; reason: string }
  | { kind: 'verification-failed'; message: string };

export async function submitWorkLog(
  env: Env,
  data: { toilet_id: string; description: string; photo_key: string },
  staff: { id: string; name: string },
): Promise<WorkLogSubmitResult> {
  const toiletName = await locations.activeToiletName(env, data.toilet_id);
  if (!toiletName) {
    await deletePhoto(env, data.photo_key);
    return { kind: 'unknown-location' };
  }

  // A double-tapped send uploads a second photo; drop it and answer with the first log.
  const duplicate = await workLogs.findDuplicate(env, staff.id, data.toilet_id, data.description);
  if (duplicate) {
    await deletePhoto(env, data.photo_key);
    return { kind: 'ok', id: duplicate, toilet: toiletName, duplicate: true, verification: null };
  }

  // Only a photo uploaded for a work log counts; a student's condition photo does not.
  const photo = data.photo_key.startsWith(`${FOLDER.work}/`)
    ? await readPhoto(env, data.photo_key)
    : null;
  if (!photo) return { kind: 'photo-not-found' };

  const start = Date.now();
  let check;
  try {
    check = await checkProofPhoto(env, photo, {
      location: toiletName,
      complaint: `(Tidak ada keluhan: ini laporan pembersihan rutin.) Catatan petugas: ${data.description}`,
      categories: [],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Work-log photo verification failed at ${data.toilet_id}: ${message}`);
    await deletePhoto(env, data.photo_key);
    await log(env, {
      action: 'verification_failed',
      actor: staff.name,
      summary: `Pemeriksaan foto laporan pekerjaan gagal di ${toiletName}`,
      details: { error: message.slice(0, 300), model: env.VISION_MODEL },
    });
    return { kind: 'verification-failed', message };
  }
  const ms = Date.now() - start;

  if (check.verdict !== 'clean') {
    await deletePhoto(env, data.photo_key);
    await log(env, {
      action: 'proof_rejected',
      actor: staff.name,
      summary: `Foto laporan pekerjaan ditolak (${check.verdict}) di ${toiletName}: ${check.reason}`,
      details: {
        verdict: check.verdict,
        reason: check.reason,
        confidence: check.confidence,
        description: data.description,
        model: env.VISION_MODEL,
        ms,
      },
    });
    return { kind: 'proof-rejected', verdict: check.verdict, reason: check.reason };
  }

  const verification: ProofVerification = {
    verdict: 'clean',
    reason: check.reason,
    model: env.VISION_MODEL,
    ms,
  };
  const id = crypto.randomUUID();
  await workLogs.insert(env, {
    id,
    ...data,
    staff_id: staff.id,
    staff_name: staff.name,
    verification,
  });

  await log(env, {
    action: 'work_logged',
    actor: staff.name,
    summary: `Membersihkan ${toiletName}`,
    details: {
      work_log_id: id,
      toilet_id: data.toilet_id,
      description: data.description,
      verification,
    },
  });

  return { kind: 'ok', id, toilet: toiletName, duplicate: false, verification };
}

export async function listWorkLogs(env: Env, filter: workLogs.WorkLogFilter) {
  return (await workLogs.find(env, filter)).map(workLogToDTO);
}
