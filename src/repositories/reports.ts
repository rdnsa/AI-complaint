import { wibDayRange } from '../adapters/clock';
import type { Env } from '../env';
import {
  PRIORITIES,
  STATUSES,
  type ProofVerification,
  type ReportRow,
  type ReportStatus,
} from '../domain/types';
import { buildTimeFilter, type TimeFilter } from './time-filter';

/**
 * Every SQL statement about reports lives here.
 *
 * Services above this file never see a query, and swapping D1 for another
 * database would mean rewriting this file alone.
 */

const COLUMNS = `r.*, t.name AS toilet_name, t.building_code, t.building_name, t.floor, t.type`;
const FROM = `FROM reports r JOIN toilet_info t ON t.id = r.toilet_id`;

export interface ReportFilter extends TimeFilter {
  status?: string;
  priority?: string;
  toilet_id?: string;
  building?: string;
  limit?: number;
}

/** Builds the shared WHERE clause, so list queries cannot drift apart. */
function buildFilter(f: ReportFilter): { clause: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.status && (STATUSES as readonly string[]).includes(f.status)) {
    where.push('r.status = ?');
    params.push(f.status);
  }
  if (f.priority && (PRIORITIES as readonly string[]).includes(f.priority)) {
    where.push('r.priority = ?');
    params.push(f.priority);
  }
  if (f.toilet_id) {
    where.push('r.toilet_id = ?');
    params.push(f.toilet_id);
  }
  if (f.building) {
    where.push('t.building_code = ?');
    params.push(f.building.toUpperCase());
  }
  const time = buildTimeFilter('r.created_at', f);
  where.push(...time.where);
  params.push(...time.params);

  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

export async function findById(env: Env, id: string): Promise<ReportRow | null> {
  return env.DB.prepare(`SELECT ${COLUMNS} ${FROM} WHERE r.id = ?`).bind(id).first<ReportRow>();
}

export async function findForDashboard(env: Env, f: ReportFilter): Promise<ReportRow[]> {
  const { clause, params } = buildFilter(f);
  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} ${FROM} ${clause}
      ORDER BY
        CASE r.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
        CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
        r.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<ReportRow>();
  return rows.results;
}

export interface PublicRow {
  id: string;
  status: ReportStatus;
  priority: string | null;
  categories: string | null;
  summary: string | null;
  ai_status: string;
  created_at: string;
  resolved_at: string | null;
  proof_photo_key: string | null;
  toilet_name: string;
  building_code: string;
  floor: number;
}

export async function findForPublic(
  env: Env,
  f: ReportFilter,
): Promise<{ rows: PublicRow[]; counts: { total: number; resolved: number | null } }> {
  const { clause, params } = buildFilter(f);
  const [list, counts] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
      `SELECT r.id, r.status, r.priority, r.categories, r.summary, r.ai_status,
              r.created_at, r.resolved_at, r.proof_photo_key,
              t.name AS toilet_name, t.building_code, t.floor
         ${FROM} ${clause}
        ORDER BY
          CASE r.status WHEN 'new' THEN 0 WHEN 'in_progress' THEN 1 ELSE 2 END,
          r.created_at DESC
        LIMIT ?`,
    ).bind(...params, f.limit ?? 100),
    env.DB.prepare(`SELECT COUNT(*) AS total, SUM(status = 'resolved') AS resolved FROM reports`),
  ]);

  return {
    rows: list.results as unknown as PublicRow[],
    counts: (counts.results[0] as { total: number; resolved: number | null }) ?? {
      total: 0,
      resolved: 0,
    },
  };
}

/**
 * Reports still waiting for staff, for the staff pages. Optionally one floor:
 * the floor QR leads staff to exactly the complaints they can fix there.
 */
export async function findOpen(
  env: Env,
  f: { building?: string; floor?: number; limit?: number },
): Promise<ReportRow[]> {
  const where = [`r.status <> 'resolved'`];
  const params: unknown[] = [];
  if (f.building) {
    where.push('t.building_code = ?');
    params.push(f.building.toUpperCase());
  }
  if (f.floor !== undefined) {
    where.push('t.floor = ?');
    params.push(f.floor);
  }
  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} ${FROM} WHERE ${where.join(' AND ')}
      ORDER BY
        CASE r.priority WHEN 'high' THEN 0 WHEN 'medium' THEN 1 WHEN 'low' THEN 2 ELSE 3 END,
        r.created_at
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 100)
    .all<ReportRow>();
  return rows.results;
}

