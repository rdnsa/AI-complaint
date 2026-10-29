import { lazy, Suspense, useCallback, useEffect, useState } from 'react';
import Header from '../components/Header';
import { usePolling } from '../lib/polling';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import { useNavigate } from 'react-router-dom';
import { api, type Report, type Session } from '../lib/api';
import TimeFilter, { EMPTY_TIME_RANGE, type TimeRange } from '../components/TimeFilter';
import { useFormatTime, useLanguage, useRelativeTime } from '../lib/i18n';
import { useSession } from '../lib/session';
import { CheckGlyph, InboxGlyph, SupervisorMark } from '../components/Marks';
import ZoomableImage from '../components/ZoomableImage';
import { Reveal } from '../lib/motion';
import Select from '../components/Select';

// Each tab is its own chunk, fetched when it is first opened: the QR library and the
// charts are not downloaded by a supervisor who only reads the report list.
const OverviewPanel = lazy(() => import('../components/OverviewPanel'));
const WorkLogPanel = lazy(() => import('../components/WorkLogPanel'));
const CleaningPanel = lazy(() => import('../components/CleaningPanel'));
const ActivityPanel = lazy(() => import('../components/ActivityPanel'));
const AccountsPanel = lazy(() => import('../components/AccountsPanel'));
const QrCodesPanel = lazy(() => import('../components/QrCodesPanel'));

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
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  return <Board session={allowed} />;
}

const TABS = ['overview', 'reports', 'logs', 'accounts', 'qr'] as const;
type Tab = (typeof TABS)[number];

/** A small switch between the two lists a tab holds. */
function SubTabs<K extends string>({
  value,
  onChange,
  items,
}: {
  value: K;
  onChange: (k: K) => void;
  items: Array<{ key: K; label: string; badge?: number }>;
}) {
  return (
    <div className="mt-4 inline-flex gap-1 rounded-full bg-mist-200 p-1" role="group">
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => onChange(it.key)}
          aria-pressed={value === it.key}
          className={`inline-flex items-center gap-1.5 rounded-full px-4 py-1.5 text-body-sm font-semibold transition ${
            value === it.key ? 'bg-glass text-ink-900 shadow-subtle' : 'text-ink-700 hover:text-ink-900'
          }`}
        >
          {it.label}
          {!!it.badge && <span className="rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] leading-none text-white">{it.badge}</span>}
        </button>
      ))}
    </div>
  );
}

