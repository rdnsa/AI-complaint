import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { wibDate } from './adapters/clock';
import type { AppEnv, Env } from './env';
import activityRoutes from './routes/activity';
import askRoutes from './routes/ask';
import authRoutes from './routes/auth';
import leaderboardRoutes from './routes/leaderboard';
import locationRoutes from './routes/locations';
import reportRoutes from './routes/reports';
import staffRoutes from './routes/staff';
import summaryRoutes from './routes/summary';
import uploadRoutes from './routes/uploads';
import userRoutes from './routes/users';
import workLogRoutes from './routes/work-logs';
import { generateDailySummary } from './services/summary-service';

/**
 * Composition root.
 *
 * The only file that knows about every layer at once: it mounts the HTTP
 * routes, serves the built frontend, and wires the cron trigger to the summary
 * service. Everything below it depends inward only.
 */
const app = new Hono<AppEnv>();

app.use('*', logger());

app.get('/api/health', (c) => c.json({ ok: true, time: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/locations', locationRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/work-logs', workLogRoutes);
app.route('/api/staff', staffRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/summary', summaryRoutes);
app.route('/api/activity', activityRoutes);
app.route('/api/users', userRoutes);
app.route('/api/leaderboard', leaderboardRoutes);
app.route('/api/ask', askRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Endpoint tidak ditemukan' }, 404);
  // Deep links such as /report/A-1 (and the old /lapor/A-1 printed on stickers)
  // are served index.html; the React router takes it from there.
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw));
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Terjadi kesalahan pada server' }, 500);
});

export default {
  fetch: app.fetch,

  /** Cron 10:00 UTC = 17:00 WIB: summarise the day's reports (feature #3). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const date = wibDate();
    ctx.waitUntil(
      generateDailySummary(env, date)
        .then((r) => console.log(`Summary for ${date} saved (${r.report_count} reports)`))
        .catch((e) => console.error(`Summary for ${date} failed:`, e)),
    );
  },
} satisfies ExportedHandler<Env>;
