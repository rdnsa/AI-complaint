import type { Env } from '../env';

/** Buildings and the floors of theirs that have a registered toilet. */
export interface BarisLokasi {
  gedung_kode: string;
  gedung_nama: string;
  gedung_urutan: number;
  lantai: number;
}

export async function semuaLokasi(env: Env): Promise<BarisLokasi[]> {
  const rows = await env.DB.prepare(
    `SELECT DISTINCT gedung_kode, gedung_nama, gedung_urutan, lantai
       FROM toilet_info WHERE aktif = 1
      ORDER BY gedung_urutan, lantai`,
  ).all<BarisLokasi>();
  return rows.results;
}

export interface BarisToilet {
  id: string;
  jenis: string;
  gedung_kode: string;
  gedung_nama: string;
  lantai: number;
}

export async function toiletPadaLantai(
  env: Env,
  kode: string,
  lantai: number,
): Promise<BarisToilet[]> {
  const rows = await env.DB.prepare(
    `SELECT id, jenis, gedung_kode, gedung_nama, lantai
       FROM toilet_info
      WHERE gedung_kode = ? AND lantai = ? AND aktif = 1
      ORDER BY CASE jenis WHEN 'pria' THEN 0 WHEN 'wanita' THEN 1 ELSE 2 END`,
  )
    .bind(kode, lantai)
    .all<BarisToilet>();
  return rows.results;
}

export async function namaToiletAktif(env: Env, id: string): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT nama FROM toilet_info WHERE id = ? AND aktif = 1`)
    .bind(id)
    .first<{ nama: string }>();
  return row?.nama ?? null;
}
