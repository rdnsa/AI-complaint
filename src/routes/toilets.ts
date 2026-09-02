import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/** Publik: dipakai halaman lapor untuk memvalidasi kode QR dan menampilkan nama lokasi. */
app.get('/:id', async (c) => {
  const row = await c.env.DB.prepare(
    `SELECT id, gedung, lantai, jenis, nama FROM toilets WHERE id = ? AND aktif = 1`,
  )
    .bind(c.req.param('id'))
    .first();
  if (!row) return c.json({ error: 'Kode WC tidak dikenal' }, 404);
  return c.json(row);
});

/** Publik: daftar seluruh WC, dipakai dropdown dan halaman cetak QR. */
app.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, gedung, lantai, jenis, nama FROM toilets WHERE aktif = 1
      ORDER BY gedung, lantai, jenis`,
  ).all();
  return c.json({ data: rows.results });
});

export default app;
