import { catat, SISTEM } from './aktivitas';
import { ringkasHarian } from './llm';
import { rentangHariWIB } from './waktu';
import type { Env } from '../types';

export interface HasilRingkasan {
  tanggal: string;
  total_laporan: number;
  ringkasan: string;
  sorotan: string[];
}

/**
 * Membuat (atau memperbarui) ringkasan satu hari. Dipakai oleh cron sore hari
 * dan oleh tombol "buat ulang" di dashboard.
 */
export async function buatRingkasanHarian(env: Env, tanggal: string): Promise<HasilRingkasan> {
  const { mulai, selesai } = rentangHariWIB(tanggal);

  const rows = await env.DB.prepare(
    `SELECT t.nama AS lokasi, r.prioritas, r.ringkasan, r.teks
       FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
      WHERE r.created_at >= ? AND r.created_at < ?
      ORDER BY r.created_at`,
  )
    .bind(mulai, selesai)
    .all<{ lokasi: string; prioritas: string | null; ringkasan: string | null; teks: string }>();

  const laporan = rows.results;

  // Hari tanpa laporan tidak perlu memanggil LLM.
  const hasil = laporan.length
    ? await ringkasHarian(env, tanggal, laporan)
    : { ringkasan: 'Tidak ada keluhan yang masuk pada hari ini.', sorotan: [] };

  await env.DB.prepare(
    `INSERT INTO daily_summaries (tanggal, total_laporan, ringkasan, sorotan)
     VALUES (?, ?, ?, ?)
     ON CONFLICT(tanggal) DO UPDATE SET
       total_laporan = excluded.total_laporan,
       ringkasan     = excluded.ringkasan,
       sorotan       = excluded.sorotan,
       created_at    = datetime('now')`,
  )
    .bind(tanggal, laporan.length, hasil.ringkasan, JSON.stringify(hasil.sorotan))
    .run();

  await catat(env, {
    aksi: 'ringkasan',
    pelaku: SISTEM,
    ringkas: `Ringkasan harian ${tanggal} disusun dari ${laporan.length} laporan`,
  });

  return { tanggal, total_laporan: laporan.length, ...hasil };
}
