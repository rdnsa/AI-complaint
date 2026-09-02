import { ringkasHarian } from '../adapters/llm';
import { tanggalWIB } from '../adapters/clock';
import type { Env } from '../env';
import * as laporan from '../repositories/reports';
import * as ringkasan from '../repositories/summaries';
import { catat, SISTEM } from './activity-service';

export interface HasilRingkasan {
  tanggal: string;
  total_laporan: number;
  ringkasan: string;
  sorotan: string[];
}

/**
 * Writes (or rewrites) the summary for one day. Used both by the afternoon cron
 * and by the "rebuild" button on the dashboard.
 */
export async function buatRingkasanHarian(env: Env, tanggal: string): Promise<HasilRingkasan> {
  const daftar = await laporan.laporanPadaTanggal(env, tanggal);

  // A day with no reports does not need an LLM call.
  const hasil = daftar.length
    ? await ringkasHarian(env, tanggal, daftar)
    : { ringkasan: 'Tidak ada keluhan yang masuk pada hari ini.', sorotan: [] };

  await ringkasan.simpan(env, {
    tanggal,
    total: daftar.length,
    ringkasan: hasil.ringkasan,
    sorotan: hasil.sorotan,
  });

  await catat(env, {
    aksi: 'ringkasan',
    pelaku: SISTEM,
    ringkas: `Ringkasan harian ${tanggal} disusun dari ${daftar.length} laporan`,
  });

  return { tanggal, total_laporan: daftar.length, ...hasil };
}

export async function ringkasanTersimpan(env: Env, tanggal: string) {
  const baris = await ringkasan.cari(env, tanggal);
  if (!baris) return { tanggal, ada: false as const };
  return { ...baris, sorotan: baris.sorotan ? JSON.parse(baris.sorotan) : [], ada: true as const };
}

export async function statistikHarian(env: Env, tanggal: string) {
  return { tanggal, ...(await ringkasan.angkaHarian(env, tanggal)) };
}

/** Chart data, with empty days filled in so the line stays unbroken. */
export async function dataGrafik(env: Env, hari: number) {
  const angka = await ringkasan.angkaGrafik(env, hari);

  const peta = new Map(angka.harian.map((r) => [r.tanggal, r]));
  const deret: Array<{ tanggal: string; total: number; selesai: number }> = [];
  for (let i = hari - 1; i >= 0; i--) {
    const t = tanggalWIB(new Date(Date.now() - i * 86_400_000));
    const ada = peta.get(t);
    deret.push({ tanggal: t, total: Number(ada?.total ?? 0), selesai: Number(ada?.selesai ?? 0) });
  }

  return { ...angka, harian: deret };
}

export async function papanPeringkat(env: Env, pelaporId: string | null) {
  return {
    data: await ringkasan.peringkatPelapor(env),
    saya: pelaporId ? await ringkasan.posisiPelapor(env, pelaporId) : null,
  };
}