function Board({ session }: { session: Session }) {
  const { t } = useLanguage();
  const { logout } = useSession();
  const navigate = useNavigate();
  const [reports, setReports] = useState<Report[]>([]);
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [time, setTime] = useState<TimeRange>(EMPTY_TIME_RANGE);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState<Tab>('overview');
  // Two tabs hold two related lists each, told apart by a small switch at their top.
  const [reportsView, setReportsView] = useState<'complaints' | 'cleaning'>('complaints');
  const [logsView, setLogsView] = useState<'activity' | 'work_logs'>('activity');
  // Today's cleaning reports filed off campus or without GPS: a red count on the tab.
  const [cleaningAlerts, setCleaningAlerts] = useState(0);
  // Kato Bot floats over every page; the QR stickers are a tab here.

  // The red count on the Cleaning tab is cheap and must stay current on every tab.
  const loadAlerts = useCallback(async () => {
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const alerts = await api.cleaningReports({ from: today, to: today, alerts: '1' }).catch(() => ({ data: [] }));
    setCleaningAlerts(alerts.data.length);
  }, []);

  // The report list is the heavy one (up to 200 rows): only fetched while it is showing.
  const load = useCallback(async () => {
    // A time filter can reach far back, so allow the full page the server permits.
    const r = await api.reports({ ...filter, ...time, limit: '200' });
    setReports(r.data);
    setLoading(false);
  }, [filter, time]);

  // The dashboard lives on the wall of the staff room, so it refreshes itself,
  // but not while hidden in a background tab.
  usePolling(loadAlerts, 60_000);
  usePolling(load, 30_000, tab === 'reports' && reportsView === 'complaints');

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
            className="rounded-full px-3 py-1 text-nav text-ink-900 ring-1 ring-ink-600/60 transition hover:ring-ink-900"
          >
            {t('dashboard.logout')}
          </button>
        }
      />

      <main className="mx-auto max-w-6xl px-4">
        {/* Five tabs share one row, on a phone too: the long label gets the wider column and wraps to two lines. */}
        <nav className="mt-5 grid grid-cols-[1.15fr_1fr_0.6fr_1.45fr_1fr] gap-1 rounded-nav bg-mist-200 p-1 md:rounded-full">
          {TABS.map((k) => (
            <button
              key={k}
              onClick={() => setTab(k)}
              aria-pressed={tab === k}
              className={`relative rounded-full px-1 py-2 text-nav font-semibold leading-tight transition sm:text-body-sm md:px-3 ${
                tab === k ? 'bg-glass text-ink-900 shadow-subtle' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              {t(`tab.${k}`)}
              {/* Off-campus cleaning reports today: the count rides on the tab that holds them. */}
              {k === 'reports' && cleaningAlerts > 0 && (
                <span className="absolute -right-0.5 -top-1.5 grid min-w-5 place-content-center rounded-full bg-red-600 px-1.5 py-0.5 text-[11px] leading-none text-white">
                  {cleaningAlerts}
                </span>
              )}
            </button>
          ))}
        </nav>

        {tab === 'reports' && (
          <SubTabs
            value={reportsView}
            onChange={setReportsView}
            items={[
              { key: 'complaints', label: t('sub.complaints') },
              { key: 'cleaning', label: t('tab.cleaning'), badge: cleaningAlerts },
            ]}
          />
        )}
        {tab === 'logs' && (
          <SubTabs
            value={logsView}
            onChange={setLogsView}
            items={[
              { key: 'activity', label: t('tab.activity') },
              { key: 'work_logs', label: t('tab.work_logs') },
            ]}
          />
        )}

        <Suspense fallback={<p className="mt-6 text-ink-600">{t('common.loading')}</p>}>
          {tab === 'overview' && <OverviewPanel />}
          {tab === 'reports' && reportsView === 'cleaning' && <CleaningPanel />}
          {tab === 'logs' && logsView === 'activity' && <ActivityPanel />}
          {tab === 'logs' && logsView === 'work_logs' && <WorkLogPanel />}
          {tab === 'accounts' && <AccountsPanel />}
          {tab === 'qr' && <QrCodesPanel />}
        </Suspense>

        {tab === 'reports' && reportsView === 'complaints' && (
          <>
        <div className="mt-6 flex flex-wrap gap-2">
          <Select
            className="input !w-auto !py-2"
            value={filter.status}
            onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
          >
            <option value="">{t('dashboard.all_statuses')}</option>
            <option value="new">{t('status.new')}</option>
            <option value="in_progress">{t('status.in_progress')}</option>
            <option value="resolved">{t('status.resolved')}</option>
          </Select>
          <Select
            className="input !w-auto !py-2"
            value={filter.priority}
            onChange={(v) => setFilter((f) => ({ ...f, priority: v }))}
          >
            <option value="">{t('dashboard.all_priorities')}</option>
            <option value="high">{t('priority_short.high')}</option>
            <option value="medium">{t('priority_short.medium')}</option>
            <option value="low">{t('priority_short.low')}</option>
          </Select>
        </div>

        <TimeFilter value={time} onChange={setTime} />

        <div className="mt-4 space-y-3">
          {!loading && (
            <p className="text-xs text-ink-600">{t('time.count', { n: reports.length })}</p>
          )}
          {loading && <p className="text-ink-600">{t('dashboard.loading_reports')}</p>}
          {!loading && !reports.length && (
            <p className="card p-10 text-center text-ink-600">{t('dashboard.empty')}</p>
          )}
          {reports.map((r) => (
            <Reveal key={r.id}>
              <ReportRow
                report={r}
                onRefresh={load}
                onDelete={remove}
              />
            </Reveal>
          ))}
        </div>
          </>
        )}
      </main>
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

  return (
    <article className="card p-6">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge value={r.priority} />
        <StatusBadge value={r.status} />
        {r.categories.map((c) => (
          <CategoryBadge key={c} value={c} />
        ))}
        <span className="ml-auto text-xs text-ink-600">{relativeTime(r.created_at)}</span>
      </div>

      {/* The exact moments, in campus time: when the report came in and when it was closed. */}
      <dl className="mt-2 flex flex-wrap gap-x-4 gap-y-0.5 text-xs text-ink-700">
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

      <p className="mt-2.5 font-bold text-ink-900">{r.location_name}</p>
      <p className="mt-1 text-ink-800">{r.summary ?? r.description}</p>

      {r.summary && (
        <p className="mt-1 text-sm italic text-ink-600">
          {t('dashboard.original_report')}: “{r.description}”
        </p>
      )}

      {r.recommendation && (
        <p className="mt-2.5 rounded-nav bg-mist-100 px-4 py-3 text-body-sm text-ink-700">
          <span className="font-bold">{t('dashboard.action')} </span>
          {r.recommendation}
        </p>
      )}

      <div className="mt-3 flex flex-wrap gap-3">
        {r.photo_url && (
          <ZoomableImage
            src={r.photo_url}
            caption={`${t('photo.report')} · ${r.location_name}`}
            className="max-h-44"
          />
        )}
        {r.proof_photo_url && (
          <figure className="m-0">
            <ZoomableImage
              src={r.proof_photo_url}
              caption={`${t('dashboard.proof')} · ${r.location_name}`}
              frameClassName="ring-2 ring-emerald-400"
              className="max-h-44"
            />
            <figcaption className="mt-1 flex items-center gap-1 text-xs font-bold text-emerald-700">
              <CheckGlyph className="h-3.5 w-3.5" />
              {t('dashboard.proof')}
              {r.proof_verdict === 'clean' && <> · {t('dashboard.proof_verified')}</>}
            </figcaption>
            {r.proof_reason && (
              <p className="mt-0.5 max-w-xs text-xs italic text-ink-600">{r.proof_reason}</p>
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
          <span className="text-xs text-ink-600">{t('dashboard.handled_by', { name: r.staff_name })}</span>
        )}
      </div>
    </article>
  );
}
