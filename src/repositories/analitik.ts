import { rentangHariWIB } from '../adapters/clock';
import type { Env } from '../env';
import { KATEGORI, PRIORITAS, STATUS } from '../domain/types';

/**
 * The aggregate queries behind the admin question-answering feature.
 *
 * Every value the model supplies goes through a bind parameter, and every
 * column or grouping it names is looked up in a fixed table below. The model
 * therefore chooses *which* of these queries runs and with which filter, but it
 * never writes SQL.
 */

export interface FilterAnalitik {
  sejak?: string;
  sampai?: string;
  gedung?: string;
  kategori?: string;
  prioritas?: string;
  status?: string;
  jenis?: string;
}

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;
const JENIS = ['pria', 'wanita', 'disabilitas'] as const;

/** Shared WHERE clause; `r` is reports, `t` is toilet_info. */
function susunFilter(f: FilterAnalitik): { klausa: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.sejak && POLA_TANGGAL.test(f.sejak)) {
    where.push('r.created_at >= ?');
    params.push(rentangHariWIB(f.sejak).mulai);
  }
  if (f.sampai && POLA_TANGGAL.test(f.sampai)) {
    where.push('r.created_at < ?');
    params.push(rentangHariWIB(f.sampai).selesai);
  }
  if (f.gedung && /^[A-Za-z]$/.test(f.gedung)) {
    where.push('t.gedung_kode = ?');
    params.push(f.gedung.toUpperCase());
  }
  if (f.kategori && (KATEGORI as readonly string[]).includes(f.kategori)) {
    where.push(`EXISTS (SELECT 1 FROM json_each(r.kategori) WHERE value = ?)`);
    params.push(f.kategori);
  }
  if (f.prioritas && (PRIORITAS as readonly string[]).includes(f.prioritas)) {
    where.push('r.prioritas = ?');
    params.push(f.prioritas);
  }
  if (f.status && (STATUS as readonly string[]).includes(f.status)) {
    where.push('r.status = ?');
    params.push(f.status);
  }
  if (f.jenis && (JENIS as readonly string[]).includes(f.jenis)) {
    where.push('t.jenis = ?');
    params.push(f.jenis);
  }

  return { klausa: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** Groupings the model may ask for, mapped to the SQL expression behind each. */
export const KELOMPOK = {
  gedung: `t.gedung_kode || ' - ' || t.gedung_nama`,
  toilet: `t.nama`,
  lantai: `t.gedung_kode || ' lantai ' || t.lantai`,
  jenis: `t.jenis`,
  kategori: `je.value`,
  prioritas: `COALESCE(r.prioritas, 'belum dianalisis')`,
  status: `r.status`,
  petugas: `COALESCE(r.petugas, 'belum ada')`,
  tanggal: `date(r.created_at, '+7 hours')`,
  minggu: `strftime('%Y-W%W', r.created_at, '+7 hours')`,
  bulan: `strftime('%Y-%m', r.created_at, '+7 hours')`,
  jam: `strftime('%H', r.created_at, '+7 hours') || ':00'`,
  hari_minggu: `CASE strftime('%w', r.created_at, '+7 hours')
    WHEN '0' THEN 'Minggu' WHEN '1' THEN 'Senin' WHEN '2' THEN 'Selasa' WHEN '3' THEN 'Rabu'
    WHEN '4' THEN 'Kamis' WHEN '5' THEN 'Jumat' ELSE 'Sabtu' END`,
} as const;
export type Kelompok = keyof typeof KELOMPOK;

const DARI = `FROM reports r JOIN toilet_info t ON t.id = r.toilet_id`;

/** Grouping by category needs the JSON array unrolled; every other grouping does not. */
function sumber(kelompok: Kelompok | undefined): string {
  return kelompok === 'kategori' ? `${DARI}, json_each(r.kategori) je` : DARI;
}

export async function hitungLaporan(env: Env, kelompok: Kelompok | undefined, f: FilterAnalitik) {
  const { klausa, params } = susunFilter(f);

  const total = await env.DB.prepare(`SELECT COUNT(*) AS n ${DARI} ${klausa}`)
    .bind(...params)
    .first<{ n: number }>();

  if (!kelompok) return { total: total?.n ?? 0 };

  const ekspresi = KELOMPOK[kelompok];
  const urut = ['tanggal', 'minggu', 'bulan', 'jam'].includes(kelompok) ? 'kelompok' : 'jumlah DESC';
  const baris = await env.DB.prepare(
    `SELECT ${ekspresi} AS kelompok,
            COUNT(*) AS jumlah,
            SUM(r.status = 'selesai') AS selesai,
            SUM(r.prioritas = 'tinggi') AS tinggi
       ${sumber(kelompok)} ${klausa}
      GROUP BY kelompok ORDER BY ${urut} LIMIT 20`,
  )
    .bind(...params)
    .all<{ kelompok: string; jumlah: number; selesai: number; tinggi: number }>();

  return { total: total?.n ?? 0, kelompok, baris: baris.results };
}

export async function waktuPenyelesaian(
  env: Env,
  kelompok: Kelompok | undefined,
  f: FilterAnalitik,
) {
  const { klausa, params } = susunFilter(f);
  const selesai = `${klausa ? `${klausa} AND` : 'WHERE'} r.selesai_at IS NOT NULL`;
  const menit = `(julianday(r.selesai_at) - julianday(r.created_at)) * 1440`;
  const pilih = `COUNT(*) AS jumlah_selesai,
                 ROUND(AVG(${menit})) AS rata_menit,
                 ROUND(MIN(${menit})) AS tercepat_menit,
                 ROUND(MAX(${menit})) AS terlama_menit`;

  if (!kelompok) {
    const baris = await env.DB.prepare(`SELECT ${pilih} ${DARI} ${selesai}`)
      .bind(...params)
      .first();
    return baris ?? { jumlah_selesai: 0 };
  }

  const baris = await env.DB.prepare(
    `SELECT ${KELOMPOK[kelompok]} AS kelompok, ${pilih}
       ${sumber(kelompok)} ${selesai}
      GROUP BY kelompok ORDER BY jumlah_selesai DESC LIMIT 20`,
  )
    .bind(...params)
    .all();
  return { kelompok, baris: baris.results };
}

/**
 * Individual reports, at most 15. The raw complaint text is deliberately left
 * out: the model reads only its own neutral summary, so a reporter cannot
 * smuggle instructions into the asker's question through a complaint. Staff
 * names travel only when the asker is staff.
 */
export async function daftarLaporan(
  env: Env,
  f: FilterAnalitik,
  urut: 'terbaru' | 'terlama',
  limit: number,
  denganPetugas: boolean,
) {
  const { klausa, params } = susunFilter(f);
  const baris = await env.DB.prepare(
    `SELECT r.id, t.nama AS lokasi, r.status, r.prioritas, r.kategori, r.ringkasan,
            ${denganPetugas ? 'r.petugas,' : ''}
            datetime(r.created_at, '+7 hours') AS dibuat_wib,
            datetime(r.selesai_at, '+7 hours') AS selesai_wib
       ${DARI} ${klausa}
      ORDER BY r.created_at ${urut === 'terlama' ? 'ASC' : 'DESC'} LIMIT ?`,
  )
    .bind(...params, Math.min(Math.max(limit, 1), 15))
    .all<{ kategori: string | null; ringkasan: string | null }>();

  return baris.results.map((b) => ({
    ...b,
    kategori: b.kategori ? (JSON.parse(b.kategori) as string[]) : [],
    ringkasan: b.ringkasan ?? '(belum dianalisis)',
  }));
}

/**
 * How many questions were asked today — overall, or from one (hashed) address
 * — for the daily budget guards.
 */
export async function jumlahTanyaHariIni(env: Env, tanggal: string, ip?: string): Promise<number> {
  const { mulai } = rentangHariWIB(tanggal);
  const baris = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM aktivitas
      WHERE aksi = 'tanya' AND waktu >= ?
        ${ip ? `AND json_extract(rincian, '$.ip') = ?` : ''}`,
  )
    .bind(...(ip ? [mulai, ip] : [mulai]))
    .first<{ n: number }>();
  return baris?.n ?? 0;
}
