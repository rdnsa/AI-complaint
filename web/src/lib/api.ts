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

export type ToiletType = 'men' | 'women' | 'accessible';
export type ProofVerdict = 'clean' | 'dirty' | 'not_toilet';
export type Category = 'cleanliness' | 'supplies' | 'damage' | 'odor' | 'flooding' | 'other';

export interface Building {
  code: string;
  name: string;
  floors: number[];
}

/** One floor of one building — this is what a QR code stands for. */
export interface Floor {
  building_code: string;
  building_name: string;
  floor: number;
  toilets: Array<{ id: string; type: ToiletType }>;
}

export interface Report {
  id: string;
  toilet_id: string;
  toilet_name: string;
  building_code: string;
  building_name: string;
  floor: number;
  type: ToiletType;
  description: string;
  photo_url: string | null;
  proof_photo_url: string | null;
  /** The vision model's verdict on the proof photo; only 'clean' ever gets stored. */
  proof_verdict: ProofVerdict | null;
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

/** A staff work report: which toilet was cleaned, by whom, with an AI-checked photo. */
export interface WorkLog {
  id: string;
  toilet_id: string;
  toilet_name: string;
  building_code: string;
  building_name: string;
  floor: number;
  type: ToiletType;
  staff_id: string;
  staff_name: string;
  description: string;
  photo_url: string | null;
  proof_verdict: ProofVerdict;
  proof_reason: string | null;
  created_at: string;
}

/** A report on the public board: no raw text, no photo, no staff name. */
export interface PublicReport {
  id: string;
  status: ReportStatus;
  priority: Priority | null;
  categories: Category[];
  summary: string | null;
  ai_status: 'pending' | 'ok' | 'failed';
  toilet_name: string;
  building_code: string;
  floor: number;
  created_at: string;
  resolved_at: string | null;
  proof_photo_url: string | null;
}

/** The numbers behind the dashboard charts. */
export interface ChartData {
  daily: Array<{ date: string; total: number; resolved: number }>;
  dailyByPriority: Array<{ date: string; high: number; medium: number; low: number }>;
  categories: Array<{ category: string; count: number }>;
  priorities: Array<{ priority: string; count: number }>;
  buildings: Array<{ building_code: string; building_name: string; count: number }>;
  resolution: { count: number; minutes: number | null };
  hourByDay: Array<{ day: number; hour: number; count: number }>;
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

export type ActivityAction =
  | 'report_created'
  | 'analysis'
  | 'analysis_failed'
  | 'status_changed'
  | 'report_deleted'
  | 'login'
  | 'daily_summary'
  | 'user_changed'
  | 'proof_rejected'
  | 'verification_failed'
  | 'question'
  | 'work_logged';

export interface ActivityEntry {
  id: number;
  created_at: string;
  action: ActivityAction;
  report_id: string | null;
  actor: string;
  summary: string;
  details: Record<string, unknown> | null;
}

export interface DailyStats {
  date: string;
  today: {
    total: number;
    high: number | null;
    medium: number | null;
    low: number | null;
    ai_failed: number | null;
  };
  unresolved: number;
  top_locations: Array<{ location: string; count: number }>;
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

/** The vision check's verdict on a proof or work photo. */
export interface Verification {
  verdict: ProofVerdict;
  reason: string;
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
  locations: () => req<{ data: Building[] }>('/api/locations'),
  floor: (id: string) => req<Floor>(`/api/locations/${encodeURIComponent(id)}`),

  submitReport: (body: { toilet_id: string; description: string; photo_key?: string | null }) =>
    req<{ id: string; toilet: string; duplicate: boolean }>('/api/reports', {
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
  uploadPhoto: (file: File, kind: 'report' | 'proof' | 'work' = 'report') => {
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
  ) => req<ManagedAccount>('/api/users', { method: 'POST', body: JSON.stringify(body) }),
  updateUser: (id: string, body: { name?: string; password?: string; active?: boolean }) =>
    req<{ ok: boolean }>(`/api/users/${id}`, { method: 'PATCH', body: JSON.stringify(body) }),

  leaderboard: () =>
    req<{ data: LeaderboardRow[]; me: { rank: number; reports: number } | null }>('/api/leaderboard'),

  reports: (filter: Record<string, string>) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: Report[] }>(`/api/reports?${q}`);
  },
  // --- cleaning staff (no sign-in: they send the id picked on the dropdown) ---
  staffList: () => req<{ data: StaffOption[] }>('/api/staff'),
  /** Reports still waiting for staff; `building` + `floor` narrow it to one floor. */
  openReports: (filter: { building?: string; floor?: number } = {}) => {
    const q = new URLSearchParams();
    if (filter.building) q.set('building', filter.building);
    if (filter.floor !== undefined) q.set('floor', String(filter.floor));
    return req<{ data: Report[] }>(`/api/reports/open?${q}`);
  },
  /** Closing with a photo takes a few seconds: the server runs the vision check first. */
  updateStatus: (
    id: string,
    status: ReportStatus,
    extra: { staff_id?: string; proof_photo_key?: string } = {},
  ) =>
    req<{ ok: boolean; status: ReportStatus; verification: Verification | null }>(`/api/reports/${id}`, {
      method: 'PATCH',
      body: JSON.stringify({ status, ...extra }),
    }),
  /** Takes a few seconds: the server runs the vision check before storing it. */
  createWorkLog: (body: { staff_id: string; toilet_id: string; description: string; photo_key: string }) =>
    req<{
      id: string;
      toilet: string;
      duplicate: boolean;
      verification: Verification | null;
    }>('/api/work-logs', { method: 'POST', body: JSON.stringify(body) }),
  /** Supervisor only: the work log, optionally filtered by `staff_id`. */
  workLogs: (filter: Record<string, string> = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: WorkLog[] }>(`/api/work-logs?${q}`);
  },

  reanalyze: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}/reanalyze`, { method: 'POST' }),
  deleteReport: (id: string) => req<{ ok: boolean }>(`/api/reports/${id}`, { method: 'DELETE' }),

  charts: () => req<ChartData>('/api/summary/charts'),
  activity: (filter: Record<string, string> = {}) => {
    const q = new URLSearchParams(Object.entries(filter).filter(([, v]) => v));
    return req<{ data: ActivityEntry[] }>(`/api/activity?${q}`);
  },

  stats: (date?: string) => req<DailyStats>(`/api/summary/stats${date ? `?date=${date}` : ''}`),
  summary: (date?: string) => req<DailySummary>(`/api/summary${date ? `?date=${date}` : ''}`),
  /** Admin only. `history` carries the recent turns so follow-up questions make sense. */
  ask: (question: string, history: AskMessage[]) =>
    req<AskAnswer>('/api/ask', { method: 'POST', body: JSON.stringify({ question, history }) }),

  generateSummary: (date?: string) =>
    req<DailySummary>(`/api/summary/generate${date ? `?date=${date}` : ''}`, { method: 'POST' }),
};
