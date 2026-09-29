import { Hono } from 'hono';
import { z } from 'zod';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import * as accounts from '../services/user-service';

const app = new Hono<AppEnv>();

/** Everything in this file is for the supervisor only. */
app.use('*', requireSupervisor);

app.get('/', async (c) => c.json({ data: await accounts.listManaged(c.env) }));

const Name = z.string().trim().min(2, 'Nama minimal 2 karakter').max(60);

/** A staff member is just a name; a supervisor needs credentials to sign in with. */
const CreateSchema = z.discriminatedUnion('role', [
  z.object({ role: z.literal('staff'), name: Name }),
  z.object({
    role: z.literal('supervisor'),
    username: z
      .string()
      .trim()
      .min(3, 'Username minimal 3 karakter')
      .max(30)
      .regex(/^[a-zA-Z0-9._-]+$/, 'Username hanya boleh huruf, angka, titik, garis bawah, dan strip'),
    name: Name,
    password: z.string().min(8, 'Password minimal 8 karakter').max(200),
  }),
]);

app.post('/', async (c) => {
  const parsed = CreateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }
  const supervisor = c.get('session').name;

  if (parsed.data.role === 'staff') {
    const created = await accounts.addStaff(c.env, parsed.data.name, supervisor);
    return c.json({ ...created, username: null, active: 1 }, 201);
  }

  const result = await accounts.addSupervisor(c.env, parsed.data, supervisor);
  if (result.kind === 'username-taken') return c.json({ error: 'Username itu sudah dipakai' }, 409);
  return c.json({ ...result.identity, username: parsed.data.username, active: 1 }, 201);
});

const UpdateSchema = z
  .object({
    name: z.string().trim().min(2, 'Nama minimal 2 karakter').max(60).optional(),
    password: z.string().min(8, 'Password minimal 8 karakter').max(200).optional(),
    active: z.boolean().optional(),
  })
  .refine((v) => v.name !== undefined || v.password !== undefined || v.active !== undefined, {
    message: 'Tidak ada yang diubah',
  });

app.patch('/:id', async (c) => {
  const parsed = UpdateSchema.safeParse(await c.req.json().catch(() => ({})));
  if (!parsed.success) {
    return c.json({ error: parsed.error.issues[0]?.message ?? 'Data tidak valid' }, 400);
  }

  const result = await accounts.updateAccount(c.env, c.req.param('id'), parsed.data, c.get('session'));
  if (result.kind === 'not-found') return c.json({ error: 'Akun tidak ditemukan' }, 404);
  if (result.kind === 'self-lockout') {
    return c.json({ error: 'Akun yang sedang dipakai tidak bisa dinonaktifkan.' }, 400);
  }
  if (result.kind === 'staff-without-password') {
    return c.json({ error: 'Petugas tidak memakai password.' }, 400);
  }
  return c.json({ ok: true });
});

export default app;
