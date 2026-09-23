import { summarizeDay } from '../adapters/llm';
import { wibDate } from '../adapters/clock';
import type { Env } from '../env';
import * as reports from '../repositories/reports';
import * as summaries from '../repositories/summaries';
import { log, SYSTEM } from './activity-service';

export interface SummaryResult {
  date: string;
  report_count: number;
  summary: string;
  highlights: string[];
}

/**
 * Writes (or rewrites) the summary for one day. Used both by the afternoon cron
 * and by the "rebuild" button on the dashboard.
 */
export async function generateDailySummary(env: Env, date: string): Promise<SummaryResult> {
  const list = await reports.reportsOnDate(env, date);

  // A day with no reports does not need an LLM call.
  const result = list.length
    ? await summarizeDay(env, date, list)
    : { summary: 'Tidak ada keluhan yang masuk pada hari ini.', highlights: [] };

  await summaries.save(env, {
    date,
    total: list.length,
    summary: result.summary,
    highlights: result.highlights,
  });

  await log(env, {
    action: 'daily_summary',
    actor: SYSTEM,
    summary: `Ringkasan harian ${date} disusun dari ${list.length} laporan`,
  });

  return { date, report_count: list.length, ...result };
}

export async function storedSummary(env: Env, date: string) {
  const row = await summaries.find(env, date);
  if (!row) return { date, exists: false as const };
  return {
    ...row,
    highlights: row.highlights ? (JSON.parse(row.highlights) as string[]) : [],
    exists: true as const,
  };
}

export async function dailyStats(env: Env, date: string) {
  return { date, ...(await summaries.dailyCounts(env, date)) };
}

/** The run of dates the charts cover, oldest first. */
function dateSeries(days: number): string[] {
  return Array.from({ length: days }, (_, i) =>
    wibDate(new Date(Date.now() - (days - 1 - i) * 86_400_000)),
  );
}

/**
 * Chart data.
 *
 * Empty days are filled with zeros rather than skipped: a gap in the series
 * would read as missing data, while a zero reads as "nothing was reported",
 * which is the truth.
 */
export async function chartData(env: Env, days: number) {
  const [counts, advanced] = await Promise.all([
    summaries.chartCounts(env, days),
    summaries.advancedCounts(env, days),
  ]);

  const series = dateSeries(days);

  const dailyMap = new Map(counts.daily.map((r) => [r.date, r]));
  const daily = series.map((date) => {
    const found = dailyMap.get(date);
    return { date, total: Number(found?.total ?? 0), resolved: Number(found?.resolved ?? 0) };
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

export async function leaderboard(env: Env, reporterId: string | null) {
  return {
    data: await summaries.reporterLeaderboard(env),
    me: reporterId ? await summaries.reporterPosition(env, reporterId) : null,
  };
}
