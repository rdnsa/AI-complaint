import { Hono } from 'hono';
import type { AppEnv } from '../env';
import * as akun from '../services/user-service';

const app = new Hono<AppEnv>();

/**
 * Public: the names on the staff dropdown.
 *
 * Staff do not sign in, so this list has to be readable without a session.
 * It carries names only — the same names already shown on resolved reports.
 */
app.get('/', async (c) => c.json({ data: await akun.petugasAktif(c.env) }));

export default app;
