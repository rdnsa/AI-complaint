import { wibDate } from '../adapters/clock';
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
import { memo } from '../adapters/memo';
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
  staff: Array<{ id: string; name: string }>;
}

/** The locations every page picks from; they change only when the seed is re-run. */
export function listAreas(env: Env): Promise<AreaDTO[]> {
  return memo('areas', 5 * 60_000, () => loadAreas(env));
}

async function loadAreas(env: Env): Promise<AreaDTO[]> {
  const [areas, assigned] = await Promise.all([cleaning.activeAreas(env), cleaning.assignments(env)]);
  return areas.map((a) => ({
    id: a.id,
    name: a.name,
    building_code: a.building_code,
    building_name: a.building_name,
    floor: a.floor,
    tasks: parseTasks(a.tasks),
    staff: assigned.filter((s) => s.area_id === a.id).map((s) => ({ id: s.staff_id, name: s.staff_name })),
  }));
}

export async function getArea(env: Env, id: string): Promise<AreaDTO | null> {
  const area = await cleaning.activeArea(env, id);
  if (!area) return null;
  const assigned = await cleaning.assignments(env, id);
  return {
    id: area.id,
    name: area.name,
    building_code: area.building_code,
    building_name: area.building_name,
    floor: area.floor,
    tasks: parseTasks(area.tasks),
    staff: assigned.map((s) => ({ id: s.staff_id, name: s.staff_name })),
  };
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
 * One WIB day, per staff member: for every area they are assigned to (plus any
 * other area they reported in), which tasks were done and when. A task not
 * reported is a gap; that is what management decides on.
 */
export interface RecapCell {
  /** First time the task was reported that day (UTC), or null when it was not. */
  done_at: string | null;
  times: number;
  /** Every report behind it was filed off campus or without GPS: counted, but questionable. */
  flagged: boolean;
}

export interface RecapArea {
  area_id: string;
  area_name: string;
  assigned: boolean;
  tasks: Partial<Record<CleaningTask, RecapCell>>;
}

export interface RecapStaff {
  staff_id: string;
  staff_name: string;
  areas: RecapArea[];
  expected: number;
  done: number;
  reports: number;
  alerts: number;
}

export async function dailyRecap(env: Env, date: string = wibDate()) {
  const [areas, assigned, reports] = await Promise.all([
    cleaning.activeAreas(env),
    cleaning.assignments(env),
    listReports(env, { from: date, to: date, limit: 1000 }),
  ]);
  const areaById = new Map(areas.map((a) => [a.id, a]));

  const staff = new Map<string, RecapStaff>();
  const ensureStaff = (id: string, name: string) => {
    let s = staff.get(id);
    if (!s) {
      s = { staff_id: id, staff_name: name, areas: [], expected: 0, done: 0, reports: 0, alerts: 0 };
      staff.set(id, s);
    }
    return s;
  };
  const ensureArea = (s: RecapStaff, areaId: string, areaName: string, isAssigned: boolean) => {
    let a = s.areas.find((x) => x.area_id === areaId);
    if (!a) {
      const row = areaById.get(areaId);
      const tasks: RecapArea['tasks'] = {};
      for (const t of row ? parseTasks(row.tasks) : []) tasks[t] = { done_at: null, times: 0, flagged: false };
      a = { area_id: areaId, area_name: areaName, assigned: isAssigned, tasks };
      s.areas.push(a);
    }
    return a;
  };

  for (const as of assigned) {
    ensureArea(ensureStaff(as.staff_id, as.staff_name), as.area_id, areaById.get(as.area_id)?.name ?? as.area_id, true);
  }

  // Oldest first, so done_at ends up as the first time of the day.
  for (const r of [...reports].reverse()) {
    const s = ensureStaff(r.staff_id, r.staff_name);
    s.reports++;
    if (r.location_status !== 'ok') s.alerts++;
    const a = ensureArea(s, r.area_id, r.area_name, false);
    for (const t of r.tasks) {
      const cell = (a.tasks[t.task] ??= { done_at: null, times: 0, flagged: false });
      const flagged = r.location_status !== 'ok';
      cell.flagged = cell.times === 0 ? flagged : cell.flagged && flagged;
      cell.done_at ??= t.photo_at;
      cell.times++;
    }
  }

  for (const s of staff.values()) {
    for (const a of s.areas) {
      const cells = Object.values(a.tasks);
      // Extra work in someone else's area is shown, but does not change the score.
      if (a.assigned) {
        s.expected += cells.length;
        s.done += cells.filter((c) => c.done_at).length;
      }
    }
  }

  const list = [...staff.values()].sort(
    (a, b) => a.done / (a.expected || 1) - b.done / (b.expected || 1) || a.staff_name.localeCompare(b.staff_name),
  );
  return {
    date,
    staff: list,
    totals: {
      expected: list.reduce((n, s) => n + s.expected, 0),
      done: list.reduce((n, s) => n + s.done, 0),
      reports: reports.length,
      alerts: reports.filter((r) => r.location_status !== 'ok').length,
    },
  };
}
