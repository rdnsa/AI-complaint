/**
 * A small in-memory cache for read-mostly queries: the location list, the
 * staff names, the dashboard charts.
 *
 * Cloudflare's Cache API does nothing on *.workers.dev, where this app lives,
 * so the cache sits in the isolate's memory instead. Each isolate keeps its own
 * copy for `ttl` milliseconds; a write in the same isolate drops it at once
 * (`forget`), and other isolates catch up when their copy expires. Concurrent
 * callers share one pending load, and a load that fails is not kept.
 */
const store = new Map<string, { until: number; value: Promise<unknown> }>();

export function memo<T>(key: string, ttlMs: number, load: () => Promise<T>): Promise<T> {
  const now = Date.now();
  const hit = store.get(key);
  if (hit && hit.until > now) return hit.value as Promise<T>;

  const value = load();
  store.set(key, { until: now + ttlMs, value });
  value.catch(() => {
    if (store.get(key)?.value === value) store.delete(key);
  });
  return value;
}

/** Drops every entry whose key starts with `prefix`. */
export function forget(prefix: string): void {
  for (const key of store.keys()) if (key.startsWith(prefix)) store.delete(key);
}

/** Cache-Control values, so every route states its freshness the same way. */
export const HTTP_CACHE = {
  /** Changes when the location seed is re-run: rarely. */
  locations: 'public, max-age=300, stale-while-revalidate=86400',
  /** Changes when the supervisor edits the staff names. */
  staff: 'public, max-age=60, stale-while-revalidate=600',
  /** The public boards: a few seconds old is fine, and spares the database on busy moments. */
  board: 'public, max-age=10, stale-while-revalidate=60',
  /** Supervisor charts: per person, a minute old at most. */
  charts: 'private, max-age=60',
} as const;
