import { useEffect, useState } from 'react';
import { api } from './api';

/**
 * The server's clock, as seen from this phone.
 *
 * A phone's clock can be set to any time, so the time burned into a photo is
 * the server's: the offset is measured once against /api/health and applied
 * to every reading. Until it is known (or when the server cannot be reached)
 * `now()` returns null and the caller shows no time rather than a wrong one.
 * The time that counts in the reports is recorded by the server anyway.
 */
export function useServerClock() {
  const [offset, setOffset] = useState<number | null>(null);

  useEffect(() => {
    const sent = Date.now();
    api
      .serverTime()
      .then(({ time }) => {
        const received = Date.now();
        // The server answered roughly halfway through the round trip.
        setOffset(Date.parse(time) - (sent + received) / 2);
      })
      .catch(() => setOffset(null));
  }, []);

  return { now: () => (offset === null ? null : new Date(Date.now() + offset)) };
}

/** "Rab, 22 Okt 2026 · 14.05.33 WIB": campus time, whatever zone the phone is in. */
export function formatWIB(date: Date, locale: string): string {
  const day = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Jakarta',
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(date);
  const clock = new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  }).format(date);
  return `${day} · ${clock} WIB`;
}
