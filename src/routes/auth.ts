import { Hono } from 'hono';
import { z } from 'zod';
import { catat } from '../lib/aktivitas';
import { buatSesi, hapusSesi, sesiSaatIni } from '../lib/auth';
import { buatSalt, cocok, hitungHash } from '../lib/sandi';
import type { AppEnv, Peran } from '../types';

const app = new Hono<AppEnv>();

interface BarisPengguna {
  id: string;
  username: string;
  nama: string;
  peran: Peran;
  sandi_hash: string;
  sandi_salt: string;
  aktif: number;
}

const MasukSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

app.post('/masuk', async (c) => {
  const parsed = MasukSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Username dan password wajib diisi' }, 400);

  const pengguna = await c.env.DB.prepare(`SELECT * FROM pengguna WHERE username = ?`)
    .bind(parsed.data.username)
    .first<BarisPengguna>();

  // The error message is identical for an unknown account and a wrong password,
  // so the sign-in page cannot be used to discover which usernames exist.
  const salah = () => c.json({ error: 'Username atau password salah' }, 401);
  if (!pengguna || !pengguna.aktif) return salah();
  if (!(await cocok(parsed.data.password, pengguna.sandi_salt, pengguna.sandi_hash))) return salah();

  const sesi = { id: pengguna.id, nama: pengguna.nama, peran: pengguna.peran };
  await buatSesi(c, sesi);

  if (pengguna.peran !== 'pelapor') {
    await catat(c.env, {
      aksi: 'masuk',
      pelaku: pengguna.nama,
      ringkas: `${pengguna.nama} (${pengguna.peran}) masuk ke dashboard`,
    });
  }

  return c.json(sesi);
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
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);

  const { username, nama, password } = parsed.data;
  const ada = await c.env.DB.prepare(`SELECT id FROM pengguna WHERE username = ?`)
    .bind(username)
    .first();
  if (ada) return c.json({ error: 'Username itu sudah dipakai' }, 409);

  const salt = buatSalt();
  const id = crypto.randomUUID();
  await c.env.DB.prepare(
    `INSERT INTO pengguna (id, username, nama, peran, sandi_hash, sandi_salt)
     VALUES (?, ?, ?, 'pelapor', ?, ?)`,
  )
    .bind(id, username, nama, await hitungHash(password, salt), salt)
    .run();

  const sesi = { id, nama, peran: 'pelapor' as const };
  await buatSesi(c, sesi);
  return c.json(sesi, 201);
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
