import { addDays, daysInRange, wibDate, wibDayRange } from '../adapters/clock';
import { deletePhoto, FOLDER, photoUploadedAt } from '../adapters/storage';
import {
  CLEANING_TASKS,
  distanceMeters,
  locationStatus,
  photoUrl,
  type CleaningReportDTO,
  type CleaningTask,
  type LocationStatus,
} from '../domain/types';
import type { Env } from '../env';
import * as cleaning from '../repositories/cleaning';
import { cleaningChanged, memo } from '../adapters/memo';
import { log } from './activity-service';

/**
 * Cleaning reports: "on this floor I swept and mopped, emptied the bins, refilled
 * the gallon", one live photo per task. The staff page sends one task at a time.
 *
 * Built against what went wrong with WhatsApp reports, where an old photo could
 * stand in for today's work:
 *   - photos come only from the in-page camera (the frontend has no file picker),
 *   - the time that counts is when the server received each photo, never the
 *     phone's clock, and a photo older than PHOTO_MAX_AGE_MS is refused,
 *   - a photo can prove one task once: reusing it is refused,
 *   - the phone's GPS position is compared with the campus; a report from far
 *     away or without a position is still accepted, but flagged to the supervisor.
 */

/** Long enough to photograph a whole floor before sending, short enough to rule out yesterday. */
const PHOTO_MAX_AGE_MS = 3 * 60 * 60 * 1000;

export interface Campus {
  lat: number;
  lng: number;
  radius_m: number;
}

export function campus(env: Env): Campus {
  return {
    lat: Number(env.CAMPUS_LAT),
    lng: Number(env.CAMPUS_LNG),
    radius_m: Number(env.CAMPUS_RADIUS_M) || 500,
  };
}

function parseTasks(json: string): CleaningTask[] {
  const list = JSON.parse(json) as string[];
  return CLEANING_TASKS.filter((t) => list.includes(t));
}

/** Old tasks ('sweep', 'mop') are not in the list; they sort after the current ones. */
const taskOrder = (t: CleaningTask) => (CLEANING_TASKS as readonly string[]).indexOf(t) >>> 0;

const toUTC = (d: Date) => d.toISOString().slice(0, 19).replace('T', ' ');

export interface AreaDTO {
  id: string;
  name: string;
  building_code: string | null;
  building_name: string | null;
  floor: number | null;
  tasks: CleaningTask[];
}

/** The locations every page picks from; they change only when the seed is re-run. */
export function listAreas(env: Env): Promise<AreaDTO[]> {
  return memo('areas', 5 * 60_000, () => loadAreas(env));
}

function toAreaDTO(a: cleaning.AreaRow): AreaDTO {
  return {
    id: a.id,
    name: a.name,
    building_code: a.building_code,
    building_name: a.building_name,
    floor: a.floor,
    tasks: parseTasks(a.tasks),
  };
}

async function loadAreas(env: Env): Promise<AreaDTO[]> {
  return (await cleaning.activeAreas(env)).map(toAreaDTO);
}

export async function getArea(env: Env, id: string): Promise<AreaDTO | null> {
  const area = await cleaning.activeArea(env, id);
  return area ? toAreaDTO(area) : null;
}

export type SubmitResult =
  | {
      kind: 'ok';
      id: string;
      area: string;
      duplicate: boolean;
      location_status: LocationStatus;
      distance_m: number | null;
    }
  | { kind: 'unknown-area' }
  | { kind: 'task-not-here'; task: CleaningTask }
  | { kind: 'photo-not-found'; task: CleaningTask }
  | { kind: 'photo-too-old'; task: CleaningTask }
  | { kind: 'photo-reused'; task: CleaningTask };

