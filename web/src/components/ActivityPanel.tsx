import { useCallback, useEffect, useState } from 'react';
import { api, type ActivityEntry } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';

const ACTIONS = [
  'report_created',
  'work_logged',
  'status_changed',
  'proof_rejected',
  'report_deleted',
  'analysis',
  'analysis_failed',
  'verification_failed',
  'login',
  'daily_summary',
  'question',
] as const;

const COLORS: Record<string, string> = {
  report_created: 'bg-bata-50 text-bata-700 ring-bata-200',
  work_logged: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  status_changed: 'bg-toska-500/10 text-toska-600 ring-toska-400/40',
  report_deleted: 'bg-red-50 text-red-800 ring-red-200',
  analysis: 'bg-krem-100 text-maroon-700 ring-krem-300',
  analysis_failed: 'bg-amber-50 text-amber-800 ring-amber-200',
  proof_rejected: 'bg-amber-50 text-amber-800 ring-amber-200',
  verification_failed: 'bg-amber-50 text-amber-800 ring-amber-200',
  login: 'bg-krem-100 text-maroon-700 ring-krem-300',
  daily_summary: 'bg-krem-100 text-maroon-700 ring-krem-300',
  question: 'bg-krem-100 text-maroon-700 ring-krem-300',
};

export default function ActivityPanel() {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [data, setData] = useState<ActivityEntry[]>([]);
  const [action, setAction] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      setData((await api.activity(action ? { action } : {})).data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [action]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
        {t('activity.description')}
      </p>

      <select
        className="input mt-4 !w-auto !py-2"
        value={action}
        onChange={(e) => setAction(e.target.value)}
      >
        <option value="">{t('activity.all')}</option>
        {ACTIONS.map((a) => (
          <option key={a} value={a}>
            {t(`action.${a}`)}
          </option>
        ))}
      </select>

      <ol className="mt-4 space-y-2">
        {loading && <p className="text-maroon-600">{t('common.loading')}</p>}
        {!loading && !data.length && (
          <p className="card p-10 text-center text-maroon-600">{t('activity.empty')}</p>
        )}

        {data.map((a) => (
          <li key={a.id} className="card p-3.5">
            <div className="flex flex-wrap items-center gap-2">
              <span
                className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${
                  COLORS[a.action] ?? COLORS.analysis
                }`}
              >
                {t(`action.${a.action}`)}
              </span>
              <span className="text-sm font-semibold text-maroon-900">{a.actor}</span>
              <span className="ml-auto text-xs text-maroon-600">{relativeTime(a.created_at)}</span>
            </div>

            <p className="mt-1.5 text-sm text-maroon-800">{a.summary}</p>

            {/* Deletion is the only action that removes data, so its copy is laid
                out right away, without needing a click. */}
            {a.action === 'report_deleted' && a.details && (
              <div className="mt-2 rounded-xl border-l-4 border-red-400 bg-red-50/60 p-3 text-sm">
                <p className="text-xs font-bold uppercase tracking-wide text-red-800">
                  {t('activity.deleted_contents')}
                </p>
                <p className="mt-1 italic text-maroon-800">“{String(a.details.description ?? '')}”</p>
                <p className="mt-1 text-xs text-maroon-600">
                  {String(a.details.toilet_name ?? '')} · {String(a.details.status ?? '')} ·{' '}
                  {String(a.details.created_at ?? '')}
                </p>
              </div>
            )}
          </li>
        ))}
      </ol>
    </div>
  );
}
