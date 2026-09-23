import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Header from '../components/Header';
import Tracker from '../components/Tracker';
import { CategoryBadge, PriorityBadge } from '../components/Badges';
import { api, type Report } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { useSession } from '../lib/session';

/**
 * Confirmation page for the reporter. The report is stored instantly while the
 * LLM analysis follows; this page polls until the result is ready.
 */
export default function ReportStatus() {
  const { id = '' } = useParams();
  const { t } = useLanguage();
  const { session } = useSession();
  const [report, setReport] = useState<Report | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    let timer: ReturnType<typeof setTimeout>;
    let fastPolls = 0;

    async function fetchReport() {
      // A hidden tab does not need refreshing; it is simply checked again later.
      if (document.hidden) return schedule(15_000);
      try {
        const data = await api.report(id);
        if (cancelled) return;
        setReport(data);
        // While the analysis runs, refresh every 2 seconds so the result appears
        // at once. After that a slow pace is enough, just to catch status changes
        // made by staff while the page stays open.
        schedule(data.ai_status === 'pending' && fastPolls++ < 20 ? 2000 : 15_000);
      } catch {
        if (!cancelled) setError(t('status.error_load'));
      }
    }

    function schedule(delay: number) {
      if (!cancelled) timer = setTimeout(fetchReport, delay);
    }

    fetchReport();
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [id, t]);

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('app.title')} compact />

      <main className="mx-auto max-w-lg px-4">
        {error && <p className="mt-8 text-center text-red-700">{error}</p>}
        {!report && !error && <p className="mt-10 text-center text-maroon-600">{t('common.loading')}</p>}

        {report && (
          <>
            <div className="mt-6 flex items-start gap-3 rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
              <span className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-emerald-600 text-base font-bold text-white">
                ✓
              </span>
              <div>
                <p className="font-bold text-emerald-900">{t('status.success')}</p>
                <p className="mt-0.5 text-sm leading-relaxed text-emerald-800">
                  {t('status.success_body')}
                </p>
              </div>
            </div>

            <div className="card mt-4 p-4">
              <p className="text-sm font-semibold text-bata-600">{report.toilet_name}</p>
              <p className="mt-1.5 whitespace-pre-wrap text-maroon-900">{report.description}</p>
              {report.photo_url && (
                <img src={report.photo_url} alt="" className="mt-3 w-full rounded-xl" />
              )}
            </div>

            <Tracker report={report} />

            <div className="card mt-4 p-4">
              <h2 className="section-title">{t('status.analysis_result')}</h2>

              {report.ai_status === 'pending' && (
                <div className="mt-3 space-y-2">
                  <div className="h-4 w-2/3 animate-pulse rounded bg-krem-200" />
                  <div className="h-4 w-full animate-pulse rounded bg-krem-200" />
                  <p className="pt-1 text-sm text-maroon-600">{t('status.analysing')}</p>
                </div>
              )}

              {report.ai_status === 'failed' && (
                <p className="mt-3 text-sm leading-relaxed text-maroon-600">{t('status.analysis_failed')}</p>
              )}

              {report.ai_status === 'ok' && (
                <div className="mt-3 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    <PriorityBadge value={report.priority} />
                    {report.categories.map((c) => (
                      <CategoryBadge key={c} value={c} />
                    ))}
                  </div>
                  <p className="text-maroon-900">{report.summary}</p>
                  <div className="rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
                    <span className="font-bold">{t('status.action')} </span>
                    {report.recommendation}
                  </div>
                </div>
              )}
            </div>
          </>
        )}

        {report && (
          <p className="mt-4 text-center text-xs leading-relaxed text-maroon-600">
            {session?.role === 'reporter' ? t('status.saved_account') : t('status.saved_hint')}
          </p>
        )}

        <Link
          to="/"
          className="mx-auto mt-6 block w-fit text-sm font-semibold text-maroon-600 underline decoration-krem-300 underline-offset-4 hover:text-bata-600"
        >
          {t('nav.home')}
        </Link>
      </main>
    </div>
  );
}
