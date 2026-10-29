import { workLogToDTO } from '../domain/types';
import type { Env } from '../env';
import * as workLogs from '../repositories/work-logs';

/**
 * Staff work logs: the read-only history of the older "I cleaned this toilet" reports.
 *
 * Nothing writes to this table any more. Daily work is filed as cleaning reports
 * (cleaning-service.ts), per task and per area, with GPS and a stamped photo.
 */
export async function listWorkLogs(env: Env, filter: workLogs.WorkLogFilter) {
  return (await workLogs.find(env, filter)).map(workLogToDTO);
}
