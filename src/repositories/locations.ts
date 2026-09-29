import type { Env } from '../env';

/** Buildings and the floors of theirs that have a registered toilet. */
export interface LocationRow {
  building_code: string;
  building_name: string;
  building_order: number;
  floor: number;
}

export async function allLocations(env: Env): Promise<LocationRow[]> {
  const rows = await env.DB.prepare(
    `SELECT DISTINCT building_code, building_name, building_order, floor
       FROM toilet_info WHERE active = 1
      ORDER BY building_order, floor`,
  ).all<LocationRow>();
  return rows.results;
}

export interface ToiletRow {
  id: string;
  type: string;
  building_code: string;
  building_name: string;
  floor: number;
}

export async function toiletsOnFloor(
  env: Env,
  code: string,
  floor: number,
): Promise<ToiletRow[]> {
  const rows = await env.DB.prepare(
    `SELECT id, type, building_code, building_name, floor
       FROM toilet_info
      WHERE building_code = ? AND floor = ? AND active = 1
      ORDER BY CASE type WHEN 'men' THEN 0 WHEN 'women' THEN 1 ELSE 2 END`,
  )
    .bind(code, floor)
    .all<ToiletRow>();
  return rows.results;
}

export async function activeToiletName(env: Env, id: string): Promise<string | null> {
  const row = await env.DB.prepare(`SELECT name FROM toilet_info WHERE id = ? AND active = 1`)
    .bind(id)
    .first<{ name: string }>();
  return row?.name ?? null;
}
