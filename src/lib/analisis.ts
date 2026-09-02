import { catat, SISTEM } from './aktivitas';
import { analisaKeluhan } from './llm';
import type { Env } from '../types';

/**
 * Analyses one report and stores the result.
 *
 * Invoked through `ctx.waitUntil()` after the response has been sent, so the
 * student never waits on the LLM. This function deliberately never throws:
 * a failure is recorded as ai_status='gagal' so the report still shows up on
 * the dashboard (without AI labels) and staff can retry it by hand.
 */
export async function jalankanAnalisis(env: Env, reportId: string): Promise<void> {
  const row = await env.DB.prepare(
    `SELECT r.teks, t.nama AS lokasi
       FROM reports r JOIN toilet_info t ON t.id = r.toilet_id
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

    await catat(env, {
      aksi: 'analisis',
      report_id: reportId,
      pelaku: SISTEM,
      ringkas: `Analisis selesai: prioritas ${hasil.prioritas} (${Date.now() - mulai} ms)`,
      rincian: { kategori: hasil.kategori, prioritas: hasil.prioritas, model: env.LLM_MODEL },
    });
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

    await catat(env, {
      aksi: 'analisis_gagal',
      report_id: reportId,
      pelaku: SISTEM,
      ringkas: 'Analisis otomatis gagal',
      rincian: { error: pesan.slice(0, 300) },
    });
  }
}
