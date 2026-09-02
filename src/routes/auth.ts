import { Hono } from 'hono';
import { z } from 'zod';
import { catat } from '../lib/aktivitas';
import { buatSesi, hapusSesi, samaAman, sesiSaatIni } from '../lib/auth';
import type { AppEnv } from '../types';

const LoginSchema = z.object({
  nama: z.string().trim().min(2).max(50),
  password: z.string().min(1),
});

const app = new Hono<AppEnv>();

/**
 * Login petugas memakai satu password bersama, bukan akun per orang.
 * Kolom `nama` tetap diminta supaya jejak "siapa mengerjakan apa" tercatat
 * pada tiap laporan — memadai untuk lingkup OB kampus, tanpa manajemen user.
 */
app.post('/login', async (c) => {
  const parsed = LoginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Nama dan password wajib diisi' }, 400);

  if (!samaAman(parsed.data.password, c.env.PETUGAS_PASSWORD)) {
    return c.json({ error: 'Password salah' }, 401);
  }

  await buatSesi(c, parsed.data.nama);
  await catat(c.env, {
    aksi: 'masuk',
    pelaku: parsed.data.nama,
    ringkas: `${parsed.data.nama} masuk ke dashboard petugas`,
  });
  return c.json({ ok: true, nama: parsed.data.nama });
});

app.post('/logout', (c) => {
  hapusSesi(c);
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const nama = await sesiSaatIni(c);
  return nama ? c.json({ nama }) : c.json({ nama: null }, 401);
});

export default app;
