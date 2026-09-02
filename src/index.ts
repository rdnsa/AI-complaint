import { Hono } from 'hono';
import { logger } from 'hono/logger';
import aktivitasRoutes from './routes/aktivitas';
import authRoutes from './routes/auth';
import reportRoutes from './routes/reports';
import summaryRoutes from './routes/summary';
import lokasiRoutes from './routes/lokasi';
import uploadRoutes from './routes/uploads';
import { buatRingkasanHarian } from './lib/ringkasan';
import { tanggalWIB } from './lib/waktu';
import type { AppEnv, Env } from './types';

const app = new Hono<AppEnv>();

app.use('*', logger());

app.get('/api/health', (c) => c.json({ ok: true, waktu: new Date().toISOString() }));

app.route('/api/auth', authRoutes);
app.route('/api/lokasi', lokasiRoutes);
app.route('/api/reports', reportRoutes);
app.route('/api/uploads', uploadRoutes);
app.route('/api/summary', summaryRoutes);
app.route('/api/aktivitas', aktivitasRoutes);

app.notFound(async (c) => {
  if (c.req.path.startsWith('/api/')) return c.json({ error: 'Endpoint tidak ditemukan' }, 404);
  // Deep link seperti /lapor/A-2-PRIA dilayani oleh index.html; router React yang menanganinya.
  return c.env.ASSETS.fetch(new Request(new URL('/index.html', c.req.url), c.req.raw));
});

app.onError((err, c) => {
  console.error('Unhandled error:', err);
  return c.json({ error: 'Terjadi kesalahan pada server' }, 500);
});

export default {
  fetch: app.fetch,

  /** Cron 10:00 UTC = 17:00 WIB: merangkum seluruh laporan hari itu (fitur #3). */
  async scheduled(_event: ScheduledController, env: Env, ctx: ExecutionContext) {
    const tanggal = tanggalWIB();
    ctx.waitUntil(
      buatRingkasanHarian(env, tanggal)
        .then((r) => console.log(`Ringkasan ${tanggal} tersimpan (${r.total_laporan} laporan)`))
        .catch((e) => console.error(`Ringkasan ${tanggal} gagal:`, e)),
    );
  },
} satisfies ExportedHandler<Env>;
