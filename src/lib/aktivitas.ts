import type { Env } from '../types';

export type Aksi =
  | 'lapor'
  | 'analisis'
  | 'analisis_gagal'
  | 'status'
  | 'hapus'
  | 'masuk'
  | 'ringkasan';

/** Pelaku selain petugas bernama: laporan datang dari pelapor, cron dari sistem. */
export const PELAPOR = 'pelapor';
export const SISTEM = 'sistem';

/**
 * Menulis satu baris catatan aktivitas.
 *
 * Kegagalan mencatat tidak boleh menggagalkan tindakan yang sedang berjalan —
 * laporan yang masuk lebih penting daripada jejaknya. Karena itu semua galat
 * ditelan di sini dan hanya dicetak ke log Worker.
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
