import { periksaFotoBukti } from '../adapters/llm';
import { bacaFoto, FOLDER, hapusFoto } from '../adapters/storage';
import { pekerjaanKeDTO, type HasilBukti, type VerifikasiBukti } from '../domain/types';
import type { Env } from '../env';
import * as lokasi from '../repositories/locations';
import * as pekerjaan from '../repositories/pekerjaan';
import { catat } from './activity-service';

/**
 * Staff work reports: "I cleaned this toilet".
 *
 * The flow mirrors a student report (floor QR → pick the toilet → describe →
 * photograph), but the photo is judged by the vision model before anything is
 * stored, exactly like the proof photo that closes a complaint. A work report
 * that claims a clean toilet must show one.
 */

export type HasilKirimPekerjaan =
  | { jenis: 'ok'; id: string; toilet: string; duplikat: boolean; verifikasi: VerifikasiBukti | null }
  | { jenis: 'lokasi-tidak-dikenal' }
  | { jenis: 'foto-tidak-ditemukan' }
  | { jenis: 'bukti-ditolak'; hasil: Exclude<HasilBukti, 'bersih'>; alasan: string }
  | { jenis: 'verifikasi-gagal'; pesan: string };

export async function kirimPekerjaan(
  env: Env,
  data: { toilet_id: string; teks: string; foto_key: string },
  petugas: { id: string; nama: string },
): Promise<HasilKirimPekerjaan> {
  const namaToilet = await lokasi.namaToiletAktif(env, data.toilet_id);
  if (!namaToilet) {
    await hapusFoto(env, data.foto_key);
    return { jenis: 'lokasi-tidak-dikenal' };
  }

  // A double-tapped send uploads a second photo; drop it and answer with the first report.
  const kembar = await pekerjaan.cariKembar(env, petugas.id, data.toilet_id, data.teks);
  if (kembar) {
    await hapusFoto(env, data.foto_key);
    return { jenis: 'ok', id: kembar, toilet: namaToilet, duplikat: true, verifikasi: null };
  }

  // Only a photo uploaded for a work report counts; a student's condition photo does not.
  const foto = data.foto_key.startsWith(`${FOLDER.kerja}/`) ? await bacaFoto(env, data.foto_key) : null;
  if (!foto) return { jenis: 'foto-tidak-ditemukan' };

  const mulai = Date.now();
  let putusan;
  try {
    putusan = await periksaFotoBukti(env, foto, {
      lokasi: namaToilet,
      keluhan: `(Tidak ada keluhan: ini laporan pembersihan rutin.) Catatan petugas: ${data.teks}`,
      kategori: [],
    });
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`Verifikasi foto pekerjaan gagal di ${data.toilet_id}: ${pesan}`);
    await hapusFoto(env, data.foto_key);
    await catat(env, {
      aksi: 'verifikasi_gagal',
      pelaku: petugas.nama,
      ringkas: `Pemeriksaan foto laporan pekerjaan gagal di ${namaToilet}`,
      rincian: { error: pesan.slice(0, 300), model: env.VISION_MODEL },
    });
    return { jenis: 'verifikasi-gagal', pesan };
  }
  const ms = Date.now() - mulai;

  if (putusan.hasil !== 'bersih') {
    await hapusFoto(env, data.foto_key);
    await catat(env, {
      aksi: 'bukti_ditolak',
      pelaku: petugas.nama,
      ringkas: `Foto laporan pekerjaan ditolak (${putusan.hasil}) di ${namaToilet}: ${putusan.alasan}`,
      rincian: {
        hasil: putusan.hasil,
        alasan: putusan.alasan,
        keyakinan: putusan.keyakinan,
        teks: data.teks,
        model: env.VISION_MODEL,
        ms,
      },
    });
    return { jenis: 'bukti-ditolak', hasil: putusan.hasil, alasan: putusan.alasan };
  }

  const verifikasi: VerifikasiBukti = {
    hasil: 'bersih',
    alasan: putusan.alasan,
    model: env.VISION_MODEL,
    ms,
  };
  const id = crypto.randomUUID();
  await pekerjaan.simpan(env, {
    id,
    ...data,
    petugas_id: petugas.id,
    petugas: petugas.nama,
    verifikasi,
  });

  await catat(env, {
    aksi: 'kerja',
    pelaku: petugas.nama,
    ringkas: `Membersihkan ${namaToilet}`,
    rincian: { pekerjaan_id: id, toilet_id: data.toilet_id, teks: data.teks, verifikasi },
  });

  return { jenis: 'ok', id, toilet: namaToilet, duplikat: false, verifikasi };
}

export async function daftarPekerjaan(env: Env, filter: pekerjaan.FilterPekerjaan) {
  return (await pekerjaan.cari(env, filter)).map(pekerjaanKeDTO);
}
