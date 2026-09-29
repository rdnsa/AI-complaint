import { Hono } from 'hono';
import {
  getPhoto,
  isAllowedKey,
  MAX_BYTES,
  savePhoto,
  ALLOWED_TYPES,
  type PhotoKind,
} from '../adapters/storage';
import { photoUrl } from '../domain/types';
import type { AppEnv } from '../env';

const app = new Hono<AppEnv>();

/**
 * Public: accepts an attached photo and stores it in R2.
 *
 * The upload goes through the R2 binding rather than a presigned URL, so no S3
 * credentials need to exist anywhere; the Worker streams the body to the bucket.
 * The photo is uploaded first, then its key is sent along with the report.
 */
app.post('/', async (c) => {
  const form = await c.req.formData().catch(() => null);
  const file = form?.get('file');

  if (!(file instanceof File)) return c.json({ error: 'File tidak ditemukan' }, 400);
  if (!ALLOWED_TYPES.has(file.type)) {
    return c.json({ error: 'Format harus JPG, PNG, atau WebP' }, 415);
  }
  if (file.size > MAX_BYTES) return c.json({ error: 'Ukuran foto maksimal 5 MB' }, 413);

  const requested = c.req.query('kind');
  const kind: PhotoKind = requested === 'proof' || requested === 'work' ? requested : 'report';
  const key = await savePhoto(c.env, file, kind);

  return c.json({ key, url: photoUrl(key) }, 201);
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
  if (!isAllowedKey(key)) return c.json({ error: 'Berkas tidak ditemukan' }, 404);

  const obj = await getPhoto(c.env, key, c.req.raw.headers);
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