export async function submitReport(
  env: Env,
  data: {
    area_id: string;
    tasks: Array<{ task: CleaningTask; photo_key: string }>;
    note: string | null;
    position: { latitude: number; longitude: number; accuracy: number | null } | null;
  },
  staff: { id: string; name: string },
): Promise<SubmitResult> {
  const keys = data.tasks.map((t) => t.photo_key);

  const area = await cleaning.activeArea(env, data.area_id);
  if (!area) {
    await deletePhoto(env, ...keys);
    return { kind: 'unknown-area' };
  }

  // A double-tapped send carries the very same photos: answer with the report
  // they already belong to. Matching on photos rather than on a time window
  // means a second, genuine report a minute later is never swallowed.
  const used = await cleaning.usedPhotos(env, keys);
  const first = used[0];
  if (
    first &&
    used.length === keys.length &&
    used.every((u) => u.report_id === first.report_id && u.staff_id === staff.id && u.area_id === area.id)
  ) {
    return {
      kind: 'ok',
      id: first.report_id,
      area: area.name,
      duplicate: true,
      location_status: first.location_status,
      distance_m: first.distance_m,
    };
  }

  const allowed = parseTasks(area.tasks);
  const wrongTask = data.tasks.find((t) => !allowed.includes(t.task));
  if (wrongTask) return { kind: 'task-not-here', task: wrongTask.task };

  // A photo already proving another task belongs to that report: never delete it here.
  const usedKeys = new Set(used.map((u) => u.photo_key));
  const reused = data.tasks.find((t) => usedKeys.has(t.photo_key));
  if (reused) return { kind: 'photo-reused', task: reused.task };

  const now = Date.now();
  const stamped: Array<{ task: CleaningTask; photo_key: string; photo_at: string }> = [];
  for (const t of data.tasks) {
    const uploaded = t.photo_key.startsWith(`${FOLDER.cleaning}/`)
      ? await photoUploadedAt(env, t.photo_key)
      : null;
    if (!uploaded) return { kind: 'photo-not-found', task: t.task };
    if (now - uploaded.getTime() > PHOTO_MAX_AGE_MS) {
      await deletePhoto(env, t.photo_key);
      return { kind: 'photo-too-old', task: t.task };
    }
    stamped.push({ ...t, photo_at: toUTC(uploaded) });
  }

  const c = campus(env);
  const distance = data.position
    ? Math.round(distanceMeters(c.lat, c.lng, data.position.latitude, data.position.longitude))
    : null;
  const status = locationStatus(distance, data.position?.accuracy ?? null, c.radius_m);

  const id = crypto.randomUUID();
  await cleaning.insert(
    env,
    {
      id,
      area_id: area.id,
      staff_id: staff.id,
      staff_name: staff.name,
      note: data.note,
      latitude: data.position?.latitude ?? null,
      longitude: data.position?.longitude ?? null,
      accuracy_m: data.position?.accuracy ?? null,
      distance_m: distance,
      location_status: status,
    },
    stamped,
  );
  cleaningChanged();

  const taskList = stamped.map((t) => TASK_LABEL[t.task]).join(', ');
  await log(env, {
    action: 'cleaning_reported',
    actor: staff.name,
    summary: `${area.name}: ${taskList}`,
    details: { cleaning_report_id: id, area_id: area.id, tasks: stamped.map((t) => t.task), note: data.note },
  });
  if (status !== 'ok') {
    await log(env, {
      action: 'cleaning_out_of_range',
      actor: staff.name,
      summary:
        status === 'far'
          ? `Lapor ${area.name} dari ${formatDistance(distance!)} di luar kampus`
          : `Lapor ${area.name} tanpa lokasi GPS`,
      details: {
        cleaning_report_id: id,
        area_id: area.id,
        latitude: data.position?.latitude ?? null,
        longitude: data.position?.longitude ?? null,
        accuracy_m: data.position?.accuracy ?? null,
        distance_m: distance,
      },
    });
  }

  return { kind: 'ok', id, area: area.name, duplicate: false, location_status: status, distance_m: distance };
}

