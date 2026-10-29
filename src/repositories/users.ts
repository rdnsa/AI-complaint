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
};

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
    `SELECT id, username, name, role, active, created_at
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
 * How many records point at this account. Work logs, cleaning reports and
 * reports are history the system keeps; an account with any of it is not
 * deleted, only deactivated.
 */
export async function countRecords(env: Env, id: string): Promise<number> {
  const row = await env.DB.prepare(
    `SELECT (SELECT COUNT(*) FROM work_logs        WHERE staff_id    = ?1)
          + (SELECT COUNT(*) FROM cleaning_reports WHERE staff_id    = ?1)
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

/** Removes the account and the area assignments that only exist for it. */
export async function remove(env: Env, id: string): Promise<void> {
  await env.DB.batch([
    env.DB.prepare(`DELETE FROM cleaning_assignments WHERE staff_id = ?`).bind(id),
    env.DB.prepare(`DELETE FROM users WHERE id = ?`).bind(id),
  ]);
}
