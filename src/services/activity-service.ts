import * as activity from '../repositories/activity';
import type { ActivityAction } from '../repositories/activity';
import type { Env } from '../env';

/** Actors that are not a named staff member. */
export const REPORTER = 'reporter';
export const SYSTEM = 'system';

/**
 * Writes a single activity-log row.
 *
 * A failure to log must never fail the action being logged — accepting the
 * report matters more than recording it. Every error is therefore swallowed
 * here and only printed to the Worker log.
 */
export async function log(
  env: Env,
  data: {
    action: ActivityAction;
    actor: string;
    summary: string;
    report_id?: string | null;
    details?: unknown;
  },
): Promise<void> {
  try {
    await activity.insert(env, {
      action: data.action,
      report_id: data.report_id ?? null,
      actor: data.actor,
      summary: data.summary,
      details: data.details === undefined ? null : JSON.stringify(data.details),
    });
  } catch (err) {
    console.error('Failed to write activity log:', err);
  }
}

/** The log as management reads it, with the JSON detail already parsed. */
export async function history(
  env: Env,
  filter: { action?: string; report_id?: string; limit?: number },
) {
  const rows = await activity.find(env, filter);
  return rows.map((row) => ({ ...row, details: row.details ? JSON.parse(row.details) : null }));
}
