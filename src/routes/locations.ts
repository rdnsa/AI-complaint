import { Hono } from 'hono';
import type { AppEnv } from '../env';
import * as lokasi from '../repositories/locations';

const app = new Hono<AppEnv>();

/** Public: the buildings, and which of their floors have a registered toilet. */
app.get('/', async (c) => {
  const baris = await lokasi.semuaLokasi(c.env);

  // Grouped per building so the frontend does not have to assemble it itself.
  const gedung = new Map<string, { kode: string; nama: string; lantai: number[] }>();
  for (const r of baris) {
    const g = gedung.get(r.gedung_kode) ?? { kode: r.gedung_kode, nama: r.gedung_nama, lantai: [] };
    g.lantai.push(r.lantai);
    gedung.set(r.gedung_kode, g);
  }

  return c.json({ data: [...gedung.values()] });
});

/**
 * Public: one floor of one building — this is what a QR code points at.
 *
 * `id` is formatted '<building>-<floor>', for example 'A-1'. The toilet type is
 * not part of the QR code because the reporter picks it on the form.
 */
app.get('/:id', async (c) => {
  const cocok = /^([A-Za-z])-(\d{1,2})$/.exec(c.req.param('id'));
  if (!cocok) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  const daftar = await lokasi.toiletPadaLantai(c.env, cocok[1].toUpperCase(), Number(cocok[2]));
  if (!daftar.length) return c.json({ error: 'Kode lokasi tidak dikenal' }, 404);

  return c.json({
    gedung_kode: daftar[0].gedung_kode,
    gedung_nama: daftar[0].gedung_nama,
    lantai: daftar[0].lantai,
    toilets: daftar.map(({ id, jenis }) => ({ id, jenis })),
  });
});

export default app;
