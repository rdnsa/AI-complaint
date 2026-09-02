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

/** The run of dates the charts cover, oldest first. */
function deretTanggal(hari: number): string[] {
  return Array.from({ length: hari }, (_, i) =>
    tanggalWIB(new Date(Date.now() - (hari - 1 - i) * 86_400_000)),
  );
}

/**
 * Chart data.
 *
 * Empty days are filled with zeros rather than skipped: a gap in the series
 * would read as missing data, while a zero reads as "nothing was reported",
 * which is the truth.
 */
export async function dataGrafik(env: Env, hari: number) {
  const [angka, lanjutan] = await Promise.all([
    ringkasan.angkaGrafik(env, hari),
    ringkasan.angkaLanjutan(env, hari),
  ]);

  const tanggalDeret = deretTanggal(hari);

  const petaHarian = new Map(angka.harian.map((r) => [r.tanggal, r]));
  const harian = tanggalDeret.map((tanggal) => {
    const ada = petaHarian.get(tanggal);
    return { tanggal, total: Number(ada?.total ?? 0), selesai: Number(ada?.selesai ?? 0) };
  });

  const petaPrioritas = new Map<string, Record<string, number>>();
  for (const r of lanjutan.harianPrioritas) {
    const hari = petaPrioritas.get(r.tanggal) ?? {};
    hari[r.prioritas] = Number(r.jumlah);
    petaPrioritas.set(r.tanggal, hari);
  }
  const harianPrioritas = tanggalDeret.map((tanggal) => {
    const h = petaPrioritas.get(tanggal) ?? {};
    return {
      tanggal,
      tinggi: h.tinggi ?? 0,
      sedang: h.sedang ?? 0,
      rendah: h.rendah ?? 0,
    };
  });

  const tren = lanjutan.tren;
  const ini = Number(tren.periode_ini ?? 0);
  const lalu = Number(tren.periode_lalu ?? 0);

  return {
    ...angka,
    harian,
    harianPrioritas,
    jamHari: lanjutan.jamHari,
    matriks: lanjutan.matriks,
    waktuPrioritas: lanjutan.waktuPrioritas,
    tren: {
      hari,
      laporan: ini,
      laporan_lalu: lalu,
      // A previous window of zero has no meaningful percentage change.
      perubahan: lalu > 0 ? Math.round(((ini - lalu) / lalu) * 100) : null,
      selesai: Number(tren.selesai_ini ?? 0),
      tinggi: Number(tren.tinggi_ini ?? 0),
    },
  };
}

export async function papanPeringkat(env: Env, pelaporId: string | null) {
  return {
    data: await ringkasan.peringkatPelapor(env),
    saya: pelaporId ? await ringkasan.posisiPelapor(env, pelaporId) : null,
  };
}
