import { periksaFotoBukti } from '../adapters/llm';
import { bacaFoto, hapusFoto } from '../adapters/storage';
import {
  bolehDiselesaikan,
  toDTO,
  urlFoto,
  type HasilBukti,
  type Kategori,
  type ReportDTO,
  type ReportRow,
  type Status,
  type VerifikasiBukti,
} from '../domain/types';
import type { Env } from '../env';
import * as lokasi from '../repositories/locations';
import * as laporan from '../repositories/reports';
import { catat, PELAPOR } from './activity-service';
import { jalankanAnalisis } from './analysis-service';

/**
 * The use cases around a report.
 *
 * Business rules live here rather than in the route handlers, so the same rule
 * holds no matter which entry point triggers it — an HTTP request today, a cron
 * job or an admin tool tomorrow.
 */

export type HasilKirim =
  | { jenis: 'ok'; id: string; toilet: string; duplikat: boolean }
  | { jenis: 'lokasi-tidak-dikenal' };

export async function kirimLaporan(
  env: Env,
  data: { toilet_id: string; teks: string; foto_key: string },
  pelapor: { id: string; nama: string } | null,
): Promise<HasilKirim> {
  const namaToilet = await lokasi.namaToiletAktif(env, data.toilet_id);
  if (!namaToilet) return { jenis: 'lokasi-tidak-dikenal' };

  const kembar = await laporan.cariKembar(env, data.toilet_id, data.teks);
  if (kembar) return { jenis: 'ok', id: kembar, toilet: namaToilet, duplikat: true };

  const id = crypto.randomUUID();
  await laporan.simpan(env, { id, ...data, pelapor_id: pelapor?.id ?? null });

  await catat(env, {
    aksi: 'lapor',
    report_id: id,
    pelaku: pelapor?.nama ?? PELAPOR,
    ringkas: `Laporan baru di ${namaToilet}`,
    rincian: { toilet_id: data.toilet_id, teks: data.teks },
  });

  return { jenis: 'ok', id, toilet: namaToilet, duplikat: false };
}

export async function satuLaporan(env: Env, id: string): Promise<ReportDTO | null> {
  const baris = await laporan.cariSatu(env, id);
  return baris ? toDTO(baris) : null;
}

export async function laporanDashboard(env: Env, filter: laporan.FilterLaporan) {
  return (await laporan.cariUntukDashboard(env, filter)).map(toDTO);
}

export async function laporanMilikPelapor(env: Env, pelaporId: string) {
  return (await laporan.cariMilikPelapor(env, pelaporId)).map(toDTO);
}

/**
 * The public board deliberately drops raw text, reporter photos, and staff
 * names; only the proof photo is exposed, because that is what makes the claim
 * "already handled" checkable by anyone.
 */
export async function papanPublik(env: Env, filter: laporan.FilterLaporan) {
  const { baris, jumlah } = await laporan.cariUntukPublik(env, filter);
  return {
    data: baris.map(({ foto_selesai_key, kategori, ...row }) => ({
      ...row,
      kategori: kategori ? (JSON.parse(kategori) as string[]) : [],
      foto_selesai_url: urlFoto(foto_selesai_key),
    })),
    jumlah,
  };
}

export type HasilUbahStatus =
  | { jenis: 'ok'; status: Status; verifikasi: VerifikasiBukti | null }
  | { jenis: 'tidak-ditemukan' }
  | { jenis: 'foto-tidak-ditemukan' }
  | { jenis: 'bukti-kurang' }
  | { jenis: 'bukti-ditolak'; hasil: Exclude<HasilBukti, 'bersih'>; alasan: string }
  | { jenis: 'verifikasi-gagal'; pesan: string };

type BuktiTersimpan = { key: string; verifikasi: VerifikasiBukti } | null;

/** The proof already on the report, if it was ever verified. */
function buktiLama(baris: ReportRow): BuktiTersimpan {
  if (!baris.foto_selesai_key || !baris.bukti_ai_hasil) return null;
  return {
    key: baris.foto_selesai_key,
    verifikasi: {
      hasil: baris.bukti_ai_hasil,
      alasan: baris.bukti_ai_alasan ?? '',
      model: baris.bukti_ai_model ?? '',
      ms: baris.bukti_ai_ms ?? 0,
    },
  };
}

type HasilPeriksa =
  | { jenis: 'diterima'; bukti: NonNullable<BuktiTersimpan> }
  | Extract<HasilUbahStatus, { jenis: 'foto-tidak-ditemukan' | 'bukti-ditolak' | 'verifikasi-gagal' }>;

/**
 * Runs the vision check on a freshly uploaded proof photo.
 *
 * A photo that does not pass is deleted again: the bucket only ever holds
 * proof that passed, and the verdict survives in the activity log. A failure
 * of the checker itself is reported separately so staff know to retry rather
 * than to re-clean; the retry uploads a fresh copy, so that photo goes too.
 */
