import type { Env } from '../env';

export type Aksi =
  | 'lapor'
  | 'analisis'
  | 'analisis_gagal'
  | 'status'
  | 'hapus'
  | 'masuk'
  | 'ringkasan'
  | 'pengguna'
  | 'bukti_ditolak'
  | 'verifikasi_gagal'
  | 'tanya';

export const AKSI: Aksi[] = [
  'lapor',
  'analisis',
  'analisis_gagal',
  'status',
  'hapus',
  'masuk',
  'ringkasan',
  'pengguna',
  'bukti_ditolak',
  'verifikasi_gagal',
  'tanya',
];

export interface BarisAktivitas {
  id: number;
  waktu: string;
  aksi: Aksi;
  report_id: string | null;
  pelaku: string;
  ringkas: string;
  rincian: string | null;
}

export async function simpan(
  env: Env,
  data: {
    aksi: Aksi;
    report_id: string | null;
    pelaku: string;
    ringkas: string;
    rincian: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO aktivitas (aksi, report_id, pelaku, ringkas, rincian) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(data.aksi, data.report_id, data.pelaku, data.ringkas, data.rincian)
    .run();
}

export async function cari(
  env: Env,
  filter: { aksi?: string; report_id?: string; limit?: number },
): Promise<BarisAktivitas[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.aksi && (AKSI as string[]).includes(filter.aksi)) {
    where.push('aksi = ?');
    params.push(filter.aksi);
  }
  if (filter.report_id) {
    where.push('report_id = ?');
    params.push(filter.report_id);
  }

  const rows = await env.DB.prepare(
    `SELECT id, waktu, aksi, report_id, pelaku, ringkas, rincian
       FROM aktivitas
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY waktu DESC, id DESC
      LIMIT ?`,
  )
    .bind(...params, filter.limit ?? 100)
    .all<BarisAktivitas>();
  return rows.results;
}
