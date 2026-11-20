import { createSalt, hashPassword, verifyPassword } from '../adapters/password';
import { forget, memo } from '../adapters/memo';
import type { Role } from '../domain/types';
import type { Env } from '../env';
import * as users from '../repositories/users';
import { log } from './activity-service';

export interface Identity {
  id: string;
  name: string;
  role: Role;
}

export type LoginResult = { kind: 'ok'; identity: Identity } | { kind: 'failed' };

/**
 * Verifies credentials.
 *
 * An unknown account and a wrong password return the same result on purpose, so
 * the caller cannot phrase two different messages and turn the sign-in page
 * into a way of discovering which usernames exist.
 */
export async function login(env: Env, username: string, password: string): Promise<LoginResult> {
  const account = await users.findByUsername(env, username);
  if (!account || !account.active) return { kind: 'failed' };
  if (!account.password_hash || !account.password_salt) return { kind: 'failed' };
  if (!(await verifyPassword(password, account.password_salt, account.password_hash))) {
    return { kind: 'failed' };
  }

  const identity = { id: account.id, name: account.name, role: account.role };
  if (account.role === 'supervisor') {
    await log(env, {
      action: 'login',
      actor: account.name,
      summary: `${account.name} (supervisor) masuk ke dashboard`,
    });
  }
  return { kind: 'ok', identity };
}

export type CreateResult = { kind: 'ok'; identity: Identity } | { kind: 'username-taken' };

async function createAccount(
  env: Env,
  data: { username: string; name: string; password: string; role: Role },
): Promise<CreateResult> {
  if (await users.usernameTaken(env, data.username)) return { kind: 'username-taken' };

  const salt = createSalt();
  const id = crypto.randomUUID();
  await users.insert(env, {
    id,
    username: data.username,
    name: data.name,
    role: data.role,
    password_hash: await hashPassword(data.password, salt),
    password_salt: salt,
  });

  return { kind: 'ok', identity: { id, name: data.name, role: data.role } };
}

/** Self-registration only ever creates a reporter. */
export function registerReporter(
  env: Env,
  data: { username: string; name: string; password: string },
) {
  return createAccount(env, { ...data, role: 'reporter' });
}

/** Every new staff account starts with this password; the supervisor can change it per person. */
export const DEFAULT_STAFF_PASSWORD = '123456';

/**
 * A staff member's sign-in: their first name at upi.edu (gilang@upi.edu), with a
 * number after it when that name is already taken (muhammad2@upi.edu). Migration
 * 0016 gave the existing staff theirs the same way.
 */
async function staffUsername(env: Env, name: string): Promise<string> {
  const first = name.trim().split(/\s+/)[0].toLowerCase().replace(/[^a-z0-9]/g, '') || 'petugas';
  const taken = await users.usernamesLike(env, first, '@upi.edu');
  for (let n = 1; ; n++) {
    const username = `${first}${n > 1 ? n : ''}@upi.edu`;
    if (!taken.has(username)) return username;
  }
}

/** A staff account: the username comes from the name, the password starts as the default. */
export async function addStaff(
  env: Env,
  name: string,
  supervisor: string,
): Promise<Identity & { username: string }> {
  // Two staff with the same first name added at the same moment can both be offered the
  // same free username; the loser of that race (the UNIQUE index) simply takes the next one.
  let attempt = 0;
  let username: string;
  let result: CreateResult;
  for (;;) {
    username = await staffUsername(env, name);
    try {
      result = await createAccount(env, { username, name, password: DEFAULT_STAFF_PASSWORD, role: 'staff' });
    } catch (err) {
      if (++attempt < 5 && String(err).includes('UNIQUE')) continue;
      throw err;
    }
    if (result.kind === 'ok') break;
    if (++attempt >= 5) throw new Error(`no free username for ${name}`);
  }
  forgetStaff();
  await log(env, { action: 'user_changed', actor: supervisor, summary: `Menambah petugas ${name} (${username})` });
  return { ...result.identity, username };
}

/** Another supervisor, who signs in like the first. */
export async function addSupervisor(
  env: Env,
  data: { username: string; name: string; password: string },
  supervisor: string,
): Promise<CreateResult> {
  const result = await createAccount(env, { ...data, role: 'supervisor' });
  if (result.kind === 'ok') {
    await log(env, {
      action: 'user_changed',
      actor: supervisor,
      summary: `Menambah akun supervisor ${data.name} (${data.username})`,
    });
  }
  return result;
}

export function listManaged(env: Env) {
  return users.listManaged(env);
}

/** Staff names appear on the dropdown. */
function forgetStaff() {
  forget('staff');
}

