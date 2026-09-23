import { rentangHariWIB } from '../adapters/clock';
import type { Env } from '../env';
import {
  PRIORITAS,
  STATUS,
  type ReportRow,
  type Status,
  type VerifikasiBukti,
} from '../domain/types';
import { susunFilterWaktu, type FilterWaktu } from './waktu';

/**
 * Every SQL statement about reports lives here.
 *
 * Services above this file never see a query, and swapping D1 for another
 * database would mean rewriting this file alone.
 */

const KOLOM = `r.*, t.nama AS toilet_nama, t.gedung_kode, t.gedung_nama, t.lantai, t.jenis`;
const DARI = `FROM reports r JOIN toilet_info t ON t.id = r.toilet_id`;

export interface FilterLaporan extends FilterWaktu {
  status?: string;
  prioritas?: string;
  toilet_id?: string;
  gedung?: string;
  limit?: number;
}

/** Builds the shared WHERE clause, so list queries cannot drift apart. */
function susunFilter(f: FilterLaporan): { klausa: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.status && (STATUS as readonly string[]).includes(f.status)) {
    where.push('r.status = ?');
    params.push(f.status);
  }
  if (f.prioritas && (PRIORITAS as readonly string[]).includes(f.prioritas)) {
    where.push('r.prioritas = ?');
    params.push(f.prioritas);
  }
  if (f.toilet_id) {
    where.push('r.toilet_id = ?');
    params.push(f.toilet_id);
  }
  if (f.gedung) {
    where.push('t.gedung_kode = ?');
    params.push(f.gedung.toUpperCase());
  }
  const waktu = susunFilterWaktu('r.created_at', f);
  where.push(...waktu.where);
  params.push(...waktu.params);

  return { klausa: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function cariSatu(env: Env, id: string): Promise<ReportRow | null> {
  return env.DB.prepare(`SELECT ${KOLOM} ${DARI} WHERE r.id = ?`).bind(id).first<ReportRow>();
}

export async function cariUntukDashboard(env: Env, f: FilterLaporan): Promise<ReportRow[]> {
  const { klausa, params } = susunFilter(f);
  const rows = await env.DB.prepare(
    `SELECT ${KOLOM} ${DARI} ${klausa}
      ORDER BY
        CASE r.status WHEN 'baru' THEN 0 WHEN 'diproses' THEN 1 ELSE 2 END,
        CASE r.prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END,
        r.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<ReportRow>();
  return rows.results;
}

export interface BarisPublik {
  id: string;
  status: Status;
  prioritas: string | null;
  kategori: string | null;
  ringkasan: string | null;
  ai_status: string;
  created_at: string;
  selesai_at: string | null;
  foto_selesai_key: string | null;
  toilet_nama: string;
  gedung_kode: string;
  lantai: number;
}

export async function cariUntukPublik(
  env: Env,
  f: FilterLaporan,
): Promise<{ baris: BarisPublik[]; jumlah: { total: number; selesai: number | null } }> {
  const { klausa, params } = susunFilter(f);
  const [daftar, jumlah] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
      `SELECT r.id, r.status, r.prioritas, r.kategori, r.ringkasan, r.ai_status,
              r.created_at, r.selesai_at, r.foto_selesai_key,
              t.nama AS toilet_nama, t.gedung_kode, t.lantai
         ${DARI} ${klausa}
        ORDER BY
          CASE r.status WHEN 'baru' THEN 0 WHEN 'diproses' THEN 1 ELSE 2 END,
          r.created_at DESC
        LIMIT ?`,
    ).bind(...params, f.limit ?? 100),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status = 'selesai') AS selesai FROM reports`),
  ]);

  return {
    baris: daftar.results as unknown as BarisPublik[],
    jumlah: (jumlah.results[0] as { total: number; selesai: number | null }) ?? {
      total: 0,
      selesai: 0,
    },
  };
}

/**
 * Reports still waiting for staff, for the staff pages. Optionally one floor:
 * the floor QR leads staff to exactly the complaints they can fix there.
 */
