import { Hono } from 'hono';
import { sesiSaatIni } from '../adapters/session';
import type { AppEnv } from '../env';
import * as ringkasan from '../services/summary-service';

const app = new Hono<AppEnv>();

/**
 * Reporter leaderboard.
 *
 * The ranking is by report count, but the number of reports that were actually
 * resolved is shown alongside it, so what earns recognition is not volume alone
 * but reports that led to a real fix. A signed-in reporter is also told their
 * own position, including when they sit outside the top twenty.
 */
app.get('/', async (c) => {
  const sesi = await sesiSaatIni(c);
  const pelaporId = sesi?.peran === 'pelapor' ? sesi.id : null;
  return c.json(await ringkasan.papanPeringkat(c.env, pelaporId));
});

export default app;
