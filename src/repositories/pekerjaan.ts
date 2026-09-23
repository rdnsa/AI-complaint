import { rentangHariWIB } from '../adapters/clock';
import type { PekerjaanRow, VerifikasiBukti } from '../domain/types';
import type { Env } from '../env';

/** Every SQL statement about staff work reports lives here. */

const KOLOM = `p.*, t.nama AS toilet_nama, t.gedung_kode, t.gedung_nama, t.lantai, t.jenis`;
const DARI = `FROM pekerjaan p JOIN toilet_info t ON t.id = p.toilet_id`;

export interface FilterPekerjaan {
  petugas_id?: string;
  toilet_id?: string;
  gedung?: string;
  tanggal?: string;
  limit?: number;
}

export async function cari(env: Env, f: FilterPekerjaan): Promise<PekerjaanRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.petugas_id) {
    where.push('p.petugas_id = ?');
    params.push(f.petugas_id);
  }
  if (f.toilet_id) {
    where.push('p.toilet_id = ?');
    params.push(f.toilet_id);
  }
  if (f.gedung) {
    where.push('t.gedung_kode = ?');
    params.push(f.gedung.toUpperCase());
  }
  if (f.tanggal) {
    const { mulai, selesai } = rentangHariWIB(f.tanggal);
    where.push('p.created_at >= ? AND p.created_at < ?');
    params.push(mulai, selesai);
  }

  const rows = await env.DB.prepare(
    `SELECT ${KOLOM} ${DARI}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY p.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<PekerjaanRow>();
  return rows.results;
}

/** Same guard as for student reports: the same text twice within two minutes is a double tap. */
export async function cariKembar(
  env: Env,
  petugasId: string,
  toiletId: string,
  teks: string,
): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT id FROM pekerjaan
      WHERE petugas_id = ? AND toilet_id = ? AND teks = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(petugasId, toiletId, teks)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function simpan(
  env: Env,
  data: {
    id: string;
    toilet_id: string;
    petugas_id: string;
    petugas: string;
    teks: string;
    foto_key: string;
    verifikasi: VerifikasiBukti;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO pekerjaan
       (id, toilet_id, petugas_id, petugas, teks, foto_key,
        bukti_ai_hasil, bukti_ai_alasan, bukti_ai_model, bukti_ai_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      data.id,
      data.toilet_id,
      data.petugas_id,
      data.petugas,
      data.teks,
      data.foto_key,
      data.verifikasi.hasil,
      data.verifikasi.alasan,
      data.verifikasi.model,
      data.verifikasi.ms,
    )
    .run();
}
