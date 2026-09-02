import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { AppEnv } from '../types';

const COOKIE = 'sesi_petugas';
const ALG = 'HS256';
const DURASI_DETIK = 60 * 60 * 12; // 12 jam, cukup untuk satu shift

export async function buatSesi(c: Context<AppEnv>, nama: string): Promise<void> {
  const token = await sign(
    { nama, exp: Math.floor(Date.now() / 1000) + DURASI_DETIK },
    c.env.AUTH_SECRET,
    ALG,
  );
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: DURASI_DETIK,
  });
}

export function hapusSesi(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIE, { path: '/' });
}

export async function sesiSaatIni(c: Context<AppEnv>): Promise<string | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  try {
    const payload = (await verify(token, c.env.AUTH_SECRET, ALG)) as { nama?: string };
    return payload.nama ?? null;
  } catch {
    return null; // token kedaluwarsa atau tanda tangan tidak cocok
  }
}

/** Melindungi seluruh endpoint dashboard petugas. */
export const wajibPetugas: MiddlewareHandler<AppEnv> = async (c, next) => {
  const nama = await sesiSaatIni(c);
  if (!nama) return c.json({ error: 'Silakan login sebagai petugas terlebih dahulu.' }, 401);
  c.set('petugas', nama);
  await next();
};

/**
 * Perbandingan waktu-konstan supaya lama respons tidak membocorkan
 * berapa karakter awal password yang sudah benar.
 */
export function samaAman(a: string, b: string): boolean {
  const ea = new TextEncoder().encode(a);
  const eb = new TextEncoder().encode(b);
  if (ea.length !== eb.length) return false;
  let diff = 0;
  for (let i = 0; i < ea.length; i++) diff |= ea[i] ^ eb[i];
  return diff === 0;
}
