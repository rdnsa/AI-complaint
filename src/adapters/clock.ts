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
export function tanggalWIB(now: Date = new Date()): string {
  return new Date(now.getTime() + WIB_OFFSET_MS).toISOString().slice(0, 10);
}

/** Start and end of a WIB date, expressed as UTC strings for D1 queries. */
export function rentangHariWIB(tanggal: string): { mulai: string; selesai: string } {
  const mulaiMs = Date.parse(`${tanggal}T00:00:00Z`) - WIB_OFFSET_MS;
  return {
    mulai: formatUTC(new Date(mulaiMs)),
    selesai: formatUTC(new Date(mulaiMs + 24 * 60 * 60 * 1000)),
  };
}
