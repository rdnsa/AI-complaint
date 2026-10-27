import type { Env } from '../env';

/** A toilet's display name; only the older work logs still point at toilets. */
export async function activeToiletName(env: Env, id: string): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT name FROM toilet_info WHERE id = ? AND active = 1`)
    .bind(id)
    .first<{ name: string }>();
  return row?.name ?? null;
}
