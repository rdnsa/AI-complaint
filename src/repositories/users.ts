import type { Env } from '../env';
import type { Role } from '../domain/types';

/** Cleaning staff have no username or password: they never sign in. */
export interface UserRow {
  id: string;
  username: string | null;
  name: string;
  role: Role;
  password_hash: string | null;
  password_salt: string | null;
  active: number;
}

export type ManagedAccount = Omit<UserRow, 'password_hash' | 'password_salt'> & {
  created_at: string;
  /** From the placement letter; null for supervisors and staff without one yet. */
  job_title: string | null;
  assignment: string | null;
  /** How many duties the letter lists (a reference for the supervisor, not the target). */
  duty_count: number;
  /** The QR areas that are theirs. */
  area_count: number;
  /** The system tasks across those areas: what they owe per working day. */
  daily_target: number;
};

/** One staff member's placement: title, area, and the numbered duties. */
export interface StaffDuties {
  job_title: string | null;
  assignment: string | null;
  duties: string[];
  /** The QR areas that are theirs: a hint on the daily round, never a limit. */
  areas: string[];
}

export async function findByUsername(env: Env, username: string): Promise<UserRow | null> {
  return env.DB.prepare(`SELECT * FROM users WHERE username = ?`)
    .bind(username)
    .first<UserRow>();
}

export async function usernameTaken(env: Env, username: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT id FROM users WHERE username = ?`)
    .bind(username)
    .first();
  return Boolean(row);
}

export async function findBrief(
  env: Env,
  id: string,
): Promise<{ id: string; name: string; username: string | null; role: Role } | null> {
  return env.DB.prepare(`SELECT id, name, username, role FROM users WHERE id = ?`)
    .bind(id)
    .first<{ id: string; name: string; username: string | null; role: Role }>();
}

/** Supervisors and staff. Reporter accounts are excluded: there may be thousands. */
export async function listManaged(env: Env): Promise<ManagedAccount[]> {
  const rows = await env.DB.prepare(
    `SELECT id, username, name, role, active, created_at, job_title, assignment,
            (SELECT COUNT(*) FROM staff_duties d WHERE d.staff_id = users.id) AS duty_count,
            (SELECT COUNT(*) FROM staff_areas s JOIN cleaning_areas a ON a.id = s.area_id AND a.active = 1
              WHERE s.staff_id = users.id) AS area_count,
            (SELECT COALESCE(SUM(json_array_length(a.tasks)), 0) FROM staff_areas s
               JOIN cleaning_areas a ON a.id = s.area_id AND a.active = 1
              WHERE s.staff_id = users.id) AS daily_target
       FROM users WHERE role IN ('supervisor', 'staff')
      ORDER BY CASE role WHEN 'supervisor' THEN 0 ELSE 1 END, name`,
  ).all<ManagedAccount>();
  return rows.results;
}

/** The names on the staff dropdown. */
export async function activeStaff(env: Env): Promise<Array<{ id: string; name: string }>> {
  const rows = await env.DB.prepare(
    `SELECT id, name FROM users WHERE role = 'staff' AND active = 1 ORDER BY name`,
  ).all<{ id: string; name: string }>();
  return rows.results;
}

/** One active staff member, so a name picked on the dropdown can be trusted to exist. */
export async function findActiveStaff(
  env: Env,
  id: string,
): Promise<{ id: string; name: string } | null> {
  return env.DB.prepare(
    `SELECT id, name FROM users WHERE id = ? AND role = 'staff' AND active = 1`,
  )
    .bind(id)
    .first<{ id: string; name: string }>();
}

export async function insert(
  env: Env,
  data: {
    id: string;
    username: string | null;
    name: string;
    role: Role;
    password_hash: string | null;
    password_salt: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO users (id, username, name, role, password_hash, password_salt)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(data.id, data.username, data.name, data.role, data.password_hash, data.password_salt)
    .run();
}

export async function update(
  env: Env,
  id: string,
  set: string[],
  params: unknown[],
): Promise<void> {
  await env.DB.prepare(`UPDATE users SET ${set.join(', ')} WHERE id = ?`)
    .bind(...params, id)
    .run();
}

/**
 * How many records point at this account. Cleaning reports and reports are
 * history the system keeps; an account with any of it is not
 * deleted, only deactivated.
 */
export async function countRecords(env: Env, id: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM cleaning_reports WHERE staff_id    = ?1)
          + (SELECT COUNT(*) FROM reports          WHERE reporter_id = ?1) AS n`,
  )
    .bind(id)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

