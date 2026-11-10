import { Hono } from 'hono';
import { HTTP_CACHE } from '../adapters/memo';
import type { AppEnv } from '../env';
import * as accounts from '../services/user-service';

const app = new Hono<AppEnv>();

/**
 * Public: the names on the staff dropdown.
 *
 * Staff do not sign in, so this list has to be readable without a session.
 * It carries names only — the same names already shown on resolved reports.
 */
app.get('/', async (c) => {
  c.header('Cache-Control', HTTP_CACHE.staff);
  return c.json({ data: await accounts.activeStaff(c.env) });
});

/**
 * Public: one staff member's placement letter (title, area, duties), shown to
 * them on the daily round as a guide. Job duties only, as on the signed letter;
 * an inactive or unknown id gets a 404.
 */
app.get('/:id/duties', async (c) => {
  const id = c.req.param('id');
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(id)) return c.json({ error: 'Petugas tidak ditemukan' }, 404);
  const duties = await accounts.activeStaffDuties(c.env, id);
  if (!duties) return c.json({ error: 'Petugas tidak ditemukan' }, 404);
  c.header('Cache-Control', HTTP_CACHE.staff);
  return c.json(duties);
});

export default app;
