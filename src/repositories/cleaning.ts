import { scopedCleaning, type ChartScope } from './scope';
import type { CleaningReportRow, CleaningTask, CleaningTaskRow, LocationStatus } from '../domain/types';
import type { Env } from '../env';
import { buildTimeFilter, type TimeFilter } from './time-filter';

/** Every SQL statement about cleaning areas and cleaning reports lives here. */

export interface AreaRow {
  id: string;
  name: string;
  building_code: string | null;
  building_name: string | null;
  floor: number | null;
  tasks: string; // JSON array of CleaningTask
  sort_order: number;
}

export async function activeAreas(env: Env): Promise<AreaRow[]> {
  const rows = await env.DB.prepare(
    `SELECT a.id, a.name, a.building_code, b.name AS building_name, a.floor, a.tasks, a.sort_order
       FROM cleaning_areas a LEFT JOIN buildings b ON b.code = a.building_code
      WHERE a.active = 1
      ORDER BY a.sort_order, a.id`,
  ).all<AreaRow>();
  return rows.results;
}

export async function activeArea(env: Env, id: string): Promise<AreaRow | null> {
  return env.DB.prepare(
    `SELECT a.id, a.name, a.building_code, b.name AS building_name, a.floor, a.tasks, a.sort_order
       FROM cleaning_areas a LEFT JOIN buildings b ON b.code = a.building_code
      WHERE a.id = ? AND a.active = 1`,
  )
    .bind(id)
    .first<AreaRow>();
}

export interface UsedPhoto {
  photo_key: string;
  report_id: string;
  staff_id: string;
  area_id: string;
  location_status: LocationStatus;
  distance_m: number | null;
}

/** The photos from the list that already prove a task, and the report each belongs to. */
export async function usedPhotos(env: Env, keys: string[]): Promise<UsedPhoto[]> {
  if (!keys.length) return [];
  const rows = await env.DB.prepare(
    `SELECT t.photo_key, t.report_id, r.staff_id, r.area_id, r.location_status, r.distance_m
       FROM cleaning_report_tasks t JOIN cleaning_reports r ON r.id = t.report_id
      WHERE t.photo_key IN (${keys.map(() => '?').join(', ')})`,
  )
    .bind(...keys)
    .all<UsedPhoto>();
  return rows.results;
}

