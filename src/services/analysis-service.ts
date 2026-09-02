import { analisaKeluhan } from '../adapters/llm';
import type { Env } from '../env';
import * as laporan from '../repositories/reports';
import { catat, SISTEM } from './activity-service';

/**
 * Analyses one report and stores the result.
 *
 * Invoked through `ctx.waitUntil()` after the response has been sent, so the
 * student never waits on the LLM. This function deliberately never throws:
 * a failure is recorded as ai_status='gagal' so the report still shows up on
 * the dashboard (without AI labels) and staff can retry it by hand.
 */
export async function jalankanAnalisis(env: Env, reportId: string): Promise<void> {
  const baris = await laporan.ambilUntukAnalisis(env, reportId);
  if (!baris) return;

  const mulai = Date.now();
  try {
    const hasil = await analisaKeluhan(env, baris.teks, baris.lokasi);
    await laporan.simpanHasilAnalisis(env, reportId, {
      ...hasil,
      model: env.LLM_MODEL,
      ms: Date.now() - mulai,
    });

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
    await laporan.simpanGagalAnalisis(env, reportId, pesan, Date.now() - mulai);

    await catat(env, {
      aksi: 'analisis_gagal',
      report_id: reportId,
      pelaku: SISTEM,
      ringkas: 'Analisis otomatis gagal',
      rincian: { error: pesan.slice(0, 300) },
    });
  }
}

/** Staff retry: clears the previous failure, then re-runs the analysis. */
export async function ulangiAnalisis(env: Env, reportId: string): Promise<void> {
  await laporan.tandaiMenungguAnalisis(env, reportId);
}
