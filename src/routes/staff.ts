import { Hono } from 'hono';
import { HTTP_CACHE } from '../adapters/memo';
import { requireStaff } from '../adapters/session';
import type { AppEnv } from '../env';
import * as accounts from '../services/user-service';

const app = new Hono<AppEnv>();

/**
 * Public: the active staff names — the same names already shown on resolved
 * reports. Staff sign in now, so nothing is picked from this list any more.
 */
app.get('/', async (c) => {
  c.header('Cache-Control', HTTP_CACHE.staff);
  return c.json({ data: await accounts.activeStaff(c.env) });
});

/**
 * The signed-in staff member's own placement letter (title, area, duties),
 * shown on the daily round as a guide. An account deactivated since sign-in gets a 404.
 */
app.get('/me/duties', requireStaff, async (c) => {
  const duties = await accounts.activeStaffDuties(c.env, c.get('session').id);
  if (!duties) return c.json({ error: 'Petugas tidak ditemukan' }, 404);
  c.header('Cache-Control', 'private, no-store');
  return c.json(duties);
});

export default app;
