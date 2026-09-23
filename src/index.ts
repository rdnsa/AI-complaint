import { Hono } from 'hono';
import { logger } from 'hono/logger';
import { tanggalWIB } from './adapters/clock';
import type { AppEnv, Env } from './env';
import activityRoutes from './routes/activity';
import authRoutes from './routes/auth';
import leaderboardRoutes from './routes/leaderboard';
import locationRoutes from './routes/locations';
import pekerjaanRoutes from './routes/pekerjaan';
import petugasRoutes from './routes/petugas';
import reportRoutes from './routes/reports';
import summaryRoutes from './routes/summary';
import tanyaRoutes from './routes/tanya';
import uploadRoutes from './routes/uploads';
import userRoutes from './routes/users';
import { buatRingkasanHarian } from './services/summary-service';

/**
 * Composition root.
 *
 * The only file that knows about every layer at once: it mounts the HTTP
 * routes, serves the built frontend, and wires the cron trigger to the summary
 * service. Everything below it depends inward only.
 */
const app = new Hono<AppEnv>();

app.use('*', logger());

app.get('/api/health', (c) => c.json({ ok: true, waktu: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/lokasi', locationRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/pekerjaan', pekerjaanRoutes);
app.route('/api/petugas', petugasRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/summary', summaryRoutes);
app.route('/api/aktivitas', activityRoutes);
app.route('/api/pengguna', userRoutes);
app.route('/api/peringkat', leaderboardRoutes);
app.route('/api/tanya', tanyaRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Endpoint tidak ditemukan' }, 404);
  // Deep links such as /lapor/A-1 are served index.html; the React router takes it from there.
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
    const tanggal = tanggalWIB();
    ctx.waitUntil(
      buatRingkasanHarian(env, tanggal)
        .then((r) => console.log(`Ringkasan ${tanggal} tersimpan (${r.total_laporan} laporan)`))
        .catch((e) => console.error(`Ringkasan ${tanggal} gagal:`, e)),
    );
  },
} satisfies ExportedHandler<Env>;
