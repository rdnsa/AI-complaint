import { wibDayRange } from '../adapters/clock';
import type { Env } from '../env';
import { CATEGORIES, PRIORITIES, STATUSES } from '../domain/types';

/**
 * The aggregate queries behind the admin question-answering feature.
 *
 * Every value the model supplies goes through a bind parameter, and every
 * column or grouping it names is looked up in a fixed table below. The model
 * therefore chooses *which* of these queries runs and with which filter, but it
 * never writes SQL.
 */

export interface AnalyticsFilter {
  since?: string;
  until?: string;
  building?: string;
  category?: string;
  priority?: string;
  status?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Shared WHERE clause; `r` is reports, `t` is location_info. */
function buildFilter(f: AnalyticsFilter): { clause: string; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.since && DATE_PATTERN.test(f.since)) {
    where.push('r.created_at >= ?');
    params.push(wibDayRange(f.since).start);
  }
  if (f.until && DATE_PATTERN.test(f.until)) {
    where.push('r.created_at < ?');
    params.push(wibDayRange(f.until).end);
  }
  if (f.building && /^[A-Za-z]$/.test(f.building)) {
    where.push('t.building_code = ?');
    params.push(f.building.toUpperCase());
  }
  if (f.category && (CATEGORIES as readonly string[]).includes(f.category)) {
    where.push(`EXISTS (SELECT 1 FROM json_each(r.categories) WHERE value = ?)`);
    params.push(f.category);
  }
  if (f.priority && (PRIORITIES as readonly string[]).includes(f.priority)) {
    where.push('r.priority = ?');
    params.push(f.priority);
  }
  if (f.status && (STATUSES as readonly string[]).includes(f.status)) {
    where.push('r.status = ?');
    params.push(f.status);
  }
  return { clause: where.length ? `WHERE ${where.join(' AND ')}` : '', params };
}

/** Groupings the model may ask for, mapped to the SQL expression behind each. */
export const GROUPINGS = {
  // A place outside the lettered buildings (Lapang Voli) stands for itself.
  building: `COALESCE(t.building_code || ' - ' || t.building_name, t.name)`,
  location: `t.name`,
  // Floor 0 is a building's yard; no floor, the whole building.
  floor: `CASE
    WHEN t.building_code IS NULL THEN t.name
    WHEN t.floor = 0 THEN 'Gedung ' || t.building_code || ' halaman'
    WHEN t.floor IS NULL THEN 'Gedung ' || t.building_code
    ELSE 'Gedung ' || t.building_code || ' lantai ' || t.floor END`,
  category: `je.value`,
  priority: `COALESCE(r.priority, 'belum dianalisis')`,
  status: `r.status`,
  staff: `COALESCE(r.staff_name, 'belum ada')`,
  date: `date(r.created_at, '+7 hours')`,
  week: `strftime('%Y-W%W', r.created_at, '+7 hours')`,
  month: `strftime('%Y-%m', r.created_at, '+7 hours')`,
  hour: `strftime('%H', r.created_at, '+7 hours') || ':00'`,
  weekday: `CASE strftime('%w', r.created_at, '+7 hours')
    WHEN '0' THEN 'Minggu' WHEN '1' THEN 'Senin' WHEN '2' THEN 'Selasa' WHEN '3' THEN 'Rabu'
    WHEN '4' THEN 'Kamis' WHEN '5' THEN 'Jumat' ELSE 'Sabtu' END`,
} as const;
export type Grouping = keyof typeof GROUPINGS;

const FROM = `FROM reports r JOIN location_info t ON t.id = COALESCE(r.area_id, r.toilet_id)`;

/** Grouping by category needs the JSON array unrolled; every other grouping does not. */
function source(groupBy: Grouping | undefined): string {
  return groupBy === 'category' ? `${FROM}, json_each(r.categories) je` : FROM;
}

