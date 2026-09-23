import { createSalt, hashPassword, verifyPassword } from '../adapters/password';
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
 *
 * Cleaning staff are refused even when an old account still carries a
 * password: they work without signing in, and a staff session would otherwise
 * be a way into nothing but confusion.
 */
export async function login(env: Env, username: string, password: string): Promise<LoginResult> {
  const account = await users.findByUsername(env, username);
  if (!account || !account.active || account.role === 'staff') return { kind: 'failed' };
  if (!account.password_hash || !account.password_salt) return { kind: 'failed' };
  if (!(await verifyPassword(password, account.password_salt, account.password_hash))) {
    return { kind: 'failed' };
  }

  const identity = { id: account.id, name: account.name, role: account.role };
  if (account.role === 'supervisor') {
    await log(env, {
      action: 'login',
      actor: account.name,
      summary: `${account.name} (SPV) masuk ke dashboard`,
    });
  }
  return { kind: 'ok', identity };
}

export type CreateResult = { kind: 'ok'; identity: Identity } | { kind: 'username-taken' };

async function createAccount(
  env: Env,
  data: { username: string; name: string; password: string; role: Exclude<Role, 'staff'> },
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

/** A staff member is only a name on the dropdown: no username, no password. */
export async function addStaff(env: Env, name: string, supervisor: string): Promise<Identity> {
  const id = crypto.randomUUID();
  await users.insert(env, {
    id,
    username: null,
    name,
    role: 'staff',
    password_hash: null,
    password_salt: null,
  });
  await log(env, { action: 'user_changed', actor: supervisor, summary: `Menambah petugas ${name}` });
  return { id, name, role: 'staff' };
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
      summary: `Menambah akun SPV ${data.name} (${data.username})`,
    });
  }
  return result;
}

export function listManaged(env: Env) {
  return users.listManaged(env);
}

export function activeStaff(env: Env) {
  return users.activeStaff(env);
}

export function findActiveStaff(env: Env, id: string) {
  return users.findActiveStaff(env, id);
}

export type UpdateResult =
  | { kind: 'ok' }
  | { kind: 'not-found' }
  | { kind: 'self-lockout' }
  | { kind: 'staff-without-password' };

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
  if (changes.password !== undefined && target.role === 'staff') {
    return { kind: 'staff-without-password' };
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
  await log(env, {
    action: 'user_changed',
    actor: supervisor.name,
    summary: `Mengubah ${target.role === 'staff' ? 'petugas' : 'akun'} ${target.username ?? target.name}: ${changed.join(', ')}`,
  });

  return { kind: 'ok' };
}
