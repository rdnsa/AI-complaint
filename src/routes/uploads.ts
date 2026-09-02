import { Hono } from 'hono';
import type { AppEnv } from '../types';

const FOLDER = 'laporan';
/** Foto disajikan kembali oleh Worker ini; lihat handler GET di bawah. */
const PREFIX_URL = '/api/uploads';

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
  const key = `${FOLDER}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });

  return c.json({ key, url: `${PREFIX_URL}/${key}` }, 201);
});

/**
 * Publik: menyajikan foto dari R2 lewat Worker, bukan lewat domain publik r2.dev.
 *
 * Domain `r2.dev` dibajak DNS oleh sebagian ISP di Indonesia sehingga fotonya
 * gagal dimuat di jaringan kampus. Menyajikannya dari domain aplikasi sendiri
 * menghilangkan ketergantungan itu, sekaligus membuat bucket tidak perlu
 * dibuka untuk akses publik.
 */
app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  // Hanya berkas lampiran laporan yang boleh dibaca, bukan sembarang objek di bucket.
  if (!key.startsWith(`${FOLDER}/`)) return c.json({ error: 'Berkas tidak ditemukan' }, 404);

  const obj = await c.env.BUCKET.get(key, { onlyIf: c.req.raw.headers });
  if (!obj) return c.json({ error: 'Berkas tidak ditemukan' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  // Nama berkas memakai UUID dan tidak pernah ditimpa, jadi aman di-cache selamanya.
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  // Tanpa `body` berarti syarat If-None-Match terpenuhi: browser sudah punya salinannya.
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
});

export default app;