export async function countReports(env: Env, groupBy: Grouping | undefined, f: AnalyticsFilter) {
  const { clause, params } = buildFilter(f);

  const total = await env.DB.prepare(`SELECT COUNT(*) AS n ${FROM} ${clause}`)
    .bind(...params)
    .first<{ n: number }>();

  if (!groupBy) return { total: total?.n ?? 0 };

  const expression = GROUPINGS[groupBy];
  const order = ['date', 'week', 'month', 'hour'].includes(groupBy) ? 'label' : 'count DESC';
  const rows = await env.DB.prepare(
    `SELECT ${expression} AS label,
            COUNT(*) AS count,
            SUM(r.status = 'resolved') AS resolved,
            SUM(r.priority = 'high') AS high
       ${source(groupBy)} ${clause}
      GROUP BY label ORDER BY ${order} LIMIT 20`,
  )
    .bind(...params)
    .all<{ label: string; count: number; resolved: number; high: number }>();

  return { total: total?.n ?? 0, group_by: groupBy, rows: rows.results };
}

export async function resolutionTime(
  env: Env,
  groupBy: Grouping | undefined,
  f: AnalyticsFilter,
) {
  const { clause, params } = buildFilter(f);
  const resolved = `${clause ? `${clause} AND` : 'WHERE'} r.resolved_at IS NOT NULL`;
  const minutes = `(julianday(r.resolved_at) - julianday(r.created_at)) * 1440`;
  const select = `COUNT(*) AS resolved_count,
                 ROUND(AVG(${minutes})) AS avg_minutes,
                 ROUND(MIN(${minutes})) AS fastest_minutes,
                 ROUND(MAX(${minutes})) AS slowest_minutes`;

  if (!groupBy) {
    const row = await env.DB.prepare(`SELECT ${select} ${FROM} ${resolved}`)
      .bind(...params)
      .first();
    return row ?? { resolved_count: 0 };
  }

  const rows = await env.DB.prepare(
    `SELECT ${GROUPINGS[groupBy]} AS label, ${select}
       ${source(groupBy)} ${resolved}
      GROUP BY label ORDER BY resolved_count DESC LIMIT 20`,
  )
    .bind(...params)
    .all();
  return { group_by: groupBy, rows: rows.results };
}

/**
 * Individual reports, at most 15. The raw complaint text is deliberately left
 * out: the model reads only its own neutral summary, so a reporter cannot
 * smuggle instructions into the asker's question through a complaint. Staff
 * names travel only when the asker is staff.
 */
export async function listReports(
  env: Env,
  f: AnalyticsFilter,
  order: 'newest' | 'oldest',
  limit: number,
  withStaff: boolean,
) {
  const { clause, params } = buildFilter(f);
  const rows = await env.DB.prepare(
    `SELECT r.id, t.name AS location, r.status, r.priority, r.categories, r.summary,
            ${withStaff ? 'r.staff_name,' : ''}
            datetime(r.created_at, '+7 hours') AS created_wib,
            datetime(r.resolved_at, '+7 hours') AS resolved_wib
       ${FROM} ${clause}
      ORDER BY r.created_at ${order === 'oldest' ? 'ASC' : 'DESC'} LIMIT ?`,
  )
    .bind(...params, Math.min(Math.max(limit, 1), 15))
    .all<{ categories: string | null; summary: string | null }>();

  return rows.results.map((row) => ({
    ...row,
    categories: row.categories ? (JSON.parse(row.categories) as string[]) : [],
    summary: row.summary ?? '(belum dianalisis)',
  }));
}

/**
 * How many questions were asked today — overall, or from one (hashed) address
 * — for the daily budget guards.
 */
export async function questionsToday(env: Env, date: string, ip?: string): Promise<number> {
  const { start } = wibDayRange(date);
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM activity_log
      WHERE action = 'question' AND created_at >= ?
        ${ip ? `AND json_extract(details, '$.ip') = ?` : ''}`,
  )
    .bind(...(ip ? [start, ip] : [start]))
    .first<{ n: number }>();
  return row?.n ?? 0;
}