/** The reports filed by one account, for the "My reports" list. */
export async function findByReporter(env: Env, reporterId: string): Promise<ReportRow[]> {
  const rows = await env.DB.prepare(
    `SELECT ${COLUMNS} ${FROM} WHERE r.reporter_id = ? ORDER BY r.created_at DESC LIMIT 50`,
  )
    .bind(reporterId)
    .all<ReportRow>();
  return rows.results;
}

/**
 * An identical complaint for the same toilet within two minutes is almost
 * certainly a double-tapped send button, not two different people.
 */
export async function findDuplicate(
  env: Env,
  toiletId: string,
  description: string,
): Promise<string | null> {
  const row = await env.DB.prepare(
    `SELECT id FROM reports
      WHERE toilet_id = ? AND description = ? AND created_at > datetime('now', '-2 minutes')
      LIMIT 1`,
  )
    .bind(toiletId, description)
    .first<{ id: string }>();
  return row?.id ?? null;
}

export async function insert(
  env: Env,
  data: {
    id: string;
    toilet_id: string;
    description: string;
    photo_key: string;
    reporter_id: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO reports (id, toilet_id, description, photo_key, reporter_id) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(data.id, data.toilet_id, data.description, data.photo_key, data.reporter_id)
    .run();
}

/** The proof photo and its verdict are written together: one never exists without the other. */
export async function updateStatus(
  env: Env,
  id: string,
  status: ReportStatus,
  staffName: string,
  proof: { key: string; verification: ProofVerification } | null,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET status = ?, staff_name = ?,
            proof_photo_key = ?, proof_verdict = ?, proof_reason = ?,
            proof_model = ?, proof_ms = ?,
            resolved_at = CASE WHEN ? = 'resolved' THEN datetime('now') ELSE NULL END,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(
      status,
      staffName,
      proof?.key ?? null,
      proof?.verification.verdict ?? null,
      proof?.verification.reason ?? null,
      proof?.verification.model ?? null,
      proof?.verification.ms ?? null,
      status,
      id,
    )
    .run();
}

export async function markAnalysisPending(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`UPDATE reports SET ai_status = 'pending', ai_error = NULL WHERE id = ?`)
    .bind(id)
    .run();
}

export async function saveAnalysis(
  env: Env,
  id: string,
  result: {
    categories: string[];
    priority: string;
    summary: string;
    recommendation: string;
    model: string;
    ms: number;
  },
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET ai_status = 'ok', categories = ?, priority = ?, summary = ?,
            recommendation = ?, ai_error = NULL, ai_model = ?, ai_ms = ?,
            updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(
      JSON.stringify(result.categories),
      result.priority,
      result.summary,
      result.recommendation,
      result.model,
      result.ms,
      id,
    )
    .run();
}

export async function saveAnalysisFailure(
  env: Env,
  id: string,
  message: string,
  ms: number,
): Promise<void> {
  await env.DB.prepare(
    `UPDATE reports
        SET ai_status = 'failed', ai_error = ?, ai_ms = ?, updated_at = datetime('now')
      WHERE id = ?`,
  )
    .bind(message.slice(0, 500), ms, id)
    .run();
}

export async function remove(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM reports WHERE id = ?`).bind(id).run();
}

/** The bare text and location an analysis needs, without loading the whole row. */
export async function getForAnalysis(
  env: Env,
  id: string,
): Promise<{ description: string; location: string } | null> {
  return env.DB.prepare(
    `SELECT r.description, t.name AS location ${FROM} WHERE r.id = ?`,
  )
    .bind(id)
    .first<{ description: string; location: string }>();
}

export async function reportsOnDate(
  env: Env,
  date: string,
): Promise<
  Array<{ location: string; priority: string | null; summary: string | null; description: string }>
> {
  const { start, end } = wibDayRange(date);
  const rows = await env.DB.prepare(
    `SELECT t.name AS location, r.priority, r.summary, r.description
       ${FROM} WHERE r.created_at >= ? AND r.created_at < ? ORDER BY r.created_at`,
  )
    .bind(start, end)
    .all<{
      location: string;
      priority: string | null;
      summary: string | null;
      description: string;
    }>();
  return rows.results;
}
