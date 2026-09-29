import type { Env } from '../env';

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

export const ACTIVITY_ACTIONS: ActivityAction[] = [
  'report_created',
  'analysis',
  'analysis_failed',
  'status_changed',
  'report_deleted',
  'login',
  'daily_summary',
  'user_changed',
  'proof_rejected',
  'verification_failed',
  'question',
  'work_logged',
];

export interface ActivityRow {
  id: number;
  created_at: string;
  action: ActivityAction;
  report_id: string | null;
  actor: string;
  summary: string;
  details: string | null;
}

export async function insert(
  env: Env,
  data: {
    action: ActivityAction;
    report_id: string | null;
    actor: string;
    summary: string;
    details: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO activity_log (action, report_id, actor, summary, details) VALUES (?, ?, ?, ?, ?)`,
  )
    .bind(data.action, data.report_id, data.actor, data.summary, data.details)
    .run();
}

export async function find(
  env: Env,
  filter: { action?: string; report_id?: string; limit?: number },
): Promise<ActivityRow[]> {
  const where: string[] = [];
  const params: unknown[] = [];

  if (filter.action && (ACTIVITY_ACTIONS as string[]).includes(filter.action)) {
    where.push('action = ?');
    params.push(filter.action);
  }
  if (filter.report_id) {
    where.push('report_id = ?');
    params.push(filter.report_id);
  }

  const rows = await env.DB.prepare(
    `SELECT id, created_at, action, report_id, actor, summary, details
       FROM activity_log
       ${where.length ? `WHERE ${where.join(' AND ')}` : ''}
      ORDER BY created_at DESC, id DESC
      LIMIT ?`,
  )
    .bind(...params, filter.limit ?? 100)
    .all<ActivityRow>();
  return rows.results;
}