/** The report and its tasks are written together, or not at all. */
export async function insert(
  env: Env,
  report: {
    id: string;
    area_id: string;
    staff_id: string;
    staff_name: string;
    note: string | null;
    latitude: number | null;
    longitude: number | null;
    accuracy_m: number | null;
    distance_m: number | null;
    location_status: LocationStatus;
  },
  tasks: Array<{ task: CleaningTask; photo_key: string; photo_at: string }>,
): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(
      `INSERT INTO cleaning_reports
         (id, area_id, staff_id, staff_name, note, latitude, longitude, accuracy_m, distance_m, location_status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    ).bind(
      report.id,
      report.area_id,
      report.staff_id,
      report.staff_name,
      report.note,
      report.latitude,
      report.longitude,
      report.accuracy_m,
      report.distance_m,
      report.location_status,
    ),
    ...tasks.map((t) =>
      env.DB.prepare(
        `INSERT INTO cleaning_report_tasks (report_id, task, photo_key, photo_at) VALUES (?, ?, ?, ?)`,
      ).bind(report.id, t.task, t.photo_key, t.photo_at),
    ),
  ]);
}

export interface CleaningFilter extends TimeFilter {
  staff_id?: string;
  area_id?: string;
  /** Only the reports filed away from campus or without a position. */
  alerts_only?: boolean;
  limit?: number;
}

export async function find(env: Env, f: CleaningFilter): Promise<CleaningReportRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (f.staff_id) {
    where.push('r.staff_id = ?');
    params.push(f.staff_id);
  }
  if (f.area_id) {
    where.push('r.area_id = ?');
    params.push(f.area_id);
  }
  if (f.alerts_only) where.push(`r.location_status <> 'ok'`);
  const time = buildTimeFilter('r.created_at', f);
  where.push(...time.where);
  params.push(...time.params);

  const rows = await env.DB.prepare(
    `SELECT r.*, a.name AS area_name
       FROM cleaning_reports r JOIN cleaning_areas a ON a.id = r.area_id
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY r.created_at DESC
      LIMIT ?`,
  )
    .bind(...params, f.limit ?? 200)
    .all<CleaningReportRow>();
  return rows.results;
}

export async function tasksOf(env: Env, reportIds: string[]): Promise<CleaningTaskRow[]> {
  if (!reportIds.length) return [];
  // D1 caps bound parameters per statement, so long lists go in slices.
  const out: CleaningTaskRow[] = [];
  for (let i = 0; i < reportIds.length; i += 90) {
    const slice = reportIds.slice(i, i + 90);
    const rows = await env.DB.prepare(
      `SELECT report_id, task, photo_key, photo_at FROM cleaning_report_tasks
        WHERE report_id IN (${slice.map(() => '?').join(', ')})`,
    )
      .bind(...slice)
      .all<CleaningTaskRow>();
    out.push(...rows.results);
  }
  return out;
}

/** The cleaning numbers for a WIB date window; `end` is exclusive. */
export async function chartCounts(env: Env, w: { start: string; end: string; previousStart: string }, scope: ChartScope = {}) {
  const inWindow = `r.created_at >= ? AND r.created_at < ?`;
  // The reports in the dashboard's filters (one staff member, one building), or all of them.
  const C = scopedCleaning(scope);
  const [totals, previous, daily, tasks, buildings, hours, staff, areas, matrix, locations] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
      `SELECT COUNT(*) AS reports, COALESCE(SUM(r.location_status <> 'ok'), 0) AS alerts
         FROM ${C} r WHERE ${inWindow}`,
    ).bind(w.start, w.end),
    env.DB.prepare(`SELECT COUNT(*) AS reports FROM ${C} r WHERE ${inWindow}`).bind(w.previousStart, w.start),
    env.DB.prepare(
      // '+7 hours' groups by WIB day rather than UTC.
      `SELECT date(r.created_at, '+7 hours') AS date, COUNT(*) AS reports, SUM(r.location_status = 'ok') AS on_campus,
              COUNT(DISTINCT r.area_id) AS areas, COUNT(DISTINCT r.staff_id) AS staff
         FROM ${C} r WHERE ${inWindow}
        GROUP BY date ORDER BY date`,
    ).bind(w.start, w.end),
    env.DB.prepare(
      `SELECT t.task, COUNT(*) AS count
         FROM cleaning_report_tasks t JOIN ${C} r ON r.id = t.report_id
        WHERE ${inWindow}
        GROUP BY t.task ORDER BY count DESC`,
    ).bind(w.start, w.end),
    env.DB.prepare(
      // A place outside the buildings (Lapang Voli) stands for itself, as on the complaint charts.
      `SELECT COALESCE(a.building_code, a.name) AS building_code, COALESCE(b.name, a.name) AS building_name,
              COUNT(*) AS count
         FROM ${C} r
         JOIN cleaning_areas a ON a.id = r.area_id
         LEFT JOIN buildings b ON b.code = a.building_code
        WHERE ${inWindow}
        GROUP BY 1 ORDER BY count DESC`,
    ).bind(w.start, w.end),
    env.DB.prepare(
      `SELECT CAST(strftime('%H', r.created_at, '+7 hours') AS INTEGER) AS hour, COUNT(*) AS count
         FROM ${C} r WHERE ${inWindow}
        GROUP BY hour`,
    ).bind(w.start, w.end),
    env.DB.prepare(
      `SELECT r.staff_id, MAX(r.staff_name) AS staff_name,
              COUNT(DISTINCT r.id) AS reports,
              COUNT(t.task) AS tasks,
              COUNT(DISTINCT r.area_id) AS areas,
              COUNT(DISTINCT CASE WHEN r.location_status <> 'ok' THEN r.id END) AS alerts
         FROM ${C} r LEFT JOIN cleaning_report_tasks t ON t.report_id = r.id
        WHERE ${inWindow}
        GROUP BY r.staff_id ORDER BY tasks DESC, staff_name`,
    ).bind(w.start, w.end),
    env.DB.prepare(`SELECT r.area_id, COUNT(*) AS count FROM ${C} r WHERE ${inWindow} GROUP BY r.area_id`).bind(
      w.start,
      w.end,
    ),
    env.DB.prepare(
      `SELECT COALESCE(a.building_code, a.name) AS building_code, t.task, COUNT(*) AS count
         FROM cleaning_report_tasks t
         JOIN ${C} r ON r.id = t.report_id
         JOIN cleaning_areas a ON a.id = r.area_id
        WHERE ${inWindow}
        GROUP BY 1, t.task`,
    ).bind(w.start, w.end),
    env.DB.prepare(
      `SELECT r.location_status, COUNT(*) AS count FROM ${C} r WHERE ${inWindow} GROUP BY r.location_status`,
    ).bind(w.start, w.end),
  ]);
  return {
    current: totals.results[0] as { reports: number; alerts: number },
    previous: Number((previous.results[0] as { reports: number }).reports),
    daily: daily.results as Array<{ date: string; reports: number; on_campus: number; areas: number; staff: number }>,
    tasks: tasks.results as Array<{ task: CleaningTask; count: number }>,
    buildings: buildings.results as Array<{ building_code: string; building_name: string; count: number }>,
    hours: hours.results as Array<{ hour: number; count: number }>,
    staff: staff.results as Array<{
      staff_id: string;
      staff_name: string;
      reports: number;
      tasks: number;
      areas: number;
      alerts: number;
    }>,
    reportsPerArea: areas.results as Array<{ area_id: string; count: number }>,
    matrix: matrix.results as Array<{ building_code: string; task: CleaningTask; count: number }>,
    locations: locations.results as Array<{ location_status: LocationStatus; count: number }>,
  };
}
