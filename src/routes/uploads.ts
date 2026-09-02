import { Hono } from 'hono';
import type { AppEnv } from '../types';

/**
 * Two kinds of photo share one bucket, separated by prefix: 'laporan' for the
 * condition photo from a reporter, 'bukti' for the proof-of-completion photo
 * from staff. Only these two prefixes may ever be read back.
 */
const FOLDER = { laporan: 'laporan', bukti: 'bukti' } as const;
type JenisFoto = keyof typeof FOLDER;

/** Photos are served back by this Worker; see the GET handler below. */
const PREFIX_URL = '/api/uploads';

const MAKS_BYTE = 5 * 1024 * 1024; // 5 MB, cukup untuk foto kamera HP setelah kompresi browser
const TIPE_DIIZINKAN = new Set(['image/jpeg', 'image/png', 'image/webp']);

const app = new Hono<AppEnv>();

/**
 * Public: accepts an attached photo and stores it in R2.
 *
 * The upload goes through the R2 binding rather than a presigned URL, so no S3
 * credentials need to exist anywhere; the Worker streams the body to the bucket.
 * The photo is uploaded first, then its `foto_key` is sent with the report.
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

  const diminta = c.req.query('jenis');
  const jenis: JenisFoto = diminta === 'bukti' ? 'bukti' : 'laporan';

  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  // The date prefix keeps the bucket easy to browse and to purge by period.
  const key = `${FOLDER[jenis]}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  await c.env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });

  return c.json({ key, url: `${PREFIX_URL}/${key}` }, 201);
});

/**
 * Public: serves a photo from R2 through the Worker rather than the public
 * r2.dev domain.
 *
 * Several Indonesian ISPs hijack DNS for `r2.dev`, so images silently fail to
 * load on campus networks. Serving them from the app's own origin removes that
 * dependency and means the bucket never needs public access.
 */
app.get('/:key{.+}', async (c) => {
  const key = c.req.param('key');
  // Only the two photo prefixes are readable, not arbitrary objects in the bucket.
  const boleh = Object.values(FOLDER).some((f) => key.startsWith(`${f}/`));
  if (!boleh) return c.json({ error: 'Berkas tidak ditemukan' }, 404);

  const obj = await c.env.BUCKET.get(key, { onlyIf: c.req.raw.headers });
  if (!obj) return c.json({ error: 'Berkas tidak ditemukan' }, 404);

  const headers = new Headers();
  obj.writeHttpMetadata(headers);
  headers.set('etag', obj.httpEtag);
  // Filenames are UUIDs and are never overwritten, so caching forever is safe.
  headers.set('cache-control', 'public, max-age=31536000, immutable');

  // No `body` means the If-None-Match precondition held: the browser has it already.
  if (!('body' in obj)) return new Response(null, { status: 304, headers });
  return new Response(obj.body, { headers });
});

export default app;
