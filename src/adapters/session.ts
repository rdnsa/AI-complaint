import type { Context, MiddlewareHandler } from 'hono';
import { getCookie, setCookie, deleteCookie } from 'hono/cookie';
import { sign, verify } from 'hono/jwt';
import type { Role } from '../domain/types';
import type { AppEnv } from '../env';

const COOKIE = 'session';
const ALG = 'HS256';
const DURATION_SECONDS = 60 * 60 * 12; // 12 hours, enough for one shift

export interface Session {
  id: string;
  name: string;
  role: Role;
}

export async function createSession(c: Context<AppEnv>, session: Session): Promise<void> {
  const token = await sign(
    { ...session, exp: Math.floor(Date.now() / 1000) + DURATION_SECONDS },
    c.env.AUTH_SECRET,
    ALG,
  );
  setCookie(c, COOKIE, token, {
    httpOnly: true,
    secure: new URL(c.req.url).protocol === 'https:',
    sameSite: 'Lax',
    path: '/',
    maxAge: DURATION_SECONDS,
  });
}

export function clearSession(c: Context<AppEnv>): void {
  deleteCookie(c, COOKIE, { path: '/' });
}

export async function currentSession(c: Context<AppEnv>): Promise<Session | null> {
  const token = getCookie(c, COOKIE);
  if (!token) return null;
  try {
    const payload = (await verify(token, c.env.AUTH_SECRET, ALG)) as unknown as Session;
    return payload.id && payload.role
      ? { id: payload.id, name: payload.name, role: payload.role }
      : null;
  } catch {
    return null; // token expired or signature mismatch
  }
}

/**
 * Restricts an endpoint to specific roles.
 *
 * Admin is deliberately not granted blanket access: each endpoint names the
 * roles it accepts, so the authority required is readable at the point where
 * the route is defined.
 */
export function requireRole(...allowed: Role[]): MiddlewareHandler<AppEnv> {
  return async (c, next) => {
    const session = await currentSession(c);
    if (!session) return c.json({ error: 'Silakan masuk terlebih dahulu.' }, 401);
    if (!allowed.includes(session.role)) return c.json({ error: 'Akses ditolak.' }, 403);
    c.set('session', session);
    await next();
  };
}

/**
 * Only the supervisor signs in to manage anything. Cleaning staff never hold a
 * session: they pick their name on the floor page instead (see `staff_id`
 * in the report and work-log routes).
 */
export const requireSupervisor = requireRole('supervisor');
