/** Only 'supervisor' and 'reporter' ever sign in; 'staff' is a name on the dropdown. */
export type Role = 'supervisor' | 'staff' | 'reporter';

export interface Session {
  id: string;
  name: string;
  role: Role;
}

export interface ManagedAccount {
  id: string;
  /** Null for cleaning staff, who never sign in. */
  username: string | null;
  name: string;
  role: Role;
  active: number;
  created_at: string;
}

export interface LeaderboardRow {
  id: string;
  name: string;
  reports: number;
  resolved: number | null;
}

export type Priority = 'low' | 'medium' | 'high';
export type ReportStatus = 'new' | 'in_progress' | 'resolved';

/** 'wrong_place': the photo does not show the reported location. */
export type Category = 'cleanliness' | 'supplies' | 'damage' | 'odor' | 'flooding' | 'other';

export interface Report {
  id: string;
  /** Where: an area (a floor, a building's yard, a court); a toilet on reports from before. */
  area_id: string | null;
  toilet_id: string | null;
  location_name: string;
  building_code: string | null;
  building_name: string | null;
  /** 0 is a building's yard, null a whole building or a place outside the buildings. */
  floor: number | null;
  description: string;
  photo_url: string | null;
  proof_photo_url: string | null;
  /** What the vision model sees in the proof photo; arrives shortly after the close. */
  proof_reason: string | null;
  status: ReportStatus;
  staff_name: string | null;
  resolved_at: string | null;
  ai_status: 'pending' | 'ok' | 'failed';
  categories: Category[];
  priority: Priority | null;
  summary: string | null;
  recommendation: string | null;
  ai_ms: number | null;
  created_at: string;
}

/** One name on the staff dropdown. */
export interface StaffOption {
  id: string;
  name: string;
}

/** A report on the public board: no raw text, no photo, no staff name. */
export interface PublicReport {
  id: string;
  status: ReportStatus;
  priority: Priority | null;
  categories: Category[];
  summary: string | null;
  ai_status: 'pending' | 'ok' | 'failed';
  area_id: string | null;
  location_name: string;
  building_code: string | null;
  floor: number | null;
  created_at: string;
  resolved_at: string | null;
  proof_photo_url: string | null;
}

/** The numbers behind the dashboard charts. */
export interface ChartData {
  /** Per day of creation; `minutes` is the average time to resolve, null when none of that day's reports is resolved. */
  daily: Array<{ date: string; total: number; resolved: number; minutes: number | null }>;
  dailyByPriority: Array<{ date: string; high: number; medium: number; low: number }>;
  categories: Array<{ category: string; count: number }>;
  priorities: Array<{ priority: string; count: number }>;
  buildings: Array<{ building_code: string; building_name: string; count: number }>;
  resolution: { count: number; minutes: number | null };
  top_locations: Array<{ location: string; count: number }>;
  hourByDay: Array<{ day: number; hour: number; count: number }>;
  statuses: Array<{ status: string; count: number }>;
  /** Open reports by how long they have waited: <2h, 2–8h, 8–24h, 1–3d, 3d+. */
  aging: number[];
  matrix: Array<{ building_code: string; category: string; count: number }>;
  resolutionByPriority: Array<{ priority: string; count: number; minutes: number | null }>;
  trend: {
    days: number;
    reports: number;
    previous_reports: number;
    change: number | null;
    resolved: number;
    high: number;
  };
}

/** One report in the dashboard's Excel export. Times are WIB. */
export interface ExportReport {
  id: string;
  created_wib: string;
  resolved_wib: string | null;
  minutes_to_resolve: number | null;
  location_name: string;
  building_code: string | null;
  building_name: string | null;
  status: ReportStatus;
  priority: Priority | null;
  categories: Category[];
  summary: string | null;
  description: string;
  recommendation: string | null;
  staff_name: string | null;
}

export type ActivityAction =
  | 'report_created'
  | 'analysis'
  | 'analysis_failed'
  | 'status_changed'
  | 'report_reopened'
  | 'proof_description_failed'
  | 'report_deleted'
  | 'login'
  | 'daily_summary'
  | 'user_changed'
  | 'proof_rejected'
  | 'verification_failed'
  | 'question'
  | 'cleaning_reported'
  | 'cleaning_out_of_range';

export interface ActivityEntry {
  id: number;
  created_at: string;
  action: ActivityAction;
  report_id: string | null;
  actor: string;
  summary: string;
  details: Record<string, unknown> | null;
}

export interface DailySummary {
  exists: boolean;
  date: string;
  report_count?: number;
  summary?: string;
  highlights?: string[];
}

/** One turn of the admin question-answering chat. */
export interface AskMessage {
  role: 'user' | 'assistant';
  text: string;
}

export interface AskAnswer {
  text: string;
  tools: Array<{ name: string; arguments: Record<string, unknown> }>;
  tokens: { prompt: number; completion: number; cache_hit: number };
  ms: number;
  remaining_today: number;
}

