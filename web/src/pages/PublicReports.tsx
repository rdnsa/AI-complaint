import { useCallback, useEffect, useState } from 'react';
import Header from '../components/Header';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { api, type PublicReport } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { CheckGlyph, ReportsMark } from '../components/Marks';

/**
 * The public report board.
 *
 * Identical in content to the staff dashboard list, but with no action buttons
 * at all: changing status, re-running analysis, and deleting remain the
 * authority of signed-in staff.
 */
export default function PublicReports() {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();

  const [reports, setReports] = useState<PublicReport[]>([]);
  const [counts, setCounts] = useState({ total: 0, resolved: 0 });
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.publicReports(filter);
      setReports(r.data);
      setCounts({ total: r.counts.total, resolved: r.counts.resolved ?? 0 });
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={t('public.title')}
        description={t('public.description')}
        mark={<ReportsMark size="h-12 w-12 rounded-[14px]" />}
      />

      <main className="mx-auto max-w-3xl px-4">
        <p className="mt-6 rounded-xl bg-permukaan px-4 py-3 text-sm font-semibold text-maroon-800 ring-1 ring-krem-200">
          {t('public.count', { resolved: counts.resolved, total: counts.total })}
        </p>

        <div className="mt-4 flex flex-wrap gap-2">
          <select
            className="input !w-auto !py-2"
            value={filter.status}
            onChange={(e) => setFilter((f) => ({ ...f, status: e.target.value }))}
          >
            <option value="">{t('dashboard.all_statuses')}</option>
            <option value="new">{t('status.new')}</option>
            <option value="in_progress">{t('status.in_progress')}</option>
            <option value="resolved">{t('status.resolved')}</option>
          </select>
          <select
            className="input !w-auto !py-2"
            value={filter.priority}
            onChange={(e) => setFilter((f) => ({ ...f, priority: e.target.value }))}
          >
            <option value="">{t('dashboard.all_priorities')}</option>
            <option value="high">{t('priority_short.high')}</option>
            <option value="medium">{t('priority_short.medium')}</option>
            <option value="low">{t('priority_short.low')}</option>
          </select>
        </div>

        <div className="mt-4 space-y-3">
          {loading && <p className="text-maroon-600">{t('dashboard.loading_reports')}</p>}
          {!loading && !reports.length && (
            <p className="card p-10 text-center text-maroon-600">{t('public.empty')}</p>
          )}

          {reports.map((r) => {
            const edge =
              r.priority === 'high'
                ? 'border-l-4 border-l-red-500'
                : r.priority === 'medium'
                  ? 'border-l-4 border-l-amber-400'
                  : 'border-l-4 border-l-emerald-400';

            return (
              <article key={r.id} className={`card p-4 ${edge}`}>
                <div className="flex flex-wrap items-center gap-2">
                  <PriorityBadge value={r.priority} />
                  <StatusBadge value={r.status} />
                  {r.categories.map((c) => (
                    <CategoryBadge key={c} value={c} />
                  ))}
                  <span className="ml-auto text-xs text-maroon-600">
                    {relativeTime(r.created_at)}
                  </span>
                </div>

                <p className="mt-2.5 font-bold text-maroon-900">{r.toilet_name}</p>
                <p className="mt-1 text-maroon-800">
                  {r.summary ?? (
                    <span className="italic text-maroon-600">{t('public.pending_summary')}</span>
                  )}
                </p>

                {/* The staff proof photo is shown openly: this is what lets anyone
                    check the claim that a report "has been handled". */}
                {r.proof_photo_url && (
                  <a href={r.proof_photo_url} target="_blank" rel="noreferrer" className="mt-3 block w-fit">
                    <img
                      src={r.proof_photo_url}
                      alt={t('dashboard.proof')}
                      className="max-h-48 rounded-xl ring-2 ring-emerald-400"
                    />
                  </a>
                )}

                {r.resolved_at && (
                  <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                    <CheckGlyph className="h-3.5 w-3.5" />
                    {t('tracker.resolved')} · {relativeTime(r.resolved_at)}
                  </p>
                )}
              </article>
            );
          })}
        </div>
      </main>
    </div>
  );
}
