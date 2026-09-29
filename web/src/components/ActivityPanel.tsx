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
  report_created: 'bg-accent-50 text-accent-700 ring-accent-200',
  work_logged: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
  status_changed: 'bg-accent-50 text-accent-600 ring-accent-100',
  report_deleted: 'bg-red-50 text-red-800 ring-red-200',
  analysis: 'bg-mist-100 text-ink-700 ring-mist-300',
  analysis_failed: 'bg-amber-50 text-amber-800 ring-amber-200',
  proof_rejected: 'bg-amber-50 text-amber-800 ring-amber-200',
  verification_failed: 'bg-amber-50 text-amber-800 ring-amber-200',
  login: 'bg-mist-100 text-ink-700 ring-mist-300',
  daily_summary: 'bg-mist-100 text-ink-700 ring-mist-300',
  question: 'bg-mist-100 text-ink-700 ring-mist-300',
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
      <p className="rounded-nav bg-surface px-4 py-3 text-sm leading-relaxed text-ink-700">
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
        {loading && <p className="text-ink-600">{t('common.loading')}</p>}
        {!loading && !data.length && (
          <p className="card p-10 text-center text-ink-600">{t('activity.empty')}</p>
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
              <span className="text-sm font-semibold text-ink-900">{a.actor}</span>
              <span className="ml-auto text-xs text-ink-600">{relativeTime(a.created_at)}</span>
            </div>

            <p className="mt-1.5 text-sm text-ink-800">{a.summary}</p>

            {/* Deletion is the only action that removes data, so its copy is laid
                out right away, without needing a click. */}
            {a.action === 'report_deleted' && a.details && (
              <div className="mt-2 rounded-nav bg-red-50 px-4 py-3 text-body-sm">
                <p className="text-nav font-semibold text-red-800">
                  {t('activity.deleted_contents')}
                </p>
                <p className="mt-1 italic text-ink-800">“{String(a.details.description ?? '')}”</p>
                <p className="mt-1 text-xs text-ink-600">
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
