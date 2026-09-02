import { Hono } from 'hono';
import { tanggalWIB } from '../adapters/clock';
import { wajibPetugas } from '../adapters/session';
import type { AppEnv } from '../env';
import * as ringkasan from '../services/summary-service';

const app = new Hono<AppEnv>();

const POLA_TANGGAL = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves the requested date, defaulting to today in WIB. */
function tanggalDari(c: { req: { query: (k: string) => string | undefined } }): string | null {
  const tanggal = c.req.query('tanggal') ?? tanggalWIB();
  return POLA_TANGGAL.test(tanggal) ? tanggal : null;
}

/** The counters for the summary cards at the top of the dashboard. */
app.get('/stats', wajibPetugas, async (c) => {
  const tanggal = tanggalDari(c);
  if (!tanggal) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  return c.json(await ringkasan.statistikHarian(c.env, tanggal));
});

/** The numbers behind the dashboard charts. */
app.get('/grafik', wajibPetugas, async (c) => {
  const hari = Math.min(Number(c.req.query('hari') ?? 14) || 14, 90);
  return c.json(await ringkasan.dataGrafik(c.env, hari));
});

/** The stored summary for one date (default: today). */
app.get('/', wajibPetugas, async (c) => {
  const tanggal = tanggalDari(c);
  if (!tanggal) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  return c.json(await ringkasan.ringkasanTersimpan(c.env, tanggal));
});

/** Write the summary right now, without waiting for the afternoon cron. */
app.post('/generate', wajibPetugas, async (c) => {
  const tanggal = tanggalDari(c);
  if (!tanggal) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  try {
    return c.json({ ...(await ringkasan.buatRingkasanHarian(c.env, tanggal)), ada: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Gagal membuat ringkasan' }, 502);
  }
});

export default app;
