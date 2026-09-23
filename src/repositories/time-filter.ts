import { wibDayRange, isValidDate } from '../adapters/clock';

/**
 * The time filter shared by the report and work-log lists, so the
 * supervisor's "when" means the same thing on both tabs.
 *
 * Dates are WIB and inclusive at both ends; hours are WIB clock hours (0–23),
 * also inclusive, so `hour_from=7&hour_to=12` covers 07:00 to 12:59.
 */
export interface TimeFilter {
  /** A single WIB day — kept for existing callers; `from`/`to` supersede it. */
  date?: string;
  from?: string;
  to?: string;
  hour_from?: number;
  hour_to?: number;
}

const isValidHour = (h: number | undefined): h is number =>
  h !== undefined && Number.isInteger(h) && h >= 0 && h <= 23;

export function buildTimeFilter(column: string, f: TimeFilter): { where: string[]; params: unknown[] } {
  const where: string[] = [];
  const params: unknown[] = [];

  const from = isValidDate(f.from) ? f.from : isValidDate(f.date) ? f.date : undefined;
  const to = isValidDate(f.to) ? f.to : isValidDate(f.date) ? f.date : undefined;
  if (from) {
    where.push(`${column} >= ?`);
    params.push(wibDayRange(from).start);
  }
  if (to) {
    where.push(`${column} < ?`);
    params.push(wibDayRange(to).end);
  }

  // The stored instant is UTC; shifting it by seven hours gives the WIB clock hour.
  const wibHour = `CAST(strftime('%H', ${column}, '+7 hours') AS INTEGER)`;
  if (isValidHour(f.hour_from)) {
    where.push(`${wibHour} >= ?`);
    params.push(f.hour_from);
  }
  if (isValidHour(f.hour_to)) {
    where.push(`${wibHour} <= ?`);
    params.push(f.hour_to);
  }

  return { where, params };
}

/** Reads the time filter from query-string values. */
export function readTimeFilter(q: Record<string, string | undefined>): TimeFilter {
  const hour = (v: string | undefined) => (v !== undefined && /^\d{1,2}$/.test(v) ? Number(v) : undefined);
  return {
    date: q.date,
    from: q.from,
    to: q.to,
    hour_from: hour(q.hour_from),
    hour_to: hour(q.hour_to),
  };
}
