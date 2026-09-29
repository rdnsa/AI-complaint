import { Hono } from 'hono';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/** Publik: daftar gedung beserta lantai yang memiliki WC terdaftar. */
app.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT DISTINCT gedung_kode, gedung_nama, gedung_urutan, lantai
       FROM toilet_info WHERE aktif = 1
      ORDER BY gedung_urutan, lantai`,
  ).all<{ gedung_kode: string; gedung_nama: string; lantai: number }>();

  // Dikelompokkan per gedung supaya frontend tidak perlu merangkainya sendiri.
  const gedung = new Map<string, { kode: string; nama: string; lantai: number[] }>();
  for (const r of rows.results) {
    const g = gedung.get(r.gedung_kode) ?? { kode: r.gedung_kode, nama: r.gedung_nama, lantai: [] };
    g.lantai.push(r.lantai);
    gedung.set(r.gedung_kode, g);
  }

  return c.json({ data: [...gedung.values()] });
});

/**
 * Publik: satu lantai pada satu gedung — inilah tujuan QR.
 *
 * `id` berformat '<kode gedung>-<lantai>', misalnya 'A-1'. Jenis WC tidak ikut
 * dalam QR karena pelapor memilihnya sendiri di formulir.
 */
app.get('/:id', async (c) => {
  const cocok = /^([A-Za-z])-(\d{1,2})$/.exec(c.req.param('id'));
  if (!cocok) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  const [, kode, lantai] = cocok;
  const rows = await c.env.DB.prepare(
    `SELECT id, jenis, gedung_kode, gedung_nama, lantai
       FROM toilet_info
      WHERE gedung_kode = ? AND lantai = ? AND aktif = 1
      ORDER BY CASE jenis WHEN 'pria' THEN 0 WHEN 'wanita' THEN 1 ELSE 2 END`,
  )
    .bind(kode.toUpperCase(), Number(lantai))
    .all<{ id: string; jenis: string; gedung_kode: string; gedung_nama: string; lantai: number }>();

  const daftar = rows.results;
  if (!daftar.length) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  return c.json({
    gedung_kode: daftar[0].gedung_kode,
    gedung_nama: daftar[0].gedung_nama,
    lantai: daftar[0].lantai,
    toilets: daftar.map(({ id, jenis }) => ({ id, jenis })),
  });
});

export default app;
