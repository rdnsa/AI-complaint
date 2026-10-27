import type { CleaningArea, Report } from './api';

/**
 * The campus locations, as every page picks them: a "Gedung" dropdown, then a
 * "Lantai / Halaman" one. They are the cleaning areas — the locations of the
 * assignment letter (seed/cleaning-areas.sql) — and nothing else, so the
 * reporter, the staff and the supervisor all see the same list.
 */

/** A choice on the "Gedung" dropdown: a lettered building, or a place outside them (Lapang Voli). */
export interface Place {
  key: string;
  code: string | null;
  name: string;
  /** The choices on the second dropdown, see partOf. */
  parts: string[];
}

/**
 * The second dropdown: which part of the place. An area's floor says it —
 * floor 0 is the building's yard (halaman), NULL the whole place (a building
 * assigned as one, or a court), anything else a floor.
 */
export function partOf(a: CleaningArea): string {
  return a.floor === null ? 'whole' : a.floor === 0 ? 'yard' : String(a.floor);
}

/**
 * Areas outside the lettered buildings are grouped by name, so a place split
 * into "- Lantai 1", "- Lantai 2" areas is still one choice.
 */
export function placeKeyOf(a: CleaningArea): string {
  return a.building_code ?? `~${a.name.replace(/\s*-\s*Lantai\s+\d+$/i, '')}`;
}

/** The whole place first, then the yard, then the floors from the bottom up. */
const partRank = (part: string) => (part === 'whole' ? -2 : part === 'yard' ? -1 : Number(part));

/** Buildings by letter, then the places outside them. */
export function buildPlaces(areas: CleaningArea[]): Place[] {
  const places = new Map<string, Place>();
  for (const a of areas) {
    const key = placeKeyOf(a);
    let p = places.get(key);
    if (!p) {
      p = { key, code: a.building_code, name: a.building_code ? (a.building_name ?? '') : key.slice(1), parts: [] };
      places.set(key, p);
    }
    if (!p.parts.includes(partOf(a))) p.parts.push(partOf(a));
  }
  for (const p of places.values()) p.parts.sort((x, y) => partRank(x) - partRank(y));
  return [...places.values()].sort(
    (x, y) => Number(!x.code) - Number(!y.code) || (x.code ?? '').localeCompare(y.code ?? ''),
  );
}

export function areaAt(areas: CleaningArea[], place: Place | null, part: string): CleaningArea | null {
  if (!place || !part) return null;
  return areas.find((a) => placeKeyOf(a) === place.key && partOf(a) === part) ?? null;
}

/**
 * The place and part a link or QR code stands for. The id is an area id
 * ('C-2', 'C-HALAMAN', 'LAPANG-VOLI'), or the '<building>-<floor>' of a door
 * sticker printed before reports covered the whole campus ('A-2'): that lands
 * on the floor, or on the whole building when it is cleaned as one. A building
 * whose floor has no location of its own is picked without a part.
 */
export function locate(
  id: string,
  areas: CleaningArea[],
  places: Place[],
): { key: string; part: string } | null {
  const area = areas.find((a) => a.id === id.toUpperCase());
  if (area) return { key: placeKeyOf(area), part: partOf(area) };

  const m = /^([A-Za-z])-(\d+)$/.exec(id);
  const place = m && places.find((p) => p.code === m[1].toUpperCase());
  if (!place) return null;
  if (place.parts.includes(m[2])) return { key: place.key, part: m[2] };
  return { key: place.key, part: place.parts.includes('whole') ? 'whole' : '' };
}

/**
 * Whether a report is about the chosen place and part; no part means anywhere
 * in the place. Reports from before 0011 point at a toilet, matched by its
 * building and floor.
 */
export function reportIsAt(
  r: Pick<Report, 'area_id' | 'building_code' | 'floor'>,
  areas: CleaningArea[],
  place: Place,
  part: string,
): boolean {
  if (r.area_id) {
    const a = areas.find((x) => x.id === r.area_id);
    return !!a && placeKeyOf(a) === place.key && (!part || partOf(a) === part);
  }
  return (
    r.building_code === place.code && part !== 'yard' && (!part || part === 'whole' || r.floor === Number(part))
  );
}
