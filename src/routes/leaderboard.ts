import { Hono } from 'hono';
import { currentSession } from '../adapters/session';
import type { AppEnv } from '../env';
import * as summaries from '../services/summary-service';

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
  const session = await currentSession(c);
  const reporterId = session?.role === 'reporter' ? session.id : null;
  return c.json(await summaries.leaderboard(c.env, reporterId));
});

export default app;
