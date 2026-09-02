import { Hono } from 'hono';
import { z } from 'zod';
import { buatSesi, hapusSesi, sesiSaatIni } from '../adapters/session';
import type { AppEnv } from '../env';
import * as akun from '../services/user-service';

const app = new Hono<AppEnv>();

const MasukSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

app.post('/masuk', async (c) => {
  const parsed = MasukSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Username dan password wajib diisi' }, 400);

  const hasil = await akun.masuk(c.env, parsed.data.username, parsed.data.password);
  if (hasil.jenis === 'gagal') return c.json({ error: 'Username atau password salah' }, 401);

  await buatSesi(c, hasil.identitas);
  return c.json(hasil.identitas);
});

const DaftarSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60),
  password: z.string().min(8, 'Password minimal 8 karakter').max(200),
});

/** Self-registration only ever creates a reporter; staff accounts come from an admin. */
app.post('/daftar', async (c) => {
  const parsed = DaftarSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const hasil = await akun.daftarPelapor(c.env, parsed.data);
  if (hasil.jenis === 'username-dipakai') return c.json({ error: 'Username itu sudah dipakai' }, 409);

  await buatSesi(c, hasil.identitas);
  return c.json(hasil.identitas, 201);
});

app.post('/keluar', (c) => {
  hapusSesi(c);
  return c.json({ ok: true });
});

app.get('/saya', async (c) => {
  const sesi = await sesiSaatIni(c);
  return sesi ? c.json(sesi) : c.json({ error: 'Belum masuk' }, 401);
});

export default app;