/** Indonesian labels for the activity log, which management reads as-is. */
const TASK_LABEL: Record<CleaningTask, string> = {
  sweep_mop: 'menyapu & mengepel',
  glass: 'mengelap kaca jendela',
  toilet: 'membersihkan toilet',
  trash: 'membuang sampah',
  gallon: 'mengisi ulang galon',
  tidy: 'merapikan ruangan',
  sweep: 'menyapu',
  mop: 'mengepel',
};

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1).replace('.', ',')} km` : `${m} m`;
}

export async function listReports(env: Env, filter: cleaning.CleaningFilter): Promise<CleaningReportDTO[]> {
  const rows = await cleaning.find(env, filter);
  const tasks = await cleaning.tasksOf(
    env,
    rows.map((r) => r.id),
  );
  return rows.map((r) => ({
    ...r,
    tasks: tasks
      .filter((t) => t.report_id === r.id)
      .sort((a, b) => taskOrder(a.task) - taskOrder(b.task))
      .map((t) => ({ task: t.task, photo_url: photoUrl(t.photo_key), photo_at: t.photo_at })),
  }));
}

/**
 * The staff reports for the public board: where, which tasks with their
 * photos, and when. Like the complaint board, it names no staff member, and
 * the GPS position and its flag stay with the supervisor.
 */
export async function publicReports(env: Env, limit: number) {
  const rows = await listReports(env, { limit });
  return rows.map((r) => ({
    id: r.id,
    area_id: r.area_id,
    area_name: r.area_name,
    note: r.note,
    created_at: r.created_at,
    tasks: r.tasks,
  }));
}

/**
 * One WIB day, per area: which tasks were reported, when, and by whom. Staff do
 * not own areas, whoever is free does the work, so a gap belongs to the area and
 * not to a person. The staff list says what each person did, with no target.
 */
export interface RecapCell {
  /** First time the task was reported that day (UTC), or null when it was not. */
  done_at: string | null;
  times: number;
  /** Every report behind it was filed off campus or without GPS: counted, but questionable. */
  flagged: boolean;
  /** Everyone who reported it that day, first reporter first. */
  staff: string[];
}

export interface RecapArea {
  area_id: string;
  area_name: string;
  tasks: Partial<Record<CleaningTask, RecapCell>>;
}

export interface RecapStaff {
  staff_id: string;
  staff_name: string;
  tasks: number;
  areas: number;
  reports: number;
  alerts: number;
}

/** The supervisor's recap, rebuilt from every area and report of the day: worth a few seconds' keeping. */
export function dailyRecap(env: Env, date: string = wibDate()) {
  return memo(`recap:${date}`, 20_000, () => loadRecap(env, date));
}

async function loadRecap(env: Env, date: string) {
  const [activeAreas, reports] = await Promise.all([
    cleaning.activeAreas(env),
    listReports(env, { from: date, to: date, limit: 1000 }),
  ]);

  const areas = new Map<string, RecapArea>();
  for (const a of activeAreas) {
    const tasks: RecapArea['tasks'] = {};
    for (const t of parseTasks(a.tasks)) tasks[t] = { done_at: null, times: 0, flagged: false, staff: [] };
    areas.set(a.id, { area_id: a.id, area_name: a.name, tasks });
  }

  const staff = new Map<string, RecapStaff & { areaIds: Set<string> }>();

  // Oldest first, so done_at ends up as the first time of the day.
  for (const r of [...reports].reverse()) {
    let s = staff.get(r.staff_id);
    if (!s) {
      s = { staff_id: r.staff_id, staff_name: r.staff_name, tasks: 0, areas: 0, reports: 0, alerts: 0, areaIds: new Set() };
      staff.set(r.staff_id, s);
    }
    const flagged = r.location_status !== 'ok';
    s.reports++;
    if (flagged) s.alerts++;
    s.tasks += r.tasks.length;
    s.areaIds.add(r.area_id);

    // An area deactivated since still shows the work done in it.
    let area = areas.get(r.area_id);
    if (!area) {
      area = { area_id: r.area_id, area_name: r.area_name, tasks: {} };
      areas.set(r.area_id, area);
    }
    for (const t of r.tasks) {
      const cell = (area.tasks[t.task] ??= { done_at: null, times: 0, flagged: false, staff: [] });
      cell.flagged = cell.times === 0 ? flagged : cell.flagged && flagged;
      cell.done_at ??= t.photo_at;
      cell.times++;
      if (!cell.staff.includes(r.staff_name)) cell.staff.push(r.staff_name);
    }
  }

  const cells = [...areas.values()].flatMap((a) => Object.values(a.tasks));
  return {
    date,
    areas: [...areas.values()],
    staff: [...staff.values()]
      .map(({ areaIds, ...s }) => ({ ...s, areas: areaIds.size }))
      .sort((a, b) => b.tasks - a.tasks || a.staff_name.localeCompare(b.staff_name)),
    totals: {
      expected: cells.length,
      done: cells.filter((c) => c.done_at).length,
      reports: reports.length,
      alerts: reports.filter((r) => r.location_status !== 'ok').length,
    },
  };
}

/** Reports from before migration 0010 count 'sweep' and 'mop' apart; today they are one task. */
function mergedLegacyTasks<T extends { task: CleaningTask; count: number }>(rows: T[], group: (r: T) => string = () => ''): T[] {
  const merged = new Map<string, T>();
  for (const r of rows) {
    const task: CleaningTask = r.task === 'sweep' || r.task === 'mop' ? 'sweep_mop' : r.task;
    const key = `${group(r)}|${task}`;
    const seen = merged.get(key);
    merged.set(key, { ...r, task, count: Number(r.count) + Number(seen?.count ?? 0) });
  }
  return [...merged.values()];
}

/** The overview's cleaning charts for a date range; a minute old is fine, like the complaint charts. */
export function chartData(env: Env, from: string, to: string) {
  return memo(`cleaning-charts:${from}:${to}`, 60_000, () => loadChartData(env, from, to));
}

async function loadChartData(env: Env, from: string, to: string) {
  const days = daysInRange(from, to);
  const [counts, activeAreas] = await Promise.all([
    cleaning.chartCounts(env, {
      start: wibDayRange(from).start,
      end: wibDayRange(to).end,
      previousStart: wibDayRange(addDays(from, -days)).start,
    }),
    cleaning.activeAreas(env),
  ]);

  // Empty days are zeros, not gaps: a zero reads as "nothing was reported", which is the truth.
  const dailyMap = new Map(counts.daily.map((d) => [d.date, d]));
  const daily = Array.from({ length: days }, (_, i) => {
    const date = addDays(from, i);
    const found = dailyMap.get(date);
    return {
      date,
      reports: Number(found?.reports ?? 0),
      on_campus: Number(found?.on_campus ?? 0),
      // How many different areas and people that day, for the sparklines under those two numbers.
      areas: Number(found?.areas ?? 0),
      staff: Number(found?.staff ?? 0),
    };
  });

  const hours = new Array<number>(24).fill(0);
  for (const h of counts.hours) hours[h.hour] = Number(h.count);

  const reports = new Map(counts.reportsPerArea.map((a) => [a.area_id, Number(a.count)]));
  const reportsIn = (id: string) => reports.get(id) ?? 0;
  const locationCount = (status: LocationStatus) =>
    Number(counts.locations.find((l) => l.location_status === status)?.count ?? 0);
  const current = Number(counts.current.reports);
  const previous = counts.previous;

  return {
    trend: {
      days,
      reports: current,
      previous_reports: previous,
      // A previous window of zero has no meaningful percentage change.
      change: previous > 0 ? Math.round(((current - previous) / previous) * 100) : null,
      alerts: Number(counts.current.alerts),
    },
    areas: {
      total: activeAreas.length,
      covered: activeAreas.filter((a) => reportsIn(a.id) > 0).length,
      // In campus order: where nobody has reported yet is the question the supervisor acts on.
      missing: activeAreas.filter((a) => !reportsIn(a.id)).map((a) => ({ id: a.id, name: a.name })),
      list: activeAreas.map((a) => ({
        id: a.id,
        name: a.name,
        building_code: a.building_code,
        building_name: a.building_name,
        floor: a.floor,
        reports: reportsIn(a.id),
      })),
    },
    daily,
    hours,
    location: { ok: locationCount('ok'), far: locationCount('far'), unknown: locationCount('unknown') },
    tasks: mergedLegacyTasks(counts.tasks),
    matrix: mergedLegacyTasks(counts.matrix, (m) => m.building_code),
    buildings: counts.buildings,
    staff: counts.staff,
  };
}
