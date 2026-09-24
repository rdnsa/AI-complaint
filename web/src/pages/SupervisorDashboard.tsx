import { useCallback, useEffect, useState } from 'react';
import Header from '../components/Header';
import ActivityPanel from '../components/ActivityPanel';
import ChartsPanel from '../components/ChartsPanel';
import WorkLogPanel from '../components/WorkLogPanel';
import AccountsPanel from '../components/AccountsPanel';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { useNavigate } from 'react-router-dom';
import { api, type DailyStats, type DailySummary, type Report, type Session } from '../lib/api';
import TimeFilter, { EMPTY_TIME_RANGE, type TimeRange } from '../components/TimeFilter';
import { useFormatTime, useLanguage, useRelativeTime } from '../lib/i18n';
import { useSession } from '../lib/session';
import { CheckGlyph, InboxGlyph, SupervisorMark } from '../components/Marks';
import ZoomableImage from '../components/ZoomableImage';

export default function SupervisorDashboard() {
  const { t } = useLanguage();
  const { session, loading } = useSession();
  const navigate = useNavigate();

  // The dashboard is for monitoring, and only the supervisor monitors.
  const allowed = session?.role === 'supervisor' ? session : null;

  useEffect(() => {
    // Anyone else is sent to sign in; the sign-in page decides where they go.
    if (!loading && !allowed) navigate('/login', { replace: true });
  }, [loading, allowed, navigate]);

  if (!allowed) {
    return (
      <div className="min-h-screen">
        <Header title={t('dashboard.title')} compact />
        <p className="p-10 text-center text-maroon-600">{t('common.loading')}</p>
      </div>
    );
  }

  return <Board session={allowed} />;
}

