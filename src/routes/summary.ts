import { Hono } from 'hono';
import { wajibPetugas } from '../lib/auth';
import { buatRingkasanHarian } from '../lib/ringkasan';
import { rentangHariWIB, tanggalWIB } from '../lib/waktu';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Angka-angka untuk kartu ringkas di atas dashboard. */
app.get('/stats', wajibPetugas, async (c) => {
  const tanggal = c.req.query('tanggal') ?? tanggalWIB();
  if (!POLA_TANGGAL.test(tanggal)) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  const { mulai, selesai } = rentangHariWIB(tanggal);

  const [hariIni, belumSelesai, perLokasi] = await c.env.DB.batch<Record<string, unknown>>([
    c.env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(prioritas = 'tinggi') AS tinggi,
              SUM(prioritas = 'sedang') AS sedang,
              SUM(prioritas = 'rendah') AS rendah,
              SUM(ai_status = 'gagal')  AS ai_gagal
         FROM reports WHERE created_at >= ? AND created_at < ?`,
    ).bind(mulai, selesai),
    c.env.DB.prepare(`SELECT COUNT(*) AS n FROM reports WHERE status <> 'selesai'`),
    c.env.DB.prepare(
      `SELECT t.nama AS lokasi, COUNT(*) AS jumlah
         FROM reports r JOIN toilets t ON t.id = r.toilet_id
        WHERE r.created_at >= ? AND r.created_at < ?
        GROUP BY r.toilet_id ORDER BY jumlah DESC LIMIT 5`,
    ).bind(mulai, selesai),
  ]);

  return c.json({
    tanggal,
    hari_ini: hariIni.results[0] ?? {},
    belum_selesai: (belumSelesai.results[0] as { n: number } | undefined)?.n ?? 0,
    lokasi_teratas: perLokasi.results,
  });
});

/** Ringkasan tersimpan untuk satu tanggal (default: hari ini). */
app.get('/', wajibPetugas, async (c) => {
  const tanggal = c.req.query('tanggal') ?? tanggalWIB();
  if (!POLA_TANGGAL.test(tanggal)) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);

  const row = await c.env.DB.prepare(`SELECT * FROM daily_summaries WHERE tanggal = ?`)
    .bind(tanggal)
    .first<{ tanggal: string; total_laporan: number; ringkasan: string; sorotan: string | null }>();

  if (!row) return c.json({ tanggal, ada: false });
  return c.json({ ...row, sorotan: row.sorotan ? JSON.parse(row.sorotan) : [], ada: true });
});

/** Membuat ringkasan sekarang juga, tanpa menunggu cron sore. */
app.post('/generate', wajibPetugas, async (c) => {
  const tanggal = c.req.query('tanggal') ?? tanggalWIB();
  if (!POLA_TANGGAL.test(tanggal)) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  try {
    return c.json({ ...(await buatRingkasanHarian(c.env, tanggal)), ada: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Gagal membuat ringkasan' }, 502);
  }
});

export default app;
