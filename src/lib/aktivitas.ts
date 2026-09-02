import type { Env } from '../types';

export type Aksi =
  | 'lapor'
  | 'analisis'
  | 'analisis_gagal'
  | 'status'
  | 'hapus'
  | 'masuk'
  | 'ringkasan'
  | 'pengguna';

/** Actors that are not a named staff member: reports come from a reporter, cron from the system. */
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
  data: {
    aksi: Aksi;
    pelaku: string;
    ringkas: string;
    report_id?: string | null;
    rincian?: unknown;
  },
): Promise<void> {
  try {
    await env.DB.prepare(
      `INSERT INTO aktivitas (aksi, report_id, pelaku, ringkas, rincian)
       VALUES (?, ?, ?, ?, ?)`,
    )
      .bind(
        data.aksi,
        data.report_id ?? null,
        data.pelaku,
        data.ringkas,
        data.rincian === undefined ? null : JSON.stringify(data.rincian),
      )
      .run();
  } catch (err) {
    console.error('Gagal mencatat aktivitas:', err);
  }
}
