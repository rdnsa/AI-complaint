/**
 * The domain layer: vocabulary and rules of the problem itself.
 *
 * Nothing here may import Hono, D1, R2, or any other framework — that is the
 * property which lets these rules be read, tested, and reused without booting
 * a Worker.
 */

export const ROLES = ['supervisor', 'staff', 'reporter'] as const;
export type Role = (typeof ROLES)[number];

export const CATEGORIES = [
  'cleanliness',
  'supplies',
  'damage',
  'odor',
  'flooding',
  'other',
] as const;
export type Category = (typeof CATEGORIES)[number];

export const PRIORITIES = ['low', 'medium', 'high'] as const;
export type Priority = (typeof PRIORITIES)[number];

export const STATUSES = ['new', 'in_progress', 'resolved'] as const;
export type ReportStatus = (typeof STATUSES)[number];

/** What the vision model concluded about a staff proof photo: 'wrong_place' when it does not show the reported location. */
export const PROOF_VERDICTS = ['clean', 'dirty', 'wrong_place'] as const;
export type ProofVerdict = (typeof PROOF_VERDICTS)[number];

/** The verdict as stored on the report, together with the cost of obtaining it. */
export interface ProofVerification {
  verdict: ProofVerdict;
  reason: string;
  model: string;
  ms: number;
}

/** A raw `reports` row as stored, joined with its location. */
export interface ReportRow {
  id: string;
  /** Where: an area (floor, yard, court) since migration 0011, a toilet before it. */
  area_id: string | null;
  toilet_id: string | null;
  description: string;
  photo_key: string | null;
  proof_photo_key: string | null;
  proof_verdict: ProofVerdict | null;
  proof_reason: string | null;
  proof_model: string | null;
  proof_ms: number | null;
  status: ReportStatus;
  staff_name: string | null;
  resolved_at: string | null;
  ai_status: 'pending' | 'ok' | 'failed';
  categories: string | null;
  priority: Priority | null;
  summary: string | null;
  recommendation: string | null;
  ai_error: string | null;
  ai_model: string | null;
  ai_ms: number | null;
  reporter_id: string | null;
  created_at: string;
  updated_at: string;
  // produced by the JOIN against the location_info view
  location_name?: string;
  building_code?: string | null;
  building_name?: string | null;
  /** 0 is a building's yard, null a whole building or a place outside the buildings. */
  floor?: number | null;
}

/** What the frontend receives: categories parsed, photo keys turned into URLs. */
export interface ReportDTO
  extends Omit<ReportRow, 'categories' | 'photo_key' | 'proof_photo_key'> {
  categories: Category[];
  photo_url: string | null;
  proof_photo_url: string | null;
}

/** Photos are served by our own Worker, never by a third-party domain. */
export function photoUrl(key: string | null | undefined): string | null {
  return key ? `/api/uploads/${key}` : null;
}

export function toDTO(row: ReportRow): ReportDTO {
  const { categories, photo_key, proof_photo_key, ...rest } = row;
  return {
    ...rest,
    categories: categories ? (JSON.parse(categories) as Category[]) : [],
    photo_url: photoUrl(photo_key),
    proof_photo_url: photoUrl(proof_photo_key),
  };
}

/** A staff work report ("I cleaned this toilet"), joined with its location. */
export interface WorkLogRow {
  id: string;
  toilet_id: string;
  staff_id: string;
  staff_name: string;
  description: string;
  photo_key: string;
  proof_verdict: ProofVerdict;
  proof_reason: string | null;
  proof_model: string | null;
  proof_ms: number | null;
  created_at: string;
  toilet_name?: string;
  building_code?: string;
  building_name?: string;
  floor?: number;
  type?: string;
}

export interface WorkLogDTO extends Omit<WorkLogRow, 'photo_key'> {
  photo_url: string | null;
}

export function workLogToDTO({ photo_key, ...rest }: WorkLogRow): WorkLogDTO {
  return { ...rest, photo_url: photoUrl(photo_key) };
}

/**
 * A report may only be closed once evidence exists — and the evidence must
 * show the reported location clean, as judged by the vision model.
 *
 * This is the one business rule strict enough to deserve its own function: the
 * HTTP layer, the service layer, and any future caller all decide the same way.
 * A proof photo that was never verified (uploaded before this rule existed) does
 * not count; staff must take a new one.
 */
export function canResolve(
  status: ReportStatus,
  proofPhoto: string | null,
  proofVerdict: ProofVerdict | null,
): boolean {
  return status !== 'resolved' || (Boolean(proofPhoto) && proofVerdict === 'clean');
}

/**
 * The daily tasks a staff member can report, the same list on every area.
 * Migration 0010 replaced the four tasks of the 2026 assignment letter with
 * these six; 'sweep' and 'mop' (now one task) stay readable in old reports.
 */
export const CLEANING_TASKS = ['sweep_mop', 'glass', 'toilet', 'trash', 'gallon', 'tidy'] as const;
export type CleaningTask = (typeof CLEANING_TASKS)[number] | 'sweep' | 'mop';

/** 'ok' inside the campus, 'far' outside it, 'unknown' without a GPS position. */
export type LocationStatus = 'ok' | 'far' | 'unknown';

/** Great-circle distance between two points, in metres (haversine). */
export function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const dLat = (lat2 - lat1) * rad;
  const dLng = (lng2 - lng1) * rad;
  const a =
    Math.sin(dLat / 2) ** 2 + Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(dLng / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/**
 * Whether a phone was on campus when it filed a report.
 *
 * Indoors, GPS is often off by tens of metres, so the reported accuracy is
 * given to the staff member: only a position that is outside the radius even
 * at the near edge of its error circle counts as far. The accuracy is capped,
 * so a phone claiming a 5 km error cannot cover for being elsewhere.
 */
export function locationStatus(
  distance: number | null,
  accuracy: number | null,
  radius: number,
): LocationStatus {
  if (distance === null) return 'unknown';
  const slack = Math.min(Math.max(accuracy ?? 0, 0), 200);
  return distance - slack > radius ? 'far' : 'ok';
}

/** A cleaning report as stored, with the area name joined in. */
export interface CleaningReportRow {
  id: string;
  area_id: string;
  area_name: string;
  staff_id: string;
  staff_name: string;
  note: string | null;
  latitude: number | null;
  longitude: number | null;
  accuracy_m: number | null;
  distance_m: number | null;
  location_status: LocationStatus;
  created_at: string;
}

export interface CleaningTaskRow {
  report_id: string;
  task: CleaningTask;
  photo_key: string;
  photo_at: string;
}

export interface CleaningReportDTO extends CleaningReportRow {
  tasks: Array<{ task: CleaningTask; photo_url: string | null; photo_at: string }>;
}