/** The active staff list; dropped whenever an account changes. */
export function activeStaff(env: Env) {
  return memo('staff', 60_000, () => users.activeStaff(env));
}

export function findActiveStaff(env: Env, id: string) {
  return users.findActiveStaff(env, id);
}

export type UpdateResult =
  | { kind: 'ok' }
  | { kind: 'not-found' }
  | { kind: 'self-lockout' }
  | { kind: 'password-too-short' };

export async function updateAccount(
  env: Env,
  id: string,
  changes: { name?: string; password?: string; active?: boolean },
  supervisor: Identity,
): Promise<UpdateResult> {
  const target = await users.findBrief(env, id);
  if (!target) return { kind: 'not-found' };

  // Deactivating your own account would lock the supervisor out of their own system.
  if (changes.active === false && id === supervisor.id) return { kind: 'self-lockout' };
  // Staff may keep a short password like the default; supervisor accounts guard the whole dashboard.
  if (changes.password !== undefined && target.role !== 'staff' && changes.password.length < 8) {
    return { kind: 'password-too-short' };
  }

  const set: string[] = [];
  const params: unknown[] = [];
  // Human-readable labels for the activity-log sentence, hence Indonesian.
  const changed: string[] = [];

  if (changes.name !== undefined) {
    set.push('name = ?');
    params.push(changes.name);
    changed.push('nama');
  }
  if (changes.password !== undefined) {
    // The salt is replaced too, so the old and new passwords share no derivation.
    const salt = createSalt();
    set.push('password_hash = ?', 'password_salt = ?');
    params.push(await hashPassword(changes.password, salt), salt);
    changed.push('password');
  }
  if (changes.active !== undefined) {
    set.push('active = ?');
    params.push(changes.active ? 1 : 0);
    changed.push(changes.active ? 'diaktifkan' : 'dinonaktifkan');
  }

  await users.update(env, id, set, params);
  forgetStaff();
  await log(env, {
    action: 'user_changed',
    actor: supervisor.name,
    summary: `Mengubah ${target.role === 'staff' ? 'petugas' : 'akun'} ${target.username ?? target.name}: ${changed.join(', ')}`,
  });

  return { kind: 'ok' };
}

export type DeleteResult =
  | { kind: 'ok' }
  | { kind: 'not-found' }
  | { kind: 'self' }
  | { kind: 'last-supervisor' }
  | { kind: 'has-records'; records: number };

/**
 * Deletes a staff name or a supervisor account.
 *
 * An account that already has work behind it (cleaning reports, reports) is refused: removing it would orphan that history or erase it, and
 * the supervisor can deactivate it instead, which hides the name just as well.
 * The activity log keeps naming the person in plain text either way.
 */
export async function deleteAccount(env: Env, id: string, supervisor: Identity): Promise<DeleteResult> {
  const target = await users.findBrief(env, id);
  // Reporters are not managed here; they never appear in this list.
  if (!target || target.role === 'reporter') return { kind: 'not-found' };
  if (id === supervisor.id) return { kind: 'self' };
  if (target.role === 'supervisor' && (await users.otherActiveSupervisors(env, id)) === 0) {
    return { kind: 'last-supervisor' };
  }

  const records = await users.countRecords(env, id);
  if (records > 0) return { kind: 'has-records', records };

  await users.remove(env, id);
  forgetStaff();
  await log(env, {
    action: 'user_changed',
    actor: supervisor.name,
    summary: `Menghapus ${target.role === 'staff' ? 'petugas' : 'akun'} ${target.username ?? target.name}`,
  });
  return { kind: 'ok' };
}

/** A staff member's placement and duties, for the editor on the accounts tab. */
export function dutiesOf(env: Env, id: string) {
  return users.dutiesOf(env, id);
}

/**
 * Saves a staff member's placement and duties. The list's length is their daily
 * target on the dashboard, so the cleaning charts are dropped with it.
 */
export async function saveDuties(
  env: Env,
  id: string,
  data: users.StaffDuties,
  supervisor: string,
): Promise<'ok' | 'not-found'> {
  const current = await users.dutiesOf(env, id);
  if (!current) return 'not-found';
  await users.replaceDuties(env, id, data);
  forget('cleaning-charts');
  await log(env, {
    action: 'user_changed',
    actor: supervisor,
    summary: `Mengubah uraian tugas petugas (${data.duties.length} tugas, ${data.areas.length} area)`,
  });
  return 'ok';
}

/** An active staff member's placement letter, for their own daily round; null when not an active staff member. */
export async function activeStaffDuties(env: Env, id: string) {
  if (!(await users.findActiveStaff(env, id))) return null;
  return users.dutiesOf(env, id);
}
