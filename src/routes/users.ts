import { Hono } from 'hono';
import { z } from 'zod';
import { wajibSpv } from '../adapters/session';
import type { AppEnv } from '../env';
import * as akun from '../services/user-service';

const app = new Hono<AppEnv>();

/** Everything in this file is for the supervisor only. */
app.use('*', wajibSpv);

app.get('/', async (c) => c.json({ data: await akun.daftarPengelola(c.env) }));

const Nama = z.string().trim().min(2, 'Nama minimal 2 karakter').max(60);

/** A staff member is just a name; a supervisor needs credentials to sign in with. */
const BuatSchema = z.discriminatedUnion('peran', [
  z.object({ peran: z.literal('petugas'), nama: Nama }),
  z.object({
    peran: z.literal('spv'),
    username: z
      .string()
      .trim()
      .min(3, 'Username minimal 3 karakter')
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
    nama: Nama,
    password: z.string().min(8, 'Password minimal 8 karakter').max(200),
  }),
]);

app.post('/', async (c) => {
  const parsed = BuatSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }
  const spv = c.get('sesi').nama;

  if (parsed.data.peran === 'petugas') {
    const baru = await akun.tambahPetugas(c.env, parsed.data.nama, spv);
    return c.json({ ...baru, username: null, aktif: 1 }, 201);
  }

  const hasil = await akun.tambahSpv(c.env, parsed.data, spv);
  if (hasil.jenis === 'username-dipakai') return c.json({ error: 'Username itu sudah dipakai' }, 409);
  return c.json({ ...hasil.identitas, username: parsed.data.username, aktif: 1 }, 201);
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
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const hasil = await akun.ubahAkun(c.env, c.req.param('id'), parsed.data, c.get('sesi'));
  if (hasil.jenis === 'tidak-ditemukan') return c.json({ error: 'Akun tidak ditemukan' }, 404);
  if (hasil.jenis === 'kunci-diri-sendiri') {
    return c.json({ error: 'Akun yang sedang dipakai tidak bisa dinonaktifkan.' }, 400);
  }
  if (hasil.jenis === 'petugas-tanpa-sandi') {
    return c.json({ error: 'Petugas tidak memakai password.' }, 400);
  }
  return c.json({ ok: true });
});

export default app;
