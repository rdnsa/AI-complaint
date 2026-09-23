import { Hono } from 'hono';
import { z } from 'zod';
import { createSession, clearSession, currentSession } from '../adapters/session';
import type { AppEnv } from '../env';
import * as accounts from '../services/user-service';

const app = new Hono<AppEnv>();

const LoginSchema = z.object({
  username: z.string().trim().min(1),
  password: z.string().min(1),
});

app.post('/login', async (c) => {
  const parsed = LoginSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) return c.json({ error: 'Username dan password wajib diisi' }, 400);

  const result = await accounts.login(c.env, parsed.data.username, parsed.data.password);
  if (result.kind === 'failed') return c.json({ error: 'Username atau password salah' }, 401);

  await createSession(c, result.identity);
  return c.json(result.identity);
});

const RegisterSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username minimal 3 karakter')
    .max(30)
    .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
  name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60),
  password: z.string().min(8, 'Password minimal 8 karakter').max(200),
});

/** Self-registration only ever creates a reporter; staff accounts come from an admin. */
app.post('/register', async (c) => {
  const parsed = RegisterSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const result = await accounts.registerReporter(c.env, parsed.data);
  if (result.kind === 'username-taken') return c.json({ error: 'Username itu sudah dipakai' }, 409);

  await createSession(c, result.identity);
  return c.json(result.identity, 201);
});

app.post('/logout', (c) => {
  clearSession(c);
  return c.json({ ok: true });
});

app.get('/me', async (c) => {
  const session = await currentSession(c);
  return session ? c.json(session) : c.json({ error: 'Belum masuk' }, 401);
});

export default app;
