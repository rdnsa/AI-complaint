import { summarizeDay, type DayWork } from '../adapters/llm';
import { forget, memo } from '../adapters/memo';
import { addDays, daysInRange, wibDayRange } from '../adapters/clock';
import type { Env } from '../env';
import * as reports from '../repositories/reports';
import * as summaries from '../repositories/summaries';
import { scopeKey, type ChartScope } from '../repositories/scope';
import { log, SYSTEM } from './activity-service';
import * as cleaning from './cleaning-service';

export interface SummaryResult {
  date: string;
  report_count: number;
  summary: string;
  highlights: string[];
}

/** The staff's cleaning work of one day, counted the same way as the dashboard's cleaning charts. */
async function workOn(env: Env, date: string): Promise<DayWork> {
  const c = await cleaning.chartData(env, date, date);
  return {
    reports: c.trend.reports,
    staff: c.staff.length,
    covered: c.areas.covered,
    total: c.areas.total,
    missing: c.areas.missing.map((a) => a.name),
    alerts: c.trend.alerts,
    tasks: c.tasks.map((t) => ({ task: t.task, count: Number(t.count) })),
    busiest: [...c.staff]
      .sort((a, b) => Number(b.reports) - Number(a.reports))
      .slice(0, 3)
      .map((s) => ({ name: s.staff_name, reports: Number(s.reports) })),
  };
}

/**
 * Writes (or rewrites) the summary for one day: the complaints and the staff's
 * cleaning work together. Used both by the afternoon cron and by the "rebuild"
 * button on the dashboard.
 */
export async function generateDailySummary(env: Env, date: string): Promise<SummaryResult> {
  const [list, work] = await Promise.all([reports.reportsOnDate(env, date), workOn(env, date)]);

  // A day with nothing reported at all does not need an LLM call.
  const result =
    list.length || work.reports
      ? await summarizeDay(env, date, list, work)
      : { summary: 'Tidak ada keluhan maupun laporan kerja petugas pada hari ini.', highlights: [] };

  await summaries.save(env, {
    date,
    total: list.length,
    summary: result.summary,
    highlights: result.highlights,
  });

  forget('summary');
  await log(env, {
    action: 'daily_summary',
    actor: SYSTEM,
    summary: `Ringkasan harian ${date} disusun dari ${list.length} keluhan dan ${work.reports} laporan kerja`,
  });

  return { date, report_count: list.length, ...result };
}

/** Read on every dashboard refresh but written once a day (or by "rebuild", which drops it). */
export function storedSummary(env: Env, date: string) {
  return memo(`summary:${date}`, 60_000, async () => {
    const row = await summaries.find(env, date);
    if (!row) return { date, exists: false as const };
    return {
      ...row,
      highlights: row.highlights ? (JSON.parse(row.highlights) as string[]) : [],
      exists: true as const,
    };
  });
}

/** The cards at the top of the dashboard: three counts, polled by every open dashboard. */
export function dailyStats(env: Env, date: string) {
  return memo(`stats:${date}`, 15_000, async () => ({ date, ...(await summaries.dailyCounts(env, date)) }));
}

/** The run of dates the charts cover, oldest first. */
function dateSeries(from: string, days: number): string[] {
  return Array.from({ length: days }, (_, i) => addDays(from, i));
}

/**
 * Chart data.
 *
 * Empty days are filled with zeros rather than skipped: a gap in the series
 * would read as missing data, while a zero reads as "nothing was reported",
 * which is the truth.
 */
/** The dashboard charts: the heaviest queries in the app, and a minute old is fine. */
export function chartData(env: Env, from: string, to: string, scope: ChartScope = {}) {
  return memo(`charts:${from}:${to}:${scopeKey(scope)}`, 60_000, () => loadChartData(env, from, to, scope));
}

async function loadChartData(env: Env, from: string, to: string, scope: ChartScope) {
  const days = daysInRange(from, to);
  const window = {
    start: wibDayRange(from).start,
    end: wibDayRange(to).end,
    previousStart: wibDayRange(addDays(from, -days)).start,
  };
  const [counts, advanced] = await Promise.all([
    summaries.chartCounts(env, window, scope),
    summaries.advancedCounts(env, window, scope),
  ]);

  const series = dateSeries(from, days);

  const dailyMap = new Map(counts.daily.map((r) => [r.date, r]));
  const daily = series.map((date) => {
    const found = dailyMap.get(date);
    return {
      date,
      total: Number(found?.total ?? 0),
      resolved: Number(found?.resolved ?? 0),
      // null, not 0, on a day nothing got resolved: "no answer" must not read as "instant".
      minutes: found?.minutes == null ? null : Math.round(Number(found.minutes)),
    };
  });

  const priorityMap = new Map<string, Record<string, number>>();
  for (const r of advanced.dailyByPriority) {
    const day = priorityMap.get(r.date) ?? {};
    day[r.priority] = Number(r.count);
    priorityMap.set(r.date, day);
  }
  const dailyByPriority = series.map((date) => {
    const d = priorityMap.get(date) ?? {};
    return {
      date,
      high: d.high ?? 0,
      medium: d.medium ?? 0,
      low: d.low ?? 0,
    };
  });

  const trend = advanced.trend;
  const current = Number(trend.current_period ?? 0);
  const previous = Number(trend.previous_period ?? 0);

  return {
    ...counts,
    daily,
    dailyByPriority,
    statuses: advanced.statuses,
    aging: advanced.aging,
    hourByDay: advanced.hourByDay,
    matrix: advanced.matrix,
    resolutionByPriority: advanced.resolutionByPriority,
    trend: {
      days,
      reports: current,
      previous_reports: previous,
      // A previous window of zero has no meaningful percentage change.
      change: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
      resolved: Number(trend.resolved_current ?? 0),
      high: Number(trend.high_current ?? 0),
    },
  };
}

/** Every report of a range, for the dashboard's Excel export. */
export async function exportRows(env: Env, from: string, to: string, scope: ChartScope = {}) {
  const rows = await reports.findForExport(env, from, to, scope);
  return rows.map((r) => ({ ...r, categories: r.categories ? (JSON.parse(r.categories) as string[]) : [] }));
}

export async function leaderboard(env: Env, reporterId: string | null) {
  return {
    // The ranking is the same for everyone; only "me" is per person.
    data: await memo('leaderboard', 30_000, () => summaries.reporterLeaderboard(env)),
    me: reporterId ? await summaries.reporterPosition(env, reporterId) : null,
  };
}
