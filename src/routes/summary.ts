import { Hono } from 'hono';
import { wibDate } from '../adapters/clock';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import * as summaries from '../services/summary-service';

const app = new Hono<AppEnv>();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves the requested date, defaulting to today in WIB. */
function dateFrom(c: { req: { query: (k: string) => string | undefined } }): string | null {
  const date = c.req.query('date') ?? wibDate();
  return DATE_PATTERN.test(date) ? date : null;
}

/** The counters for the summary cards at the top of the dashboard. */
app.get('/stats', requireSupervisor, async (c) => {
  const date = dateFrom(c);
  if (!date) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  return c.json(await summaries.dailyStats(c.env, date));
});

/** The numbers behind the dashboard charts. */
app.get('/charts', requireSupervisor, async (c) => {
  const days = Math.min(Number(c.req.query('days') ?? 14) || 14, 90);
  return c.json(await summaries.chartData(c.env, days));
});

/** The stored summary for one date (default: today). */
app.get('/', requireSupervisor, async (c) => {
  const date = dateFrom(c);
  if (!date) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  return c.json(await summaries.storedSummary(c.env, date));
});

/** Write the summary right now, without waiting for the afternoon cron. */
app.post('/generate', requireSupervisor, async (c) => {
  const date = dateFrom(c);
  if (!date) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  try {
    return c.json({ ...(await summaries.generateDailySummary(c.env, date)), exists: true });
  } catch (err) {
    return c.json({ error: err instanceof Error ? err.message : 'Gagal membuat ringkasan' }, 502);
  }
});

export default app;
