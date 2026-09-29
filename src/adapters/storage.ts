import type { Env } from '../env';

/**
 * Photo storage on R2.
 *
 * Three kinds of photo share one bucket, separated by prefix: 'report' for the
 * condition photo from a reporter, 'proof' for the proof-of-completion photo
 * from staff, 'work' for the photo on a staff work log. Only these prefixes
 * (plus their pre-rename Indonesian equivalents) may ever be read back.
 */
export const FOLDER = { report: 'report', proof: 'proof', work: 'work' } as const;
export type PhotoKind = keyof typeof FOLDER;

/**
 * Objects uploaded before the English rename live under the old prefixes.
 * They must stay servable and deletable, but nothing new is written there.
 */
const LEGACY_FOLDERS = ['laporan', 'bukti', 'kerja'] as const;

const READABLE_FOLDERS: readonly string[] = [...Object.values(FOLDER), ...LEGACY_FOLDERS];

export const MAX_BYTES = 5 * 1024 * 1024; // enough for a phone photo after browser compression
export const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function isAllowedKey(key: string): boolean {
  return READABLE_FOLDERS.some((f) => key.startsWith(`${f}/`));
}

/** Stores a photo and returns its object key. */
export async function savePhoto(env: Env, file: File, kind: PhotoKind): Promise<string> {
  const ext = file.type.split('/')[1].replace('jpeg', 'jpg');
  // The date prefix keeps the bucket easy to browse and to purge by period.
  const key = `${FOLDER[kind]}/${new Date().toISOString().slice(0, 10)}/${crypto.randomUUID()}.${ext}`;

  await env.BUCKET.put(key, file.stream(), {
    httpMetadata: { contentType: file.type, cacheControl: 'public, max-age=31536000' },
  });
  return key;
}

export function getPhoto(env: Env, key: string, conditions: Headers) {
  return env.BUCKET.get(key, { onlyIf: conditions });
}

/** Reads a whole photo into memory, for handing it to the vision model. */
export async function readPhoto(
  env: Env,
  key: string,
): Promise<{ bytes: ArrayBuffer; type: string } | null> {
  if (!isAllowedKey(key)) return null;
  const obj = await env.BUCKET.get(key);
  if (!obj) return null;
  return { bytes: await obj.arrayBuffer(), type: obj.httpMetadata?.contentType ?? 'image/jpeg' };
}

/** Deleting a photo must never fail the operation that triggered it. */
export async function deletePhoto(env: Env, ...keys: Array<string | null>): Promise<void> {
  for (const key of keys) {
    if (key) await env.BUCKET.delete(key).catch(() => {});
  }
}
