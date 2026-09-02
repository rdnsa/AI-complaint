import { analisaKeluhan } from './llm';
import type { Env } from '../types';

/**
 * Menganalisis satu laporan lalu menyimpan hasilnya.
 *
 * Dipanggil lewat `ctx.waitUntil()` sesudah respons dikirim, sehingga mahasiswa
 * tidak menunggu panggilan LLM. Fungsi ini sengaja tidak pernah melempar error:
 * kegagalan dicatat sebagai ai_status='gagal' agar laporannya tetap muncul di
 * dashboard (tanpa label AI) dan bisa di-retry manual oleh petugas.
 */
export async function jalankanAnalisis(env: Env, reportId: string): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT r.teks, t.nama AS lokasi
       FROM reports r JOIN toilets t ON t.id = r.toilet_id
      WHERE r.id = ?`,
  )
    .bind(reportId)
    .first<{ teks: string; lokasi: string }>();

  if (!row) return;

  const mulai = Date.now();
  try {
    const hasil = await analisaKeluhan(env, row.teks, row.lokasi);
    await env.DB.prepare(
      `UPDATE reports
          SET ai_status = 'ok', kategori = ?, prioritas = ?, ringkasan = ?,
              rekomendasi = ?, ai_error = NULL, ai_model = ?, ai_ms = ?,
              updated_at = datetime('now')
        WHERE id = ?`,
    )
      .bind(
        JSON.stringify(hasil.kategori),
        hasil.prioritas,
        hasil.ringkasan,
        hasil.rekomendasi,
        env.LLM_MODEL,
        Date.now() - mulai,
        reportId,
      )
      .run();
  } catch (err) {
    const pesan = err instanceof Error ? err.message : String(err);
    console.error(`Analisis gagal untuk laporan ${reportId}: ${pesan}`);
    await env.DB.prepare(
      `UPDATE reports
          SET ai_status = 'gagal', ai_error = ?, ai_ms = ?, updated_at = datetime('now')
        WHERE id = ?`,
    )
      .bind(pesan.slice(0, 500), Date.now() - mulai, reportId)
      .run();
  }
}