async function periksaBuktiBaru(
  env: Env,
  baris: ReportRow,
  key: string,
  petugas: string,
): Promise<HasilPeriksa> {
  const foto = await bacaFoto(env, key);
  if (!foto) return { jenis: 'foto-tidak-ditemukan' };

  const mulai = Date.now();
  let putusan;
  try {
    putusan = await periksaFotoBukti(env, foto, {
      lokasi: baris.toilet_nama ?? baris.toilet_id,
      keluhan: baris.teks,
      kategori: baris.kategori ? (JSON.parse(baris.kategori) as Kategori[]) : [],
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`Verifikasi bukti gagal untuk laporan ${baris.id}: ${pesan}`);
    await hapusFoto(env, key);
    await catat(env, {
      aksi: 'verifikasi_gagal',
      report_id: baris.id,
      pelaku: petugas,
      ringkas: `Pemeriksaan foto bukti gagal di ${baris.toilet_nama}`,
      rincian: { error: pesan.slice(0, 300), model: env.VISION_MODEL },
    });
    return { jenis: 'verifikasi-gagal', pesan };
  }
  const ms = Date.now() - mulai;

  if (putusan.hasil !== 'bersih') {
    await hapusFoto(env, key);
    await catat(env, {
      aksi: 'bukti_ditolak',
      report_id: baris.id,
      pelaku: petugas,
      ringkas: `Foto bukti ditolak (${putusan.hasil}) di ${baris.toilet_nama}: ${putusan.alasan}`,
      rincian: {
        hasil: putusan.hasil,
        alasan: putusan.alasan,
        keyakinan: putusan.keyakinan,
        model: env.VISION_MODEL,
        ms,
      },
    });
    return { jenis: 'bukti-ditolak', hasil: putusan.hasil, alasan: putusan.alasan };
  }

  return {
    jenis: 'diterima',
    bukti: {
      key,
      verifikasi: { hasil: 'bersih', alasan: putusan.alasan, model: env.VISION_MODEL, ms },
    },
  };
}

export async function ubahStatus(
  env: Env,
  id: string,
  status: Status,
  petugas: string,
  fotoBuktiBaru: string | null,
): Promise<HasilUbahStatus> {
  const sebelum = await laporan.cariSatu(env, id);
  if (!sebelum) return { jenis: 'tidak-ditemukan' };

  // A new photo must pass the vision check before anything else changes.
  let bukti = buktiLama(sebelum);
  if (fotoBuktiBaru) {
    const periksa = await periksaBuktiBaru(env, sebelum, fotoBuktiBaru, petugas);
    if (periksa.jenis !== 'diterima') return periksa;
    bukti = periksa.bukti;
  }

  if (!bolehDiselesaikan(status, bukti?.key ?? null, bukti?.verifikasi.hasil ?? null)) {
    return { jenis: 'bukti-kurang' };
  }

  await laporan.ubahStatus(env, id, status, petugas, bukti);

  await catat(env, {
    aksi: 'status',
    report_id: id,
    pelaku: petugas,
    ringkas: `Status ${sebelum.status} → ${status} di ${sebelum.toilet_nama}`,
    rincian: {
      dari: sebelum.status,
      ke: status,
      foto_bukti: bukti?.key ?? null,
      verifikasi: bukti?.verifikasi ?? null,
    },
  });

  return { jenis: 'ok', status, verifikasi: bukti?.verifikasi ?? null };
}

export async function mintaAnalisisUlang(env: Env, id: string): Promise<boolean> {
  const ada = await laporan.cariSatu(env, id);
  if (!ada) return false;
  await laporan.tandaiMenungguAnalisis(env, id);
  return true;
}

/**
 * Deleting is the only action that destroys data, so the full report is copied
 * into the activity log first. That copy is what lets management inspect a
 * report that disappeared, along with who removed it.
 */
export async function hapusLaporan(env: Env, id: string, petugas: string): Promise<boolean> {
  const baris = await laporan.cariSatu(env, id);
  if (!baris) return false;

  await catat(env, {
    aksi: 'hapus',
    report_id: id,
    pelaku: petugas,
    ringkas: `Menghapus laporan di ${baris.toilet_nama}`,
    rincian: {
      toilet_nama: baris.toilet_nama,
      teks: baris.teks,
      status: baris.status,
      prioritas: baris.prioritas,
      kategori: baris.kategori,
      ringkasan: baris.ringkasan,
      dibuat: baris.created_at,
      ada_foto: Boolean(baris.foto_key),
    },
  });

  await laporan.hapus(env, id);
  await hapusFoto(env, baris.foto_key, baris.foto_selesai_key);
  return true;
}

export { jalankanAnalisis };
