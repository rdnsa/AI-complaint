import { buatSalt, cocok, hitungHash } from '../adapters/password';
import type { Peran } from '../domain/types';
import type { Env } from '../env';
import * as pengguna from '../repositories/users';
import { catat } from './activity-service';

export interface Identitas {
  id: string;
  nama: string;
  peran: Peran;
}

export type HasilMasuk = { jenis: 'ok'; identitas: Identitas } | { jenis: 'gagal' };

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
export async function masuk(env: Env, username: string, password: string): Promise<HasilMasuk> {
  const akun = await pengguna.cariDenganUsername(env, username);
  if (!akun || !akun.aktif || akun.peran === 'petugas') return { jenis: 'gagal' };
  if (!akun.sandi_hash || !akun.sandi_salt) return { jenis: 'gagal' };
  if (!(await cocok(password, akun.sandi_salt, akun.sandi_hash))) return { jenis: 'gagal' };

  const identitas = { id: akun.id, nama: akun.nama, peran: akun.peran };
  if (akun.peran === 'spv') {
    await catat(env, {
      aksi: 'masuk',
      pelaku: akun.nama,
      ringkas: `${akun.nama} (SPV) masuk ke dashboard`,
    });
  }
  return { jenis: 'ok', identitas };
}

export type HasilBuat = { jenis: 'ok'; identitas: Identitas } | { jenis: 'username-dipakai' };

async function buatAkun(
  env: Env,
  data: { username: string; nama: string; password: string; peran: Exclude<Peran, 'petugas'> },
): Promise<HasilBuat> {
  if (await pengguna.usernameDipakai(env, data.username)) return { jenis: 'username-dipakai' };

  const salt = buatSalt();
  const id = crypto.randomUUID();
  await pengguna.simpan(env, {
    id,
    username: data.username,
    nama: data.nama,
    peran: data.peran,
    sandi_hash: await hitungHash(data.password, salt),
    sandi_salt: salt,
  });

  return { jenis: 'ok', identitas: { id, nama: data.nama, peran: data.peran } };
}

/** Self-registration only ever creates a reporter. */
export function daftarPelapor(env: Env, data: { username: string; nama: string; password: string }) {
  return buatAkun(env, { ...data, peran: 'pelapor' });
}

/** A staff member is only a name on the dropdown: no username, no password. */
export async function tambahPetugas(env: Env, nama: string, spv: string): Promise<Identitas> {
  const id = crypto.randomUUID();
  await pengguna.simpan(env, {
    id,
    username: null,
    nama,
    peran: 'petugas',
    sandi_hash: null,
    sandi_salt: null,
  });
  await catat(env, { aksi: 'pengguna', pelaku: spv, ringkas: `Menambah petugas ${nama}` });
  return { id, nama, peran: 'petugas' };
}

/** Another supervisor, who signs in like the first. */
export async function tambahSpv(
  env: Env,
  data: { username: string; nama: string; password: string },
  spv: string,
): Promise<HasilBuat> {
  const hasil = await buatAkun(env, { ...data, peran: 'spv' });
  if (hasil.jenis === 'ok') {
    await catat(env, {
      aksi: 'pengguna',
      pelaku: spv,
      ringkas: `Menambah akun SPV ${data.nama} (${data.username})`,
    });
  }
  return hasil;
}

export function daftarPengelola(env: Env) {
  return pengguna.daftarPengelola(env);
}

export function petugasAktif(env: Env) {
  return pengguna.petugasAktif(env);
}

export function cariPetugasAktif(env: Env, id: string) {
  return pengguna.cariPetugasAktif(env, id);
}

export type HasilUbah =
  | { jenis: 'ok' }
  | { jenis: 'tidak-ditemukan' }
  | { jenis: 'kunci-diri-sendiri' }
  | { jenis: 'petugas-tanpa-sandi' };

export async function ubahAkun(
  env: Env,
  id: string,
  perubahan: { nama?: string; password?: string; aktif?: boolean },
  spv: Identitas,
): Promise<HasilUbah> {
  const target = await pengguna.cariRingkas(env, id);
  if (!target) return { jenis: 'tidak-ditemukan' };

  // Deactivating your own account would lock the supervisor out of their own system.
  if (perubahan.aktif === false && id === spv.id) return { jenis: 'kunci-diri-sendiri' };
  if (perubahan.password !== undefined && target.peran === 'petugas') {
    return { jenis: 'petugas-tanpa-sandi' };
  }

  const set: string[] = [];
  const params: unknown[] = [];
  const diubah: string[] = [];

  if (perubahan.nama !== undefined) {
    set.push('nama = ?');
    params.push(perubahan.nama);
    diubah.push('nama');
  }
  if (perubahan.password !== undefined) {
    // The salt is replaced too, so the old and new passwords share no derivation.
    const salt = buatSalt();
    set.push('sandi_hash = ?', 'sandi_salt = ?');
    params.push(await hitungHash(perubahan.password, salt), salt);
    diubah.push('password');
  }
  if (perubahan.aktif !== undefined) {
    set.push('aktif = ?');
    params.push(perubahan.aktif ? 1 : 0);
    diubah.push(perubahan.aktif ? 'diaktifkan' : 'dinonaktifkan');
  }

  await pengguna.perbarui(env, id, set, params);
  await catat(env, {
    aksi: 'pengguna',
    pelaku: spv.nama,
    ringkas: `Mengubah ${target.peran === 'petugas' ? 'petugas' : 'akun'} ${target.username ?? target.nama}: ${diubah.join(', ')}`,
  });

  return { jenis: 'ok' };
}
