import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { AppEnv, Peran } from '../types';

const COOKIE = 'sesi';
const ALG = 'HS256';
const DURASI_DETIK = 60 * 60 * 12; // 12 jam, cukup untuk satu shift

export interface Sesi {
  id: string;
  nama: string;
  peran: Peran;
}

export async function buatSesi(c: Context<AppEnv>, sesi: Sesi): Promise<void> {
  const token = await sign(
    { ...sesi, exp: Math.floor(Date.now() / 1000) + DURASI_DETIK },
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

export async function sesiSaatIni(c: Context<AppEnv>): Promise<Sesi | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  try {
    const isi = (await verify(token, c.env.AUTH_SECRET, ALG)) as unknown as Sesi;
    return isi.id && isi.peran ? { id: isi.id, nama: isi.nama, peran: isi.peran } : null;
  } catch {
    return null; // token kedaluwarsa atau tanda tangan tidak cocok
  }
}

/**
 * Membatasi endpoint pada peran tertentu.
 *
 * Admin sengaja tidak diberi akses otomatis ke segalanya: setiap endpoint
 * menyebut sendiri peran mana yang boleh, sehingga kewenangannya terbaca
 * langsung di tempat rutenya didefinisikan.
 */
export function wajibPeran(...boleh: Peran[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const sesi = await sesiSaatIni(c);
    if (!sesi) return c.json({ error: 'Silakan masuk terlebih dahulu.' }, 401);
    if (!boleh.includes(sesi.peran)) return c.json({ error: 'Akses ditolak.' }, 403);
    c.set('sesi', sesi);
    await next();
  };
}

/** Petugas dan admin sama-sama mengerjakan laporan. */
export const wajibPetugas = wajibPeran('admin', 'petugas');
export const wajibAdmin = wajibPeran('admin');
