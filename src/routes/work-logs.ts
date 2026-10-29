import { Hono } from 'hono';
import { requireSupervisor } from '../adapters/session';
import type { AppEnv } from '../env';
import { readTimeFilter } from '../repositories/time-filter';
import * as workLogs from '../services/work-log-service';

/**
 * HTTP layer for the staff work log: read-only history from before the daily tasks
 * (cleaning reports, routes/cleaning.ts) took its place. Nothing here writes.
 */

const app = new Hono<AppEnv>();

const clampNumber = (value: string | undefined, fallback: number, max: number) =>
  Math.min(Number(value ?? fallback) || fallback, max);

/**
 * Supervisor: the work log of every staff member, optionally one of them,
 * with the same time filter as the report list.
 */
app.get('/', requireSupervisor, async (c) => {
  const q = c.req.query();
  return c.json({
    data: await workLogs.listWorkLogs(c.env, {
      staff_id: q.staff_id,
      toilet_id: q.toilet_id,
      building: q.building,
      ...readTimeFilter(q),
      limit: clampNumber(q.limit, 100, 200),
    }),
  });
});

export default app;
