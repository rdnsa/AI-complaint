import { Hono } from 'hono';
import type { AppEnv } from '../env';
import * as accounts from '../services/user-service';

const app = new Hono<AppEnv>();

/**
 * Public: the names on the staff dropdown.
 *
 * Staff do not sign in, so this list has to be readable without a session.
 * It carries names only — the same names already shown on resolved reports.
 */
app.get('/', async (c) => c.json({ data: await accounts.activeStaff(c.env) }));

export default app;
