import { Hono } from 'hono';
import { HTTP_CACHE } from '../adapters/memo';
import { daysInRange, isValidDate, wibDate } from '../adapters/clock';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import * as cleaning from '../services/cleaning-service';
import * as summaries from '../services/summary-service';

const app = new Hono<AppEnv>();

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Resolves the requested date, defaulting to today in WIB. */
function dateFrom(c: { req: { query: (k: string) => string | undefined } }): string | null {
  const date = c.req.query('date') ?? wibDate();
  return DATE_PATTERN.test(date) ? date : null;
}

const MAX_RANGE_DAYS = 366;
const BAD_RANGE = 'Rentang tanggal harus YYYY-MM-DD, urut, dan paling panjang 366 hari';

/** The `from`–`to` of a dashboard request (WIB, both ends inclusive), or null when unusable. */
function rangeFrom(c: { req: { query: (k: string) => string | undefined } }): { from: string; to: string } | null {
  const from = c.req.query('from');
  const to = c.req.query('to');
  if (!isValidDate(from) || !isValidDate(to)) return null;
  const days = daysInRange(from, to);
  return days >= 1 && days <= MAX_RANGE_DAYS ? { from, to } : null;
}

/** The counters for the summary cards at the top of the dashboard. */
app.get('/stats', requireSupervisor, async (c) => {
  const date = dateFrom(c);
  if (!date) return c.json({ error: 'Format tanggal harus YYYY-MM-DD' }, 400);
  return c.json(await summaries.dailyStats(c.env, date));
});

/** The numbers behind the dashboard charts. */
app.get('/charts', requireSupervisor, async (c) => {
  const range = rangeFrom(c);
  if (!range) return c.json({ error: BAD_RANGE }, 400);
  c.header('Cache-Control', HTTP_CACHE.charts);
  return c.json(await summaries.chartData(c.env, range.from, range.to));
});

/** The numbers behind the overview's cleaning view, for the same dates as the complaint charts. */
app.get('/cleaning-charts', requireSupervisor, async (c) => {
  const range = rangeFrom(c);
  if (!range) return c.json({ error: BAD_RANGE }, 400);
  c.header('Cache-Control', HTTP_CACHE.charts);
  return c.json(await cleaning.chartData(c.env, range.from, range.to));
});

/** Every report of a range, one row each, for the dashboard's Excel export. */
app.get('/export', requireSupervisor, async (c) => {
  const range = rangeFrom(c);
  if (!range) return c.json({ error: BAD_RANGE }, 400);
  c.header('Cache-Control', 'no-store');
  return c.json({ data: await summaries.exportRows(c.env, range.from, range.to) });
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
