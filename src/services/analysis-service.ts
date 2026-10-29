import { analyzeComplaint } from '../adapters/llm';
import { reportsChanged } from '../adapters/memo';
import type { Env } from '../env';
import * as reports from '../repositories/reports';
import { log, SYSTEM } from './activity-service';

/**
 * Analyses one report and stores the result.
 *
 * Invoked through `ctx.waitUntil()` after the response has been sent, so the
 * reporter never waits on the LLM. This function deliberately never throws:
 * a failure is recorded as ai_status='failed' so the report still shows up on
 * the dashboard (without AI labels) and staff can retry it by hand.
 */
export async function runAnalysis(env: Env, reportId: string): Promise<void> {
  const row = await reports.getForAnalysis(env, reportId);
  if (!row) return;

  const start = Date.now();
  try {
    const result = await analyzeComplaint(env, row.description, row.location);
    await reports.saveAnalysis(env, reportId, {
      ...result,
      model: env.LLM_MODEL,
      ms: Date.now() - start,
    });
    // The priority is what the dashboard counts, so its numbers just changed.
    reportsChanged();

    await log(env, {
      action: 'analysis',
      report_id: reportId,
      actor: SYSTEM,
      summary: `Analisis selesai: prioritas ${result.priority} (${Date.now() - start} ms)`,
      details: { categories: result.categories, priority: result.priority, model: env.LLM_MODEL },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(`Analysis failed for report ${reportId}: ${message}`);
    await reports.saveAnalysisFailure(env, reportId, message, Date.now() - start);
    reportsChanged();

    await log(env, {
      action: 'analysis_failed',
      report_id: reportId,
      actor: SYSTEM,
      summary: 'Analisis otomatis gagal',
      details: { error: message.slice(0, 300) },
    });
  }
}