/** The six daily tasks, the same on every area. 'sweep' and 'mop' only appear in reports from before. */
export type CleaningTask = 'sweep_mop' | 'glass' | 'toilet' | 'trash' | 'gallon' | 'tidy' | 'sweep' | 'mop';
export const CLEANING_TASKS: CleaningTask[] = ['sweep_mop', 'glass', 'toilet', 'trash', 'gallon', 'tidy'];

/** 'ok' on campus, 'far' away from it, 'unknown' when the phone gave no position. */
export type LocationStatus = 'ok' | 'far' | 'unknown';

/** An area with its own QR: usually one floor, sometimes a yard or a court. */
export interface CleaningArea {
  id: string;
  name: string;
  building_code: string | null;
  building_name: string | null;
  floor: number | null;
  tasks: CleaningTask[];
}

export interface Campus {
  lat: number;
  lng: number;
  radius_m: number;
}

export interface CleaningReport {
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
  tasks: Array<{ task: CleaningTask; photo_url: string | null; photo_at: string }>;
}

/** A staff report on the public board: no staff name, no GPS. */
export interface PublicCleaningReport {
  id: string;
  area_id: string;
  area_name: string;
  note: string | null;
  created_at: string;
  tasks: Array<{ task: CleaningTask; photo_url: string | null; photo_at: string }>;
}

/** One WIB day per area: a gap belongs to the area, because staff do not own areas. */
export interface CleaningRecap {
  date: string;
  areas: Array<{
    area_id: string;
    area_name: string;
    tasks: Partial<Record<CleaningTask, { done_at: string | null; times: number; flagged: boolean; staff: string[] }>>;
  }>;
  /** What each person reported that day, with no target to reach. */
  staff: CleaningStaffWork[];
  totals: { expected: number; done: number; reports: number; alerts: number };
}

export interface CleaningStaffWork {
  staff_id: string;
  staff_name: string;
  tasks: number;
  areas: number;
  reports: number;
  alerts: number;
}

/** The overview's cleaning view, for a date range. */
export interface CleaningCharts {
  trend: { days: number; reports: number; previous_reports: number; change: number | null; alerts: number };
  areas: {
    total: number;
    covered: number;
    missing: Array<{ id: string; name: string }>;
    list: Array<{
      id: string;
      name: string;
      building_code: string | null;
      building_name: string | null;
      floor: number | null;
      reports: number;
    }>;
  };
  location: Record<LocationStatus, number>;
  matrix: Array<{ building_code: string; task: CleaningTask; count: number }>;
  /** Per day: reports, those on campus, and how many different areas and staff. */
  daily: Array<{ date: string; reports: number; on_campus: number; areas: number; staff: number }>;
  /** Reports per hour of the WIB day, 24 entries. */
  hours: number[];
  tasks: Array<{ task: CleaningTask; count: number }>;
  buildings: Array<{ building_code: string; building_name: string; count: number }>;
  staff: CleaningStaffWork[];
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    /** The rest of the error body, e.g. the verdict behind a rejected proof photo. */
    readonly data: Record<string, unknown> = {},
  ) {
    super(message);
  }
}

/**
 * Read-mostly lists (locations, staff names) are fetched once per visit and
 * shared by every page for `ttl` ms, so moving between pages does not refetch
 * them. A failed fetch is not kept.
 */
const shared = new Map<string, { until: number; value: Promise<unknown> }>();
function cachedReq<T>(path: string, ttl: number): Promise<T> {
  const hit = shared.get(path);
  if (hit && hit.until > Date.now()) return hit.value as Promise<T>;
  const value = req<T>(path);
  shared.set(path, { until: Date.now() + ttl, value });
  value.catch(() => shared.delete(path));
  return value;
}

function forgetStaff() {
  shared.delete('/api/staff');
  shared.delete('/api/cleaning/areas');
}

async function req<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(path, {
    ...init,
    headers: init?.body instanceof FormData ? init.headers : { 'content-type': 'application/json', ...init?.headers },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    const { error, ...rest } = data as { error?: string } & Record<string, unknown>;
    throw new ApiError(error ?? 'Gagal menghubungi server', res.status, rest);
  }
  return data as T;
}

