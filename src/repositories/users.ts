import type { Env } from '../env';
import type { Peran } from '../domain/types';

/** Cleaning staff have no username or password: they never sign in. */
export interface BarisPengguna {
  id: string;
  username: string | null;
  nama: string;
  peran: Peran;
  sandi_hash: string | null;
  sandi_salt: string | null;
  aktif: number;
}

export type AkunPengelola = Omit<BarisPengguna, 'sandi_hash' | 'sandi_salt'> & {
  created_at: string;
};

export async function cariDenganUsername(
  env: Env,
  username: string,
): Promise<BarisPengguna | null> {
  return env.DB.prepare(`SELECT * FROM pengguna WHERE username = ?`)
    .bind(username)
    .first<BarisPengguna>();
}

export async function usernameDipakai(env: Env, username: string): Promise<boolean> {
  const row = await env.DB.prepare(`SELECT id FROM pengguna WHERE username = ?`)
    .bind(username)
    .first();
  return Boolean(row);
}

export async function cariRingkas(
  env: Env,
  id: string,
): Promise<{ id: string; nama: string; username: string | null; peran: Peran } | null> {
  return env.DB.prepare(`SELECT id, nama, username, peran FROM pengguna WHERE id = ?`)
    .bind(id)
    .first<{ id: string; nama: string; username: string | null; peran: Peran }>();
}

/** Supervisors and staff. Reporter accounts are excluded: there may be thousands. */
export async function daftarPengelola(env: Env): Promise<AkunPengelola[]> {
  const rows = await env.DB.prepare(
    `SELECT id, username, nama, peran, aktif, created_at
       FROM pengguna WHERE peran IN ('spv', 'petugas')
      ORDER BY peran DESC, nama`,
  ).all<AkunPengelola>();
  return rows.results;
}

/** The names on the staff dropdown. */
export async function petugasAktif(env: Env): Promise<Array<{ id: string; nama: string }>> {
  const rows = await env.DB.prepare(
    `SELECT id, nama FROM pengguna WHERE peran = 'petugas' AND aktif = 1 ORDER BY nama`,
  ).all<{ id: string; nama: string }>();
  return rows.results;
}

/** One active staff member, so a name picked on the dropdown can be trusted to exist. */
export async function cariPetugasAktif(
  env: Env,
  id: string,
): Promise<{ id: string; nama: string } | null> {
  return env.DB.prepare(
    `SELECT id, nama FROM pengguna WHERE id = ? AND peran = 'petugas' AND aktif = 1`,
  )
    .bind(id)
    .first<{ id: string; nama: string }>();
}

export async function simpan(
  env: Env,
  data: {
    id: string;
    username: string | null;
    nama: string;
    peran: Peran;
    sandi_hash: string | null;
    sandi_salt: string | null;
  },
): Promise<void> {
  await env.DB.prepare(
    `INSERT INTO pengguna (id, username, nama, peran, sandi_hash, sandi_salt)
     VALUES (?, ?, ?, ?, ?, ?)`,
  )
    .bind(data.id, data.username, data.nama, data.peran, data.sandi_hash, data.sandi_salt)
    .run();
}

export async function perbarui(
  env: Env,
  id: string,
  set: string[],
  params: unknown[],
): Promise<void> {
  await env.DB.prepare(`UPDATE pengguna SET ${set.join(', ')} WHERE id = ?`)
    .bind(...params, id)
    .run();
}
