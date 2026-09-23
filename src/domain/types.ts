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

export const TOILET_TYPES = ['men', 'women', 'accessible'] as const;
export type ToiletType = (typeof TOILET_TYPES)[number];

/** What the vision model concluded about a staff proof photo. */
export const PROOF_VERDICTS = ['clean', 'dirty', 'not_toilet'] as const;
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
  toilet_id: string;
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
  // produced by the JOIN against the toilet_info view
  toilet_name?: string;
  building_code?: string;
  building_name?: string;
  floor?: number;
  type?: string;
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
 * show a clean toilet, as judged by the vision model.
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
