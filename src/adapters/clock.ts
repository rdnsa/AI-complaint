/**
 * D1 stores `created_at` as UTC ('YYYY-MM-DD HH:MM:SS'), while the campus
 * thinks in WIB (UTC+7). Every day-boundary conversion is gathered here so the
 * meaning of "today" stays identical between the dashboard and the summary cron.
 */
const WIB_OFFSET_MS = 7 * 60 * 60 * 1000;

function formatUTC(d: Date): string {
  return d.toISOString().slice(0, 19).replace('T', ' ');
}

/** The WIB date ('YYYY-MM-DD') of a given instant. */
export function wibDate(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** Whether a string is a 'YYYY-MM-DD' date, so it is safe to turn into a range. */
export function isValidDate(value: string | undefined): value is string {
  return Boolean(value && DATE_PATTERN.test(value) && !Number.isNaN(Date.parse(value)));
}

/** Start and end of a WIB date, expressed as UTC strings for D1 queries. */
export function wibDayRange(date: string): { start: string; end: string } {
  const startMs = Date.parse(`${date}T00:00:00Z`) - WIB_OFFSET_MS;
  return {
    start: formatUTC(new Date(startMs)),
    end: formatUTC(new Date(startMs + 24 * 60 * 60 * 1000)),
  };
}
