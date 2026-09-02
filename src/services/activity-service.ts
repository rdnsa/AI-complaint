import * as aktivitas from '../repositories/activity';
import type { Aksi } from '../repositories/activity';
import type { Env } from '../env';

/** Actors that are not a named staff member. */
export const PELAPOR = 'pelapor';
export const SISTEM = 'sistem';

/**
 * Writes a single activity-log row.
 *
 * A failure to log must never fail the action being logged — accepting the
 * report matters more than recording it. Every error is therefore swallowed
 * here and only printed to the Worker log.
 */
export async function catat(
  env: Env,
  data: { aksi: Aksi; pelaku: string; ringkas: string; report_id?: string | null; rincian?: unknown },
): Promise<void> {
  try {
    await aktivitas.simpan(env, {
      aksi: data.aksi,
      report_id: data.report_id ?? null,
      pelaku: data.pelaku,
      ringkas: data.ringkas,
      rincian: data.rincian === undefined ? null : JSON.stringify(data.rincian),
    });
  } catch (err) {
    console.error('Gagal mencatat aktivitas:', err);
  }
}

/** The log as management reads it, with the JSON detail already parsed. */
export async function riwayat(env: Env, filter: { aksi?: string; report_id?: string; limit?: number }) {
  const baris = await aktivitas.cari(env, filter);
  return baris.map((b) => ({ ...b, rincian: b.rincian ? JSON.parse(b.rincian) : null }));
}
