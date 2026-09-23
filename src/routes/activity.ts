import { Hono } from 'hono';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import * as activity from '../services/activity-service';

const app = new Hono<AppEnv>();

/**
 * The activity log, for management oversight.
 *
 * Rows here are never edited or removed through the app — not even by the staff
 * member who deletes a report — so the trail stays intact.
 */
app.get('/', requireSupervisor, async (c) => {
  const { action, report_id } = c.req.query();
  const limit = Math.min(Number(c.req.query('limit') ?? 100) || 100, 300);
  return c.json({ data: await activity.history(c.env, { action, report_id, limit }) });
});

export default app;
