import type { Env } from '../env';

/**
 * Photo storage on R2.
 *
 * Two kinds of photo share one bucket, separated by prefix: 'laporan' for the
 * condition photo from a reporter, 'bukti' for the proof-of-completion photo
 * from staff. Only these two prefixes may ever be read back.
 */
export const FOLDER = { laporan: 'laporan', bukti: 'bukti' } as const;
export type JenisFoto = keyof typeof FOLDER;

export const MAKS_BYTE = 5 * 1024 * 1024; // enough for a phone photo after browser compression
export const TIPE_DIIZINKAN = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function kunciDiizinkan(key: string): boolean {
  return Object.values(FOLDER).some((f) => key.startsWith(`${f}/`));
}

/** Stores a photo and returns its object key. */
export async function simpanFoto(env: Env, file: File, jenis: JenisFoto): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  // The date prefix keeps the bucket easy to browse and to purge by period.
  const key = `${FOLDER[jenis]}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });
  return key;
}

export function ambilFoto(env: Env, key: string, syarat: Headers) {
  return env.BUCKET.get(key, { onlyIf: syarat });
}

/** Reads a whole photo into memory, for handing it to the vision model. */
export async function bacaFoto(
  env: Env,
  key: string,
): Promise<{ bytes: ArrayBuffer; tipe: string } | null> {
  if (!kunciDiizinkan(key)) return null;
  const obj = await env.BUCKET.get(key);
  if (!obj) return null;
  return { bytes: await obj.arrayBuffer(), tipe: obj.httpMetadata?.contentType ?? 'image/jpeg' };
}

/** Deleting a photo must never fail the operation that triggered it. */
export async function hapusFoto(env: Env, ...keys: Array<string | null>): Promise<void> {
  for (const key of keys) {
    if (key) await env.BUCKET.delete(key).catch(() => {});
  }
}
