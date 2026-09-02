import { Hono } from 'hono';
import type { AppEnv } from '../types';

const MAKS_BYTE = 5 * 1024 * 1024; // 5 MB, cukup untuk foto kamera HP setelah kompresi browser
const TIPE_DIIZINKAN = new Set(['image/jpeg', 'image/png', 'image/webp']);

const app = new Hono<AppEnv>();

/**
 * Publik: menerima foto lampiran dan menyimpannya ke R2.
 *
 * Upload memakai binding R2 langsung (bukan presigned URL) supaya kredensial
 * S3 tidak perlu ada di mana pun; Worker meneruskan body ke bucket.
 * Foto diunggah lebih dulu, lalu `foto_key` dikirim bersama laporan.
 */
app.post('/', async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) return c.json({ error: 'File tidak ditemukan' }, 400);
  if (!TIPE_DIIZINKAN.has(file.type)) {
    return c.json({ error: 'Format harus JPG, PNG, atau WebP' }, 415);
  }
  if (file.size > MAKS_BYTE) {
    return c.json({ error: 'Ukuran foto maksimal 5 MB' }, 413);
  }

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  // Prefix tanggal membuat isi bucket mudah ditelusuri dan dihapus per periode.
  const key = `laporan/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });

  return c.json({ key, url: `${c.env.R2_PUBLIC_URL.replace(/\/$/, '')}/${key}` }, 201);
});

export default app;
