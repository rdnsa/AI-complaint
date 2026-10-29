import type { WorkLogRow } from '../domain/types';
import type { Env } from '../env';
import { buildTimeFilter, type TimeFilter } from './time-filter';

/** Every SQL statement about the (read-only) staff work log lives here. */

const COLUMNS = `w.*, t.name AS toilet_name, t.building_code, t.building_name, t.floor, t.type`;
const FROM = `FROM work_logs w JOIN toilet_info t ON t.id = w.toilet_id`;

export interface WorkLogFilter extends TimeFilter {
  staff_id?: string;
  toilet_id?: string;
  building?: string;
  limit?: number;
}

export async function find(env: Env, f: WorkLogFilter): Promise<WorkLogRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.staff_id) {
    where.push('w.staff_id = ?');
    params.push(f.staff_id);
  }
  if (f.toilet_id) {
    where.push('w.toilet_id = ?');
    params.push(f.toilet_id);
  }
  if (f.building) {
    where.push('t.building_code = ?');
    params.push(f.building.toUpperCase());
  }
  const time = buildTimeFilter('w.created_at', f);
  where.push(...time.where);
  params.push(...time.params);

  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} ${FROM}
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY w.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<WorkLogRow>();
  return rows.results;
}
