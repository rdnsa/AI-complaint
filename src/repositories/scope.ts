/**
 * The dashboard's narrowing filters: one staff member, one building (or a place
 * outside the buildings, such as Lapang Voli, by its name).
 *
 * Every chart query reads `reports` or `cleaning_reports`; with a scope set it
 * reads a filtered copy of that table instead, so all the numbers narrow
 * together without each query growing its own conditions.
 *
 * The values are written into the SQL as literals, so they are only ever ones
 * the route has validated (`parseScope`) and the staff name comes from the
 * database, never from the request; `lit` still escapes them.
 */
export interface ChartScope {
  /** The picked staff member's id, as requested. */
  staffId?: string;
  /** That person's name, looked up from the id; undefined when no active staff has that id. */
  staffName?: string;
  /** A building code, or the name of a place outside the buildings. */
  building?: string;
}

const STAFF_ID = /^[A-Za-z0-9_-]{1,64}$/;
const BUILDING = /^[\p{L}\p{N} ._()'-]{1,80}$/u;

/** The scope a request asks for, or null when either value is malformed. Empty values mean "all". */
export function parseScope(staff: string | undefined, building: string | undefined): ChartScope | null {
  const scope: ChartScope = {};
  if (staff) {
    if (!STAFF_ID.test(staff)) return null;
    scope.staffId = staff;
  }
  if (building) {
    if (!BUILDING.test(building)) return null;
    scope.building = building;
  }
  return scope;
}

/** Part of a cache key: two different scopes never share cached numbers. */
export const scopeKey = (s: ChartScope) => `${s.staffId ?? ''}|${s.building ?? ''}`;

/** A SQL string literal. */
const lit = (s: string) => `'${s.replace(/'/g, "''")}'`;

/** A staff id that matched nobody matches no row either. */
const staffCondition = (s: ChartScope, column: string) =>
  s.staffId === undefined ? null : s.staffName === undefined ? '0' : `${column} = ${lit(s.staffName)}`;

/**
 * The complaints in scope, as a table expression to read from in place of `reports`.
 * On a complaint "staff" is whoever handled it, so a staff scope leaves out the ones nobody has taken.
 */
export function scopedReports(s: ChartScope): string {
  const where = [
    staffCondition(s, 'r0.staff_name'),
    s.building === undefined ? null : `COALESCE(l0.building_code, l0.name) = ${lit(s.building)}`,
  ].filter(Boolean);
  if (!where.length) return 'reports';
  return `(SELECT r0.* FROM reports r0
             LEFT JOIN location_info l0 ON l0.id = COALESCE(r0.area_id, r0.toilet_id)
            WHERE ${where.join(' AND ')})`;
}

/** The cleaning reports in scope, as a table expression to read from in place of `cleaning_reports`. */
export function scopedCleaning(s: ChartScope): string {
  const where = [
    s.staffId === undefined ? null : `c0.staff_id = ${lit(s.staffId)}`,
    s.building === undefined ? null : `COALESCE(a0.building_code, a0.name) = ${lit(s.building)}`,
  ].filter(Boolean);
  if (!where.length) return 'cleaning_reports';
  return `(SELECT c0.* FROM cleaning_reports c0
             JOIN cleaning_areas a0 ON a0.id = c0.area_id
            WHERE ${where.join(' AND ')})`;
}
