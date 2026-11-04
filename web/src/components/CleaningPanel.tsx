import { useCallback, useEffect, useState } from 'react';
import {
  api,
  CLEANING_TASKS,
  type CleaningRecap,
  type CleaningReport,
  type LocationStatus,
  type StaffOption,
} from '../lib/api';
import { useFormatTime, useLanguage } from '../lib/i18n';
import { CheckGlyph, PinGlyph, PrintGlyph } from './Marks';
import ZoomableImage from './ZoomableImage';
import Select from './Select';

/**
 * The supervisor's view of the cleaning reports, built for the decision
 * management has to make: per area and per day, which tasks were reported, by
 * whom (with the photos behind them) and which were not, plus every report filed
 * away from campus or without GPS. Staff do not own areas: whoever is free does
 * the work, so a gap belongs to the area and not to a person.
 */

function todayWIB(): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

function shiftDate(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "14.05" in campus time, for the recap grid. */
function clockWIB(utc: string, locale: string): string {
  return new Intl.DateTimeFormat(locale, {
    timeZone: 'Asia/Jakarta',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(new Date(`${utc.replace(' ', 'T')}Z`));
}

function formatDistance(m: number | null): string {
  if (m === null) return '';
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

export default function CleaningPanel() {
  const { t, language } = useLanguage();
  const [view, setView] = useState<'recap' | 'reports'>('recap');
  const [date, setDate] = useState(todayWIB);
  const [recap, setRecap] = useState<CleaningRecap | null>(null);
  const [reports, setReports] = useState<CleaningReport[]>([]);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState('');
  const [alertsOnly, setAlertsOnly] = useState(false);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const [r, list] = await Promise.all([
        api.cleaningRecap(date),
        api.cleaningReports({ from: date, to: date, staff_id: staffId, alerts: alertsOnly ? '1' : '', limit: '500' }),
      ]);
      setRecap(r);
      setReports(list.data);
    } catch {
      setRecap(null);
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [date, staffId, alertsOnly]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 30_000);
    return () => clearInterval(timer);
  }, [load]);

  useEffect(() => {
    api
      .staffList()
      .then((r) => setStaffList(r.data))
      .catch(() => setStaffList([]));
  }, []);

  const locale = language === 'id' ? 'id-ID' : 'en-GB';
  const dateLabel = new Intl.DateTimeFormat(locale, {
    weekday: 'long',
    day: 'numeric',
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  }).format(new Date(`${date}T00:00:00Z`));

  return (
    <div className="mt-6">
      <p className="rounded-nav bg-glass px-4 py-3 text-sm leading-relaxed text-ink-700 print:hidden">
        {t('clean.panel_description')}
      </p>

      <div className="mt-4 flex flex-wrap items-center gap-2 print:hidden">
        <div className="flex gap-1 rounded-full bg-mist-200 p-1">
          {(['recap', 'reports'] as const).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={`rounded-full px-3 py-1.5 text-body-sm font-semibold transition ${
                view === v ? 'bg-glass text-ink-900 shadow-subtle' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              {t(`clean.view_${v}`)}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-1">
          <button type="button" className="btn-neutral !px-3 !py-2" onClick={() => setDate((d) => shiftDate(d, -1))}>
            ‹
          </button>
          <input
            type="date"
            className="input !w-auto !py-2"
            value={date}
            max={todayWIB()}
            onChange={(e) => e.target.value && setDate(e.target.value)}
          />
          <button
            type="button"
            className="btn-neutral !px-3 !py-2"
            disabled={date >= todayWIB()}
            onClick={() => setDate((d) => shiftDate(d, 1))}
          >
            ›
          </button>
        </div>

        {view === 'recap' && (
          <button type="button" onClick={() => window.print()} className="btn-primary ml-auto !py-2 text-sm">
            <PrintGlyph />
            {t('clean.print_report')}
          </button>
        )}
      </div>

      {/* The alert stays above every view: it is the one thing the supervisor must not miss. */}
      {!!recap?.totals.alerts && (
        <button
          type="button"
          onClick={() => {
            setView('reports');
            setAlertsOnly(true);
          }}
          className="mt-4 flex w-full items-start gap-3 rounded-nav bg-red-50 px-4 py-3 text-left text-body-sm text-red-900 ring-2 ring-red-300 print:hidden"
        >
          <PinGlyph className="mt-0.5 h-5 w-5" />
          <span>
            <span className="font-bold">{t('clean.alert_banner', { n: recap.totals.alerts })}</span>
            <span className="block">{t('clean.alert_banner_body')}</span>
          </span>
        </button>
      )}

      {loading && <p className="mt-4 text-ink-600">{t('common.loading')}</p>}

      {view === 'recap' && recap && <Recap recap={recap} dateLabel={dateLabel} locale={locale} />}

      {view === 'reports' && (
        <>
          <div className="mt-4 flex flex-wrap items-center gap-2">
            <Select className="input !w-auto !py-2" value={staffId} onChange={setStaffId}>
              <option value="">{t('work.all_staff')}</option>
              {staffList.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </Select>
            <label className="flex items-center gap-2 text-sm text-ink-800">
              <input type="checkbox" checked={alertsOnly} onChange={(e) => setAlertsOnly(e.target.checked)} />
              {t('clean.alerts_only')}
            </label>
            <span className="text-xs text-ink-600">{t('time.count', { n: reports.length })}</span>
          </div>
          <div className="mt-4 space-y-3">
            {!loading && !reports.length && <p className="card p-10 text-center text-ink-600">{t('clean.empty')}</p>}
            {reports.map((r) => (
              <ReportCard key={r.id} report={r} />
            ))}
          </div>
        </>
      )}

    </div>
  );
}

function LocationBadge({ status, distance }: { status: LocationStatus; distance: number | null }) {
  const { t } = useLanguage();
  const style =
    status === 'ok'
      ? 'bg-emerald-50 text-emerald-800 ring-emerald-200'
      : status === 'far'
        ? 'bg-red-50 text-red-800 ring-red-200'
        : 'bg-amber-50 text-amber-900 ring-amber-200';
  return (
    <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset ${style}`}>
      <PinGlyph className="h-3.5 w-3.5" />
      {status === 'ok'
        ? t('clean.loc_ok')
        : status === 'far'
          ? t('clean.loc_far', { distance: formatDistance(distance) })
          : t('clean.loc_unknown')}
    </span>
  );
}

/** The day's report for management: every area against every task, then what each person did. Printable. */
function Recap({ recap, dateLabel, locale }: { recap: CleaningRecap; dateLabel: string; locale: string }) {
  const { t } = useLanguage();
  const percent = recap.totals.expected ? Math.round((recap.totals.done / recap.totals.expected) * 100) : 0;

  return (
    <section className="print-sheet mt-4">
      <header className="hidden print:block">
        <p className="text-sm">Universitas Pendidikan Indonesia · Kampus Tasikmalaya</p>
        <h2 className="text-xl font-extrabold">{t('clean.print_title')}</h2>
        <p className="text-sm">{dateLabel}</p>
      </header>
      <p className="text-sm font-semibold text-ink-700 print:hidden">{dateLabel}</p>

      <div className="mt-3 grid grid-cols-3 gap-3">
        <Stat label={t('clean.stat_done')} value={`${percent}%`} sub={`${recap.totals.done}/${recap.totals.expected}`} />
        <Stat label={t('clean.stat_reports')} value={String(recap.totals.reports)} />
        <Stat label={t('clean.stat_alerts')} value={String(recap.totals.alerts)} tone={recap.totals.alerts ? 'red' : undefined} />
      </div>

      {!recap.areas.length && <p className="card mt-4 p-10 text-center text-ink-600">{t('clean.recap_empty')}</p>}
      {!!recap.areas.length && (
        <div className="card mt-4 overflow-x-auto print:border print:border-black">
          <table className="w-full min-w-[820px] table-fixed text-sm">
            <thead>
              <tr className="bg-mist-50 text-left text-xs text-ink-600">
                <th className="w-[30%] px-4 py-2 font-semibold">{t('clean.col_area')}</th>
                {CLEANING_TASKS.map((task) => (
                  <th key={task} className="px-2 py-2 text-center font-semibold">
                    {t(`task.${task}`)}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {recap.areas.map((a) => (
                <tr key={a.area_id} className="border-t border-mist-200 print:break-inside-avoid">
                  <td className="px-4 py-2 text-ink-900">{a.area_name}</td>
                  {CLEANING_TASKS.map((task) => {
                    const cell = a.tasks[task];
                    if (!cell) {
                      return (
                        <td key={task} className="px-2 py-2 text-center text-ink-600">
                          –
                        </td>
                      );
                    }
                    const who = cell.staff.join(', ');
                    return cell.done_at ? (
                      <td
                        key={task}
                        className={`px-2 py-2 text-center font-semibold ${
                          cell.flagged ? 'bg-amber-50 text-amber-800' : 'text-emerald-700'
                        }`}
                        title={cell.flagged ? `${who} · ${t('clean.cell_flagged')}` : who}
                      >
                        <span className="inline-flex items-center gap-0.5">
                          {cell.flagged ? <PinGlyph className="h-3.5 w-3.5" /> : <CheckGlyph className="h-3.5 w-3.5" />}
                          {clockWIB(cell.done_at, locale)}
                        </span>
                        {cell.times > 1 && <span className="ml-0.5 text-xs text-ink-600">×{cell.times}</span>}
                        <span className="block truncate text-[11px] font-normal opacity-80">{who}</span>
                      </td>
                    ) : (
                      <td key={task} className="px-2 py-2 text-center font-bold text-red-700">
                        ✗
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <p className="mt-3 text-xs text-ink-600">{t('clean.recap_legend')}</p>

      {!!recap.staff.length && (
        <div className="card mt-4 p-5 print:break-inside-avoid print:border print:border-black">
          <h3 className="section-title mb-3">{t('clean.staff_title')}</h3>
          <ul className="m-0 grid list-none gap-x-6 gap-y-2 p-0 sm:grid-cols-2">
            {recap.staff.map((s) => (
              <li key={s.staff_id} className="flex flex-wrap items-baseline justify-between gap-x-3 text-sm">
                <span className="font-semibold text-ink-900">{s.staff_name}</span>
                <span className="text-ink-700">
                  {t('clean.staff_work', { tasks: s.tasks, areas: s.areas })}
                  {!!s.alerts && (
                    <span className="ml-2 rounded-full bg-red-50 px-2 py-0.5 text-xs font-bold text-red-800 ring-1 ring-red-200">
                      {t('clean.alerts_count', { n: s.alerts })}
                    </span>
                  )}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </section>
  );
}

function Stat({ label, value, sub, tone }: { label: string; value: string; sub?: string; tone?: 'red' }) {
  return (
    <div className="card p-4 print:border print:border-black">
      <p className="text-nav font-semibold text-ink-600">{label}</p>
      <p className={`mt-1 text-3xl font-extrabold tracking-tight ${tone === 'red' ? 'text-red-700' : 'text-ink-900'}`}>
        {value}
      </p>
      {sub && <p className="text-xs text-ink-600">{sub}</p>}
    </div>
  );
}

function ReportCard({ report: r }: { report: CleaningReport }) {
  const { t } = useLanguage();
  const formatTime = useFormatTime();

  return (
    <article className={`card p-6 ${r.location_status === 'ok' ? '' : 'ring-2 ring-red-300'}`}>
      <div className="flex flex-wrap items-center gap-2">
        <LocationBadge status={r.location_status} distance={r.distance_m} />
        <span className="text-sm font-semibold text-ink-900">{r.staff_name}</span>
        <span className="ml-auto text-xs text-ink-600">{formatTime(r.created_at)}</span>
      </div>
      <p className="mt-2 font-bold text-ink-900">{r.area_name}</p>
      {r.note && <p className="mt-1 text-ink-800">“{r.note}”</p>}
      {r.latitude !== null && r.longitude !== null && (
        <a
          href={`https://www.google.com/maps?q=${r.latitude},${r.longitude}`}
          target="_blank"
          rel="noreferrer"
          className="mt-1 inline-block text-xs font-semibold text-accent-700 underline"
        >
          {t('clean.open_map')} ({r.latitude.toFixed(5)}, {r.longitude.toFixed(5)}
          {r.accuracy_m !== null && ` ±${Math.round(r.accuracy_m)} m`})
        </a>
      )}
      <div className="mt-3 flex flex-wrap gap-3">
        {r.tasks.map((task) => (
          <figure key={task.task} className="m-0">
            {task.photo_url && (
              <ZoomableImage
                src={task.photo_url}
                caption={`${t(`task.${task.task}`)} · ${r.area_name} · ${r.staff_name}`}
                className="max-h-44"
              />
            )}
            <figcaption className="mt-1 text-xs font-bold text-ink-800">
              {t(`task.${task.task}`)} · {formatTime(task.photo_at)}
            </figcaption>
          </figure>
        ))}
      </div>
    </article>
  );
}
