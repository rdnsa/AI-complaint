import { wibDayRange, isValidDate } from '../adapters/clock';

/**
 * The time filter shared by the report and work-log lists, so the
 * supervisor's "when" means the same thing on both tabs.
 *
 * Dates are WIB and inclusive at both ends. The time of day is WIB too, to the
 * minute, and inclusive: `hour_from=07:30&hour_to=12:15` covers 07:30:00 to
 * 12:15:59. A bare hour still works (`hour_from=7&hour_to=12` is 07:00 to
 * 12:59), and a start later than the end is an overnight window (22:00–06:00).
 */
export interface TimeFilter {
  /** A single WIB day — kept for existing callers; `from`/`to` supersede it. */
  date?: string;
  from?: string;
  to?: string;
  /** Minutes since WIB midnight, 0–1439. */
  minute_from?: number;
  minute_to?: number;
}

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

  // The stored instant is UTC; shifting it by seven hours gives the WIB clock.
  const minuteOfDay = `(CAST(strftime('%H', ${column}, '+7 hours') AS INTEGER) * 60
                      + CAST(strftime('%M', ${column}, '+7 hours') AS INTEGER))`;
  const { minute_from: lo, minute_to: hi } = f;
  if (lo !== undefined && hi !== undefined && lo > hi) {
    where.push(`(${minuteOfDay} >= ? OR ${minuteOfDay} <= ?)`);
    params.push(lo, hi);
  } else {
    if (lo !== undefined) {
      where.push(`${minuteOfDay} >= ?`);
      params.push(lo);
    }
    if (hi !== undefined) {
      where.push(`${minuteOfDay} <= ?`);
      params.push(hi);
    }
  }

  return { where, params };
}

/**
 * `H`, `HH` or `HH:MM` as minutes since midnight. A bare hour means the start of
 * that hour, or its last minute when it ends the window.
 */
function clock(v: string | undefined, end: boolean): number | undefined {
  const m = v === undefined ? null : /^(\d{1,2})(?::(\d{2}))?$/.exec(v);
  if (!m) return undefined;
  const h = Number(m[1]);
  const min = m[2] === undefined ? (end ? 59 : 0) : Number(m[2]);
  return h > 23 || min > 59 ? undefined : h * 60 + min;
}

/** Reads the time filter from query-string values. */
export function readTimeFilter(q: Record<string, string | undefined>): TimeFilter {
  return {
    date: q.date,
    from: q.from,
    to: q.to,
    minute_from: clock(q.hour_from, false),
    minute_to: clock(q.hour_to, true),
  };
}