function Board({ session }: { session: Session }) {
  const { t } = useLanguage();
  const { logout } = useSession();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [time, setTime] = useState<TimeRange>(EMPTY_TIME_RANGE);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [tab, setTab] = useState<
    'reports' | 'work_logs' | 'charts' | 'activity' | 'accounts'
  >('reports');
  // The AI chatbot and the QR stickers are on the home page, open to everyone.
  const tabs = ['reports', 'work_logs', 'charts', 'activity', 'accounts'] as const;

  const load = useCallback(async () => {
    const [r, s, sum] = await Promise.all([
      // A time filter can reach far back, so allow the full page the server permits.
      api.reports({ ...filter, ...time, limit: '200' }),
      api.stats().catch(() => null),
      api.summary().catch(() => null),
    ]);
    setReports(r.data);
    setStats(s);
    setSummary(sum);
    setLoading(false);
  }, [filter, time]);

  useEffect(() => {
    load();
    // The dashboard lives on the wall of the staff room, so it refreshes itself.
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  async function remove(id: string) {
    setReports((prev) => prev.filter((r) => r.id !== id));
    await api.deleteReport(id).catch(() => {});
    load();
  }

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={t('dashboard.title')}
        description={t('dashboard.signed_in_as', { name: `${session.name} · ${t('account.role_supervisor')}` })}
        compact
        mark={<SupervisorMark />}
        right={
          <button
            onClick={async () => {
              await logout();
              navigate('/login', { replace: true });
            }}
            className="rounded-lg bg-white/15 px-3 py-1.5 text-xs font-bold text-white ring-1 ring-white/25 transition hover:bg-white/25"
          >
            {t('dashboard.logout')}
          </button>
        }
      />

      <main className="mx-auto max-w-5xl px-4">
        {/* Five tabs do not fit one phone row: a three-column grid there, a single row from md up. */}
        <nav className="mt-5 grid grid-cols-3 gap-1 rounded-xl bg-permukaan p-1 ring-1 ring-krem-200 md:flex">
          {tabs.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`rounded-lg px-2 py-2 text-xs font-bold leading-tight transition sm:text-sm md:flex-1 md:px-3 ${
                tab === k ? 'bg-maroon-800 text-permukaan' : 'text-maroon-700 hover:bg-krem-50'
              }`}
            >
              {t(`tab.${k}`)}
            </button>
          ))}
        </nav>

        {tab === 'work_logs' && <WorkLogPanel />}
        {tab === 'charts' && <ChartsPanel />}
        {tab === 'activity' && <ActivityPanel />}
        {tab === 'accounts' && <AccountsPanel />}

        {tab === 'reports' && (
          <>
        {stats && (
          <div className="mt-6 grid grid-cols-2 gap-3 lg:grid-cols-4">
            <StatCard label={t('dashboard.stat_total')} value={stats.today.total ?? 0} />
            <StatCard label={t('dashboard.stat_high')} value={stats.today.high ?? 0} tone="red" />
            <StatCard label={t('dashboard.stat_unresolved')} value={stats.unresolved} tone="amber" />
            <StatCard label={t('dashboard.stat_ai_failed')} value={stats.today.ai_failed ?? 0} />
          </div>
        )}

        <section className="card mt-4 overflow-hidden">
          <div className="flex items-center justify-between gap-3 border-b border-krem-200 bg-krem-50 px-4 py-3">
            <h2 className="section-title">{t('dashboard.summary')}</h2>
            <button
              className="btn-neutral !px-3 !py-1.5 text-xs"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  setSummary(await api.generateSummary());
                } catch {
                  /* leave the previous summary on screen */
                } finally {
                  setGenerating(false);
                }
              }}
            >
              {generating ? t('dashboard.generating') : t('dashboard.regenerate')}
            </button>
          </div>

          <div className="p-4">
            {summary?.exists ? (
              <>
                <p className="leading-relaxed text-maroon-900">{summary.summary}</p>
                {!!summary.highlights?.length && (
                  <ul className="mt-3 space-y-1.5">
                    {summary.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-sm text-maroon-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-bata-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
              </>
            ) : (
              <p className="text-sm text-maroon-600">{t('dashboard.summary_empty')}</p>
            )}

            {!!stats?.top_locations.length && (
              <div className="mt-4 border-t border-krem-200 pt-3">
                <p className="section-title">{t('dashboard.top_locations')}</p>
                <ul className="mt-2 space-y-1 text-sm">
                  {stats.top_locations.map((l) => (
                    <li key={l.location} className="flex justify-between gap-3">
                      <span className="truncate text-maroon-700">{l.location}</span>
                      <span className="font-bold text-maroon-900">{l.count}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </section>

        <div className="mt-6 flex flex-wrap gap-2">
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

        <TimeFilter value={time} onChange={setTime} />

        <div className="mt-4 space-y-3">
          {!loading && (
            <p className="text-xs text-maroon-600">{t('time.count', { n: reports.length })}</p>
          )}
          {loading && <p className="text-maroon-600">{t('dashboard.loading_reports')}</p>}
          {!loading && !reports.length && (
            <p className="card p-10 text-center text-maroon-600">{t('dashboard.empty')}</p>
          )}
          {reports.map((r) => (
            <ReportRow
              key={r.id}
              report={r}
              onRefresh={load}
              onDelete={remove}
            />
          ))}
        </div>
          </>
        )}
      </main>
    </div>
  );
}

function StatCard({ label, value, tone }: { label: string; value: number; tone?: 'red' | 'amber' }) {
  const color =
    tone === 'red' && value > 0
      ? 'text-red-700'
      : tone === 'amber' && value > 0
        ? 'text-amber-700'
        : 'text-maroon-900';
  return (
    <div className="card p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${color}`}>{value}</p>
    </div>
  );
}

function ReportRow({
  report: r,
  onRefresh,
  onDelete,
}: {
  report: Report;
  onRefresh: () => void;
  onDelete: (id: string) => void;
}) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const formatTime = useFormatTime();

  // The left edge marks the priority, readable from across the room.
  const edge =
    r.priority === 'high'
      ? 'border-l-4 border-l-red-500'
      : r.priority === 'medium'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-emerald-400';

  return (
    <article className={`card p-4 ${edge}`}>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge value={r.priority} />
        <StatusBadge value={r.status} />
        {r.categories.map((c) => (
          <CategoryBadge key={c} value={c} />
        ))}
        <span className="ml-auto text-xs text-maroon-600">{relativeTime(r.created_at)}</span>
      </div>

      {/* The exact moments, in campus time: when the report came in and when it was closed. */}
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-maroon-700">
        <div className="flex gap-1">
          <dt className="flex items-center gap-1 font-semibold">
            <InboxGlyph className="h-3.5 w-3.5" />
            {t('time.received')}:
          </dt>
          <dd>{formatTime(r.created_at)}</dd>
        </div>
        {r.resolved_at && (
          <div className="flex gap-1">
            <dt className="flex items-center gap-1 font-semibold text-emerald-700">
              <CheckGlyph className="h-3.5 w-3.5" />
              {t('time.resolved')}:
            </dt>
            <dd>{formatTime(r.resolved_at)}</dd>
          </div>
        )}
      </dl>

      <p className="mt-2.5 font-bold text-maroon-900">{r.toilet_name}</p>
      <p className="mt-1 text-maroon-800">{r.summary ?? r.description}</p>

      {r.summary && (
        <p className="mt-1 text-sm italic text-maroon-600">
          {t('dashboard.original_report')}: “{r.description}”
        </p>
      )}

      {r.recommendation && (
        <p className="mt-2.5 rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
          <span className="font-bold">{t('dashboard.action')} </span>
          {r.recommendation}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        {r.photo_url && (
          <ZoomableImage
            src={r.photo_url}
            caption={`${t('photo.report')} · ${r.toilet_name}`}
            className="max-h-44"
          />
        )}
        {r.proof_photo_url && (
          <figure className="m-0">
            <ZoomableImage
              src={r.proof_photo_url}
              caption={`${t('dashboard.proof')} · ${r.toilet_name}`}
              frameClassName="ring-2 ring-emerald-400"
              className="max-h-44"
            />
            <figcaption className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckGlyph className="h-3.5 w-3.5" />
              {t('dashboard.proof')}
              {r.proof_verdict === 'clean' && <> · {t('dashboard.proof_verified')}</>}
            </figcaption>
            {r.proof_reason && (
              <p className="mt-0.5 max-w-xs text-xs italic text-maroon-600">{r.proof_reason}</p>
            )}
          </figure>
        )}
      </div>

      {/* Resolving is the cleaners' job, done on the floor page with a live photo;
          the supervisor watches it here and only moderates. */}
      <div className="mt-3 flex flex-wrap items-center gap-2">
        {r.ai_status === 'failed' && (
          <button
            onClick={async () => {
              await api.reanalyze(r.id).catch(() => {});
              setTimeout(onRefresh, 3000);
            }}
            className="btn-neutral !py-1.5 text-xs"
          >
            {t('dashboard.reanalyze')}
          </button>
        )}
        {/* The report list is open to the public, so spam and inappropriate content
            must be removable — and only the supervisor may do it. */}
        <button
          onClick={() => {
            if (confirm(t('dashboard.delete_confirm'))) onDelete(r.id);
          }}
          className="btn !py-1.5 text-xs text-red-700 hover:bg-red-50"
        >
          {t('dashboard.delete')}
        </button>
        {r.staff_name && (
          <span className="text-xs text-maroon-600">{t('dashboard.handled_by', { name: r.staff_name })}</span>
        )}
      </div>
    </article>
  );
}
