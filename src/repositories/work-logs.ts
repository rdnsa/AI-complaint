import type { ProofVerification, WorkLogRow } from '../domain/types';
import type { Env } from '../env';
import { buildTimeFilter, type TimeFilter } from './time-filter';

/** Every SQL statement about staff work logs lives here. */

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

/** Same guard as for student reports: the same text twice within two minutes is a double tap. */
export async function findDuplicate(
  env: Env,
  staffId: string,
  toiletId: string,
  description: string,
): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT id FROM work_logs
      WHERE staff_id = ? AND toilet_id = ? AND description = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(staffId, toiletId, description)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function insert(
  env: Env,
  data: {
    id: string;
    toilet_id: string;
    staff_id: string;
    staff_name: string;
    description: string;
    photo_key: string;
    verification: ProofVerification;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO work_logs
       (id, toilet_id, staff_id, staff_name, description, photo_key,
        proof_verdict, proof_reason, proof_model, proof_ms)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  )
    .bind(
      data.id,
      data.toilet_id,
      data.staff_id,
      data.staff_name,
      data.description,
      data.photo_key,
      data.verification.verdict,
      data.verification.reason,
      data.verification.model,
      data.verification.ms,
    )
    .run();
}
