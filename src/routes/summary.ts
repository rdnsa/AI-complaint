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
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
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

/**
 * Angka-angka untuk grafik di dashboard.
 *
 * Semuanya dihitung di database dalam satu batch; frontend hanya menggambar.
 */
app.get('/grafik', wajibPetugas, async (c) => {
  const hari = Math.min(Number(c.req.query('hari') ?? 14) || 14, 90);

  const [harian, kategori, prioritas, gedung, penyelesaian] = await c.env.DB.batch<
    Record<string, unknown>
  >([
    c.env.DB.prepare(
      // '+7 hours' mengelompokkan menurut hari WIB, bukan UTC.
      `SELECT date(created_at, '+7 hours') AS tanggal,
              COUNT(*) AS total,
              SUM(status = 'selesai') AS selesai
         FROM reports
        WHERE created_at >= datetime('now', ?)
        GROUP BY tanggal ORDER BY tanggal`,
    ).bind(`-${hari} days`),
    c.env.DB.prepare(
      `SELECT je.value AS kategori, COUNT(*) AS jumlah
         FROM reports r, json_each(r.kategori) je
        WHERE r.kategori IS NOT NULL
        GROUP BY je.value ORDER BY jumlah DESC`,
    ),
    c.env.DB.prepare(
      `SELECT prioritas, COUNT(*) AS jumlah FROM reports
        WHERE prioritas IS NOT NULL GROUP BY prioritas`,
    ),
    c.env.DB.prepare(
      `SELECT t.gedung_kode, t.gedung_nama, COUNT(*) AS jumlah
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
        GROUP BY t.gedung_kode ORDER BY jumlah DESC LIMIT 10`,
    ),
    c.env.DB.prepare(
      `SELECT COUNT(*) AS jumlah,
              AVG((julianday(selesai_at) - julianday(created_at)) * 1440) AS menit
         FROM reports WHERE selesai_at IS NOT NULL`,
    ),
  ]);

  // Hari tanpa laporan tetap dikirim sebagai nol supaya garis grafiknya utuh.
  const peta = new Map(harian.results.map((r) => [r.tanggal as string, r]));
  const deret: Array<{ tanggal: string; total: number; selesai: number }> = [];
  for (let i = hari - 1; i >= 0; i--) {
    const t = new Date(Date.now() + 7 * 3600_000 - i * 86_400_000).toISOString().slice(0, 10);
    const ada = peta.get(t);
    deret.push({
      tanggal: t,
      total: Number(ada?.total ?? 0),
      selesai: Number(ada?.selesai ?? 0),
    });
  }

  return c.json({
    harian: deret,
    kategori: kategori.results,
    prioritas: prioritas.results,
    gedung: gedung.results,
    penyelesaian: penyelesaian.results[0] ?? { jumlah: 0, menit: null },
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
