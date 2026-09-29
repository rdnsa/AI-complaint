import { Hono } from 'hono';
import { z } from 'zod';
import { catat } from '../lib/aktivitas';
import { wajibAdmin } from '../lib/auth';
import { buatSalt, hitungHash } from '../lib/sandi';
import type { AppEnv } from '../types';

const app = new Hono<AppEnv>();

/** Seluruh berkas ini hanya untuk admin. */
app.use('*', wajibAdmin);

/** Daftar akun pengelola. Akun pelapor tidak ikut: jumlahnya bisa ribuan. */
app.get('/', async (c) => {
  const rows = await c.env.DB.prepare(
    `SELECT id, username, nama, peran, aktif, created_at
       FROM pengguna WHERE peran IN ('admin', 'petugas')
      ORDER BY peran, nama`,
  ).all();
  return c.json({ data: rows.results });
});

const BuatSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
  nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60),
  password: z.string().min(8, 'Password minimal 8 karakter').max(200),
});

app.post('/', async (c) => {
  const parsed = BuatSchema.safeParse(await c.req.json().catch(() => ({})));
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
     VALUES (?, ?, ?, 'petugas', ?, ?)`,
  )
    .bind(id, username, nama, await hitungHash(password, salt), salt)
    .run();

  await catat(c.env, {
    aksi: 'pengguna',
    pelaku: c.get('sesi').nama,
    ringkas: `Menambah akun petugas ${nama} (${username})`,
  });

  return c.json({ id, username, nama, peran: 'petugas', aktif: 1 }, 201);
});

const UbahSchema = z
  .object({
    nama: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60).optional(),
    password: z.string().min(8, 'Password minimal 8 karakter').max(200).optional(),
    aktif: z.boolean().optional(),
  })
  .refine((v) => v.nama !== undefined || v.password !== undefined || v.aktif !== undefined, {
    message: 'Tidak ada yang diubah',
  });

app.patch('/:id', async (c) => {
  const parsed = UbahSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);

  const id = c.req.param('id');
  const target = await c.env.DB.prepare(`SELECT id, nama, username FROM pengguna WHERE id = ?`)
    .bind(id)
    .first<{ id: string; nama: string; username: string }>();
  if (!target) return c.json({ error: 'Akun tidak ditemukan' }, 404);

  // Menonaktifkan akun sendiri akan mengunci admin di luar sistemnya sendiri.
  if (parsed.data.aktif === false && id === c.get('sesi').id) {
    return c.json({ error: 'Akun yang sedang dipakai tidak bisa dinonaktifkan.' }, 400);
  }

  const set: string[] = [];
  const params: unknown[] = [];
  const diubah: string[] = [];

  if (parsed.data.nama !== undefined) {
    set.push('nama = ?');
    params.push(parsed.data.nama);
    diubah.push('nama');
  }
  if (parsed.data.password !== undefined) {
    // Salt ikut diganti agar sandi lama dan baru tidak berbagi turunan yang sama.
    const salt = buatSalt();
    set.push('sandi_hash = ?', 'sandi_salt = ?');
    params.push(await hitungHash(parsed.data.password, salt), salt);
    diubah.push('password');
  }
  if (parsed.data.aktif !== undefined) {
    set.push('aktif = ?');
    params.push(parsed.data.aktif ? 1 : 0);
    diubah.push(parsed.data.aktif ? 'diaktifkan' : 'dinonaktifkan');
  }

  await c.env.DB.prepare(`UPDATE pengguna SET ${set.join(', ')} WHERE id = ?`)
    .bind(...params, id)
    .run();

  await catat(c.env, {
    aksi: 'pengguna',
    pelaku: c.get('sesi').nama,
    ringkas: `Mengubah akun ${target.username}: ${diubah.join(', ')}`,
  });

  return c.json({ ok: true });
});

export default app;