/** Active supervisors other than `exceptId`: the sign-in that must always be left over. */
export async function otherActiveSupervisors(env: Env, exceptId: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT COUNT(*) AS n FROM users WHERE role = 'supervisor' AND active = 1 AND id <> ?`,
  )
    .bind(exceptId)
    .first<{ n: number }>();
  return row?.n ?? 0;
}

export async function remove(env: Env, id: string): Promise<void> {
  await env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id).run();
}

/** A staff member's placement and duties, in the letter's order; null when there is no such staff member. */
export async function dutiesOf(env: Env, id: string): Promise<StaffDuties | null> {
  const [person, rows, areas] = await env.DB.batch<Record<string, unknown>>([
    env.DB.prepare(`SELECT job_title, assignment FROM users WHERE id = ? AND role = 'staff'`).bind(id),
    env.DB.prepare(`SELECT text FROM staff_duties WHERE staff_id = ? ORDER BY position`).bind(id),
    // In campus order, as the location pickers list them.
    env.DB.prepare(
      `SELECT s.area_id FROM staff_areas s JOIN cleaning_areas a ON a.id = s.area_id
        WHERE s.staff_id = ? AND a.active = 1 ORDER BY a.sort_order`,
    ).bind(id),
  ]);
  const p = person.results[0] as { job_title: string | null; assignment: string | null } | undefined;
  if (!p) return null;
  return {
    ...p,
    duties: (rows.results as Array<{ text: string }>).map((r) => r.text),
    areas: (areas.results as Array<{ area_id: string }>).map((r) => r.area_id),
  };
}

/** Replaces a staff member's placement and whole duty list in one go. */
export async function replaceDuties(env: Env, id: string, data: StaffDuties): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`UPDATE users SET job_title = ?, assignment = ? WHERE id = ? AND role = 'staff'`).bind(
      data.job_title,
      data.assignment,
      id,
    ),
    env.DB.prepare(`DELETE FROM staff_duties WHERE staff_id = ?`).bind(id),
    ...data.duties.map((text, i) =>
      env.DB.prepare(`INSERT INTO staff_duties (staff_id, position, text) VALUES (?, ?, ?)`).bind(id, i + 1, text),
    ),
    env.DB.prepare(`DELETE FROM staff_areas WHERE staff_id = ?`).bind(id),
    // Only areas that exist: an id from a stale page is dropped, not an error.
    ...data.areas.map((area) =>
      env.DB.prepare(
        `INSERT OR IGNORE INTO staff_areas (staff_id, area_id) SELECT ?, id FROM cleaning_areas WHERE id = ?`,
      ).bind(id, area),
    ),
  ]);
}

/**
 * Active staff with responsible areas, and what those owe per working day: the
 * system's tasks summed over their areas (three floors of six tasks: 18). The
 * same tasks the round reports, so the target and the work are counted alike.
 */
export async function dailyTargets(
  env: Env,
): Promise<Array<{ id: string; name: string; areas: number; per_day: number }>> {
  const rows = await env.DB.prepare(
    `SELECT u.id, u.name, COUNT(a.id) AS areas, COALESCE(SUM(json_array_length(a.tasks)), 0) AS per_day
       FROM users u
       JOIN staff_areas s ON s.staff_id = u.id
       JOIN cleaning_areas a ON a.id = s.area_id AND a.active = 1
      WHERE u.role = 'staff' AND u.active = 1
      GROUP BY u.id`,
  ).all<{ id: string; name: string; areas: number; per_day: number }>();
  return rows.results;
}