export const api = {
  submitReport: (body: { area_id: string; description: string; photo_key?: string | null }) =>
    req<{ id: string; location: string; duplicate: boolean }>('/api/reports', {
      method: 'POST',
      body: JSON.stringify(body),
    }),

  report: (id: string) => req<Report>(`/api/reports/${id}`),

  /** The public report board — no sign-in required. */
  publicReports: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: PublicReport[]; counts: { total: number; resolved: number | null } }>(
      `/api/reports/public?${q}`,
    );
  },

  /** The signed-in reporter's own reports. */
  myReports: () => req<{ data: Report[] }>('/api/reports/mine'),

  /**
   * `kind` separates the reporter's condition photo, the staff proof photo,
   * and the photo on a staff work report.
   */
  uploadPhoto: (file: File, kind: 'report' | 'proof' | 'cleaning' = 'report') => {
    const fd = new FormData();
    fd.append('file', file);
    return req<{ key: string; url: string }>(`/api/uploads?kind=${kind}`, {
      method: 'POST',
      body: fd,
    });
  },

  // --- accounts ---
  login: (username: string, password: string) =>
    req<Session>('/api/auth/login', { method: 'POST', body: JSON.stringify({ username, password }) }),
  register: (username: string, name: string, password: string) =>
    req<Session>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ username, name, password }),
    }),
  logout: () => req<{ ok: boolean }>('/api/auth/logout', { method: 'POST' }),
  me: () => req<Session>('/api/auth/me'),

  // --- supervisor only ---
  users: () => req<{ data: ManagedAccount[] }>('/api/users'),
  /** A staff member is a name only; another supervisor needs credentials. */
  createUser: (
    body:
      | { role: 'staff'; name: string }
      | { role: 'supervisor'; username: string; name: string; password: string },
  ) =>
    req<ManagedAccount>('/api/users', { method: 'POST', body: JSON.stringify(body) }).finally(forgetStaff),
  updateUser: (id: string, body: { name?: string; password?: string; active?: boolean }) =>
    req<{ ok: boolean }>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }).finally(forgetStaff),
  deleteUser: (id: string) => req<{ ok: boolean }>(`/api/users/${id}`, { method: 'DELETE' }).finally(forgetStaff),

  leaderboard: () =>
    req<{ data: LeaderboardRow[]; me: { rank: number; reports: number } | null }>('/api/leaderboard'),

  reports: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: Report[] }>(`/api/reports?${q}`);
  },
  // --- cleaning staff (no sign-in: they send the id picked on the dropdown) ---
  staffList: () => cachedReq<{ data: StaffOption[] }>('/api/staff', 60_000),
  /** Reports still waiting for staff; `building` + `floor` narrow it to one floor. */
  openReports: (filter: { building?: string; floor?: number } = {}) => {
    const q = new URLSearchParams();
    if (filter.building) q.set('building', filter.building);
    if (filter.floor !== undefined) q.set('floor', String(filter.floor));
    return req<{ data: Report[] }>(`/api/reports/open?${q}`);
  },
  updateStatus: (
    id: string,
    status: ReportStatus,
    extra: { staff_id?: string; proof_photo_key?: string } = {},
  ) =>
    req<{ ok: boolean; status: ReportStatus }>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extra }),
    }),

  // --- cleaning reports per area ---
  serverTime: () => req<{ ok: boolean; time: string }>('/api/health'),
  cleaningAreas: () => cachedReq<{ data: CleaningArea[]; campus: Campus }>('/api/cleaning/areas', 5 * 60_000),
  cleaningArea: (id: string) =>
    req<CleaningArea & { campus: Campus }>(`/api/cleaning/areas/${encodeURIComponent(id)}`),
  submitCleaning: (body: {
    staff_id: string;
    area_id: string;
    tasks: Array<{ task: CleaningTask; photo_key: string }>;
    note: string | null;
    position: { latitude: number; longitude: number; accuracy: number | null } | null;
  }) =>
    req<{
      id: string;
      area: string;
      duplicate: boolean;
      location_status: LocationStatus;
      distance_m: number | null;
    }>('/api/cleaning/reports', { method: 'POST', body: JSON.stringify(body) }),
  /** Supervisor only. `alerts: '1'` keeps only the reports filed off campus or without GPS. */
  cleaningReports: (filter: Record<string, string> = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: CleaningReport[] }>(`/api/cleaning/reports?${q}`);
  },
  publicCleaningReports: () => req<{ data: PublicCleaningReport[] }>('/api/cleaning/reports/public'),
  cleaningRecap: (date: string) => req<CleaningRecap>(`/api/cleaning/recap?date=${date}`),

  reanalyze: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}/reanalyze`, { method: 'POST' }),
  proofPreview: (id: string, key: string) =>
    req<{ description: string | null }>(`/api/reports/${id}/proof-preview`, {
      method: 'POST',
      body: JSON.stringify({ proof_photo_key: key }),
    }),
  reopenReport: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}/reopen`, { method: 'POST' }),
  deleteReport: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}`, { method: 'DELETE' }),

  charts: (from: string, to: string) => req<ChartData>(`/api/summary/charts?from=${from}&to=${to}`),
  cleaningCharts: (from: string, to: string) =>
    req<CleaningCharts>(`/api/summary/cleaning-charts?from=${from}&to=${to}`),
  exportReports: (from: string, to: string) =>
    req<{ data: ExportReport[] }>(`/api/summary/export?from=${from}&to=${to}`),
  activity: (filter: Record<string, string> = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: ActivityEntry[] }>(`/api/activity?${q}`);
  },

  summary: (date?: string) => req<DailySummary>(`/api/summary${date ? `?date=${date}` : ''}`),
  /** Admin only. `history` carries the recent turns so follow-up questions make sense. */
  ask: (question: string, history: AskMessage[]) =>
    req<AskAnswer>('/api/ask', { method: 'POST', body: JSON.stringify({ question, history }) }),

  generateSummary: (date?: string) =>
    req<DailySummary>(`/api/summary/generate${date ? `?date=${date}` : ''}`, { method: 'POST' }),
};