export async function cariTerbuka(
  env: Env,
  f: { gedung?: string; lantai?: number; limit?: number },
): Promise<ReportRow[]> {
  const where = [`r.status <> 'selesai'`];
  const params: unknown[] = [];
  if (f.gedung) {
    where.push('t.gedung_kode = ?');
    params.push(f.gedung.toUpperCase());
  }
  if (f.lantai !== undefined) {
    where.push('t.lantai = ?');
    params.push(f.lantai);
  }
  const rows = await env.DB.prepare(
    `SELECT ${KOLOM} ${DARI} WHERE ${where.join(' AND ')}
      ORDER BY
        CASE r.prioritas WHEN 'tinggi' THEN 0 WHEN 'sedang' THEN 1 WHEN 'rendah' THEN 2 ELSE 3 END,
        r.created_at
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<ReportRow>();
  return rows.results;
}

/** The reports filed by one account, for the "My reports" list. */
export async function cariMilikPelapor(env: Env, pelaporId: string): Promise<ReportRow[]> {
  const rows = await env.DB.prepare(
    `SELECT ${KOLOM} ${DARI} WHERE r.pelapor_id = ? ORDER BY r.created_at DESC LIMIT 50`,
  )
    .bind(pelaporId)
    .all<ReportRow>();
  return rows.results;
}

/**
 * An identical complaint for the same toilet within two minutes is almost
 * certainly a double-tapped send button, not two different people.
 */
export async function cariKembar(env: Env, toiletId: string, teks: string): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT id FROM reports
      WHERE toilet_id = ? AND teks = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(toiletId, teks)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function simpan(
  env: Env,
  data: { id: string; toilet_id: string; teks: string; foto_key: string; pelapor_id: string | null },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO reports (id, toilet_id, teks, foto_key, pelapor_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(data.id, data.toilet_id, data.teks, data.foto_key, data.pelapor_id)
    .run();
}

/** The proof photo and its verdict are written together: one never exists without the other. */
export async function ubahStatus(
  env: Env,
  id: string,
  status: Status,
  petugas: string,
  bukti: { key: string; verifikasi: VerifikasiBukti } | null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET status = ?, petugas = ?,
            foto_selesai_key = ?, bukti_ai_hasil = ?, bukti_ai_alasan = ?,
            bukti_ai_model = ?, bukti_ai_ms = ?,
            selesai_at = CASE WHEN ? = 'selesai' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(
      status,
      petugas,
      bukti?.key ?? null,
      bukti?.verifikasi.hasil ?? null,
      bukti?.verifikasi.alasan ?? null,
      bukti?.verifikasi.model ?? null,
      bukti?.verifikasi.ms ?? null,
      status,
      id,
    )
    .run();
}

export async function tandaiMenungguAnalisis(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`UPDATE reports SET ai_status = 'pending', ai_error = NULL WHERE id = ?`)
    .bind(id)
    .run();
}

export async function simpanHasilAnalisis(
  env: Env,
  id: string,
  hasil: {
    kategori: string[];
    prioritas: string;
    ringkasan: string;
    rekomendasi: string;
    model: string;
    ms: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET ai_status = 'ok', kategori = ?, prioritas = ?, ringkasan = ?,
            rekomendasi = ?, ai_error = NULL, ai_model = ?, ai_ms = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(
      JSON.stringify(hasil.kategori),
      hasil.prioritas,
      hasil.ringkasan,
      hasil.rekomendasi,
      hasil.model,
      hasil.ms,
      id,
    )
    .run();
}

export async function simpanGagalAnalisis(
  env: Env,
  id: string,
  pesan: string,
  ms: number,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET ai_status = 'gagal', ai_error = ?, ai_ms = ?, updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(pesan.slice(0, 500), ms, id)
    .run();
}

export async function hapus(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM reports WHERE id = ?`).bind(id).run();
}

/** The bare text and location an analysis needs, without loading the whole row. */
export async function ambilUntukAnalisis(
  env: Env,
  id: string,
): Promise<{ teks: string; lokasi: string } | null> {
  return env.DB.prepare(
    `SELECT r.teks, t.nama AS lokasi ${DARI} WHERE r.id = ?`,
  )
    .bind(id)
    .first<{ teks: string; lokasi: string }>();
}

export async function laporanPadaTanggal(
  env: Env,
  tanggal: string,
): Promise<Array<{ lokasi: string; prioritas: string | null; ringkasan: string | null; teks: string }>> {
  const { mulai, selesai } = rentangHariWIB(tanggal);
  const rows = await env.DB.prepare(
    `SELECT t.nama AS lokasi, r.prioritas, r.ringkasan, r.teks
       ${DARI} WHERE r.created_at >= ? AND r.created_at < ? ORDER BY r.created_at`,
  )
    .bind(mulai, selesai)
    .all<{ lokasi: string; prioritas: string | null; ringkasan: string | null; teks: string }>();
  return rows.results;
}
