import { wibDayRange } from '../adapters/clock';
import type { Env } from '../env';

export interface SummaryRow {
  date: string;
  report_count: number;
  summary: string;
  highlights: string | null;
}

export async function find(env: Env, date: string): Promise<SummaryRow | null> {
  return env.DB.prepare(`SELECT * FROM daily_summaries WHERE date = ?`)
    .bind(date)
    .first<SummaryRow>();
}

export async function save(
  env: Env,
  data: { date: string; total: number; summary: string; highlights: string[] },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO daily_summaries (date, report_count, summary, highlights)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(date) DO UPDATE SET
       report_count = excluded.report_count,
       summary      = excluded.summary,
       highlights   = excluded.highlights,
       created_at   = datetime('now')`,
  )
    .bind(data.date, data.total, data.summary, JSON.stringify(data.highlights))
    .run();
}

/** The counters behind the dashboard summary cards. */
export async function dailyCounts(env: Env, date: string) {
  const { start, end } = wibDayRange(date);

  const [today, unresolved, byLocation] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(
      `SELECT COUNT(*) AS total,
              SUM(priority = 'high')   AS high,
              SUM(priority = 'medium') AS medium,
              SUM(priority = 'low')    AS low,
              SUM(ai_status = 'failed') AS ai_failed
         FROM reports WHERE created_at >= ? AND created_at < ?`,
    ).bind(start, end),
    env.DB.prepare(`SELECT COUNT(*) AS n FROM reports WHERE status <> 'resolved'`),
    env.DB.prepare(
      `SELECT t.name AS location, COUNT(*) AS count
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
        WHERE r.created_at >= ? AND r.created_at < ?
        GROUP BY r.toilet_id ORDER BY count DESC LIMIT 5`,
    ).bind(start, end),
  ]);

  return {
    today: today.results[0] ?? {},
    unresolved: (unresolved.results[0] as { n: number } | undefined)?.n ?? 0,
    top_locations: byLocation.results,
  };
}

/** Everything the charts need, computed in one batch. */
export async function chartCounts(env: Env, days: number) {
  const [daily, categories, priorities, buildings, resolution] = await env.DB.batch<
    Record<string, unknown>
  >([
    env.DB.prepare(
      // '+7 hours' groups by WIB day rather than UTC.
      `SELECT date(created_at, '+7 hours') AS date,
              COUNT(*) AS total,
              SUM(status = 'resolved') AS resolved
         FROM reports
        WHERE created_at >= datetime('now', ?)
        GROUP BY date ORDER BY date`,
    ).bind(`-${days} days`),
    env.DB.prepare(
      `SELECT je.value AS category, COUNT(*) AS count
         FROM reports r, json_each(r.categories) je
        WHERE r.categories IS NOT NULL
        GROUP BY je.value ORDER BY count DESC`,
    ),
    env.DB.prepare(
      `SELECT priority, COUNT(*) AS count FROM reports
        WHERE priority IS NOT NULL GROUP BY priority`,
    ),
    env.DB.prepare(
      `SELECT t.building_code, t.building_name, COUNT(*) AS count
         FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
        GROUP BY t.building_code ORDER BY count DESC LIMIT 10`,
    ),
    env.DB.prepare(
      `SELECT COUNT(*) AS count,
              AVG((julianday(resolved_at) - julianday(created_at)) * 1440) AS minutes
         FROM reports WHERE resolved_at IS NOT NULL`,
    ),
  ]);

  return {
    daily: daily.results as Array<{ date: string; total: number; resolved: number }>,
    categories: categories.results,
    priorities: priorities.results,
    buildings: buildings.results,
    resolution: resolution.results[0] ?? { count: 0, minutes: null },
  };
}

/**
 * The deeper cuts behind the dashboard charts.
 *
 * Kept in a second batch so the first one stays cheap: these answer questions
 * about pattern and effectiveness rather than about volume.
 */
export async function advancedCounts(env: Env, days: number) {
  const [hourByDay, matrix, resolutionByPriority, dailyByPriority, trend] = await env.DB.batch<
    Record<string, unknown>
  >([
    env.DB.prepare(
      // Day of week (0 = Sunday) and hour, both shifted into WIB.
      `SELECT CAST(strftime('%w', created_at, '+7 hours') AS INTEGER) AS day,
              CAST(strftime('%H', created_at, '+7 hours') AS INTEGER) AS hour,
              COUNT(*) AS count
         FROM reports GROUP BY day, hour`,
    ),
    env.DB.prepare(
      `SELECT t.building_code, je.value AS category, COUNT(*) AS count
         FROM reports r
         JOIN toilet_info t ON t.id = r.toilet_id, json_each(r.categories) je
        WHERE r.categories IS NOT NULL
        GROUP BY t.building_code, je.value`,
    ),
    env.DB.prepare(
      `SELECT priority,
              COUNT(*) AS count,
              AVG((julianday(resolved_at) - julianday(created_at)) * 1440) AS minutes
         FROM reports
        WHERE resolved_at IS NOT NULL AND priority IS NOT NULL
        GROUP BY priority`,
    ),
    env.DB.prepare(
      `SELECT date(created_at, '+7 hours') AS date, priority, COUNT(*) AS count
         FROM reports
        WHERE created_at >= datetime('now', ?) AND priority IS NOT NULL
        GROUP BY date, priority`,
    ).bind(`-${days} days`),
    env.DB.prepare(
      // Two equal windows side by side, so the dashboard can show a direction
      // of travel instead of a bare number.
      `SELECT
         SUM(created_at >= datetime('now', ?))                                      AS current_period,
         SUM(created_at >= datetime('now', ?) AND created_at < datetime('now', ?))  AS previous_period,
         SUM(created_at >= datetime('now', ?) AND status = 'resolved')              AS resolved_current,
         SUM(created_at >= datetime('now', ?) AND priority = 'high')                AS high_current
       FROM reports`,
    ).bind(
      `-${days} days`,
      `-${days * 2} days`,
      `-${days} days`,
      `-${days} days`,
      `-${days} days`,
    ),
  ]);

  return {
    hourByDay: hourByDay.results as Array<{ day: number; hour: number; count: number }>,
    matrix: matrix.results as Array<{ building_code: string; category: string; count: number }>,
    resolutionByPriority: resolutionByPriority.results as Array<{
      priority: string;
      count: number;
      minutes: number | null;
    }>,
    dailyByPriority: dailyByPriority.results as Array<{
      date: string;
      priority: string;
      count: number;
    }>,
    trend: (trend.results[0] ?? {}) as Record<string, number | null>,
  };
}

/** Reporter leaderboard, ranked by report count. */
export async function reporterLeaderboard(env: Env) {
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, COUNT(*) AS reports,
            SUM(r.status = 'resolved') AS resolved
       FROM reports r JOIN users u ON u.id = r.reporter_id
      WHERE u.role = 'reporter'
      GROUP BY u.id
      ORDER BY reports DESC, resolved DESC, u.name
      LIMIT 20`,
  ).all<{ id: string; name: string; reports: number; resolved: number }>();
  return rows.results;
}

export async function reporterPosition(
  env: Env,
  reporterId: string,
): Promise<{ rank: number; reports: number }> {
  const own = await env.DB.prepare(`SELECT COUNT(*) AS reports FROM reports WHERE reporter_id = ?`)
    .bind(reporterId)
    .first<{ reports: number }>();

  if (!own?.reports) return { rank: 0, reports: 0 };

  const above = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM (
       SELECT reporter_id FROM reports WHERE reporter_id IS NOT NULL
        GROUP BY reporter_id HAVING COUNT(*) > ?
     )`,
  )
    .bind(own.reports)
    .first<{ n: number }>();

  return { rank: (above?.n ?? 0) + 1, reports: own.reports };
}
