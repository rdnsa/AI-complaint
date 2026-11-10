import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AgingBars from './charts/AgingBars';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import CalendarHeat from './charts/CalendarHeat';
import CoverageGrid from './charts/CoverageGrid';
import ExportMenu from './ExportMenu';
import Select from './Select';
import Donut from './charts/Donut';
import Heatmap, { type HeatmapCell } from './charts/Heatmap';
import HourBars from './charts/HourBars';
import HourClock from './charts/HourClock';
import InView from './charts/InView';
import KpiCard from './charts/KpiCard';
import RadialBars from './charts/RadialBars';
import RadialGauge from './charts/RadialGauge';
import StackedBarChart from './charts/StackedBarChart';
import StaffBubbles from './charts/StaffBubbles';
import TaskDials from './charts/TaskDials';
import Treemap from './charts/Treemap';
import { AGING_COLORS, CATEGORY_COLORS, PRIORITY_COLORS, SERIES, SINGLE, STATUS_COLORS } from './charts/colors';
import {
  api,
  CLEANING_TASKS,
  type ChartData,
  type ChartScope,
  type CleaningArea,
  type CleaningCharts,
  type DailySummary,
  type StaffOption,
} from '../lib/api';
import { useLanguage, type Translate } from '../lib/i18n';
import { buildPlaces, type Place } from '../lib/places';
import type { ExportFormat } from '../lib/export-dashboard';
import { Reveal } from '../lib/motion';
import { usePolling } from '../lib/polling';

export interface DateRange {
  from: string;
  to: string;
}

/** The view opens on the last month (30 days, today included); another range is picked on the date fields. */
const DEFAULT_DAYS = 30;
const MAX_RANGE_DAYS = 366;
const DAY_MS = 24 * 60 * 60 * 1000;
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21];
const CATEGORY_ORDER = ['cleanliness', 'supplies', 'damage', 'odor', 'flooding', 'other'];

/** A date on the campus clock, 'YYYY-MM-DD', whatever zone the device is in. */
function wibDate(daysBack = 0): string {
  return new Date(Date.now() + 7 * 60 * 60 * 1000 - daysBack * DAY_MS).toISOString().slice(0, 10);
}

/** The view before any date is picked. Worked out afresh so a wall screen moves on at midnight. */
function rollingRange(): DateRange {
  return { from: wibDate(DEFAULT_DAYS - 1), to: wibDate() };
}

/** What is wrong with a range, or null. Half-typed dates count as "not yet", so nothing to say. */
function rangeProblem({ from, to }: DateRange, t: Translate): string | null {
  if (!from || !to) return '';
  const days = (Date.parse(to) - Date.parse(from)) / DAY_MS + 1;
  if (days < 1) return t('ov.range_invalid');
  if (days > MAX_RANGE_DAYS) return t('ov.range_too_long', { n: MAX_RANGE_DAYS });
  return null;
}

function duration(minutes: number | null, t: Translate): string {
  if (minutes === null) return '—';
  return minutes >= 60
    ? `${t('charts.hours', { n: Math.floor(minutes / 60) })} ${t('charts.minutes', { n: Math.round(minutes % 60) })}`
    : t('charts.minutes', { n: Math.round(minutes) });
}

/** A small "!" that says, on hover, focus or tap, when the thing beside it is refreshed. */
function InfoTip({ label, children }: { label: string; children: ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <span className="relative inline-flex" onMouseEnter={() => setOpen(true)} onMouseLeave={() => setOpen(false)}>
      <button
        type="button"
        aria-label={label}
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        onBlur={() => setOpen(false)}
        className="grid h-[18px] w-[18px] place-content-center rounded-full text-[11px] font-bold leading-none text-ink-600 ring-1 ring-ink-600/50 transition hover:text-ink-900 hover:ring-ink-900 focus-visible:ring-2 focus-visible:ring-accent-500"
      >
        !
      </button>
      {open && (
        <span
          role="tooltip"
          className="absolute left-0 top-full z-30 mt-2 max-h-64 w-max max-w-[260px] overflow-y-auto rounded-lg bg-ink-900 px-3 py-2 text-left text-xs font-normal leading-snug text-surface shadow-lg"
        >
          {children}
        </span>
      )}
    </span>
  );
}

/** What each building letter on the charts stands for, one line per building. */
function BuildingKey({ items, title }: { items: Array<{ code: string | null; name: string }>; title: string }) {
  if (!items.length) return null;
  return (
    <>
      <span className="mb-1 block font-semibold opacity-70">{title}</span>
      <ul className="space-y-0.5">
        {items.map((b) => (
          <li key={`${b.code}-${b.name}`} className="flex gap-2">
            {b.code && <b className="w-4 shrink-0 text-center">{b.code}</b>}
            <span>{b.name}</span>
          </li>
        ))}
      </ul>
    </>
  );
}

function Tile({
  title,
  hint,
  children,
  className = '',
}: {
  title: string;
  /** A small "!" after the title, for what the picture needs explained. */
  hint?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    // Raised while its tip is open: the glass tiles each have their own layer, and the next one would cover it.
    <Reveal className={`relative hover:z-20 focus-within:z-20 ${className}`}>
      <section className="card flex h-full flex-col p-4 sm:p-5">
        <h3 className="section-title mb-4 flex items-center gap-2">
          {title}
          {hint}
        </h3>
        {/* A column, so a chart can grow into the height its row gives it instead of leaving a gap below. */}
        <InView className="flex flex-1 flex-col">{children}</InView>
      </section>
    </Reveal>
  );
}

/** The key for the building letters: every building of the campus or, until that list arrives, the ones charted. */
function buildingHint(
  places: Place[],
  charted: Array<{ building_code: string; building_name: string }>,
  t: Translate,
): ReactNode {
  const items = places.length
    ? places.map((p) => ({ code: p.code, name: p.name }))
    : charted.filter((b) => b.building_code !== b.building_name).map((b) => ({ code: b.building_code, name: b.building_name }));
  if (!items.length) return null;
  return (
    <InfoTip label={t('ov.building_key')}>
      <BuildingKey items={items} title={t('ov.building_key')} />
    </InfoTip>
  );
}

const buildingTiles = (buildings: Array<{ building_code: string; building_name: string; count: number }>) =>
  buildings.map((b) => ({
    key: b.building_code,
    label: b.building_code === b.building_name ? b.building_name : b.building_code,
    // The building's name, for the readout under the map; a place outside the buildings already is its name.
    sub: b.building_name,
    value: Number(b.count),
  }));

/** Every date of a range, 'YYYY-MM-DD', the way the server fills its daily series. */
function datesOf({ from, to }: DateRange): string[] {
  const days = Math.max(1, Math.round((Date.parse(to) - Date.parse(from)) / DAY_MS) + 1);
  return Array.from({ length: days }, (_, i) => new Date(Date.parse(from) + i * DAY_MS).toISOString().slice(0, 10));
}

/**
 * Zeros for every complaint chart. With nothing to count, or nothing arrived,
 * the charts still stand as empty frames, so the page keeps its shape.
 */
function emptyCharts(range: DateRange): ChartData {
  const dates = datesOf(range);
  return {
    daily: dates.map((date) => ({ date, total: 0, resolved: 0, minutes: null })),
    dailyByPriority: dates.map((date) => ({ date, high: 0, medium: 0, low: 0 })),
    categories: [],
    priorities: [],
    buildings: [],
    resolution: { count: 0, minutes: null },
    top_locations: [],
    hourByDay: [],
    statuses: [],
    aging: [0, 0, 0, 0, 0],
    matrix: [],
    resolutionByPriority: [],
    trend: { days: dates.length, reports: 0, previous_reports: 0, change: null, resolved: 0, high: 0 },
  };
}

/** The same for the staff's reports, with every area of the campus still on the map. */
function emptyCleaning(range: DateRange, areas: CleaningArea[]): CleaningCharts {
  const dates = datesOf(range);
  return {
    trend: { days: dates.length, reports: 0, previous_reports: 0, change: null, alerts: 0 },
    areas: {
      total: areas.length,
      covered: 0,
      missing: areas.map((a) => ({ id: a.id, name: a.name })),
      list: areas.map((a) => ({ ...a, reports: 0 })),
    },
    location: { ok: 0, far: 0, unknown: 0 },
    matrix: [],
    daily: dates.map((date) => ({ date, reports: 0, on_campus: 0, areas: 0, staff: 0 })),
    hours: new Array<number>(24).fill(0),
    tasks: [],
    buildings: [],
    workdays: dates.filter((d) => new Date(`${d}T00:00:00Z`).getUTCDay() !== 0).length,
    staff: [],
  };
}

/** The building letters of the campus, for the rows of a chart that has none of its own yet. */
const buildingCodes = (places: Place[]) => places.flatMap((p) => (p.code ? [p.code] : []));

/**
 * The supervisor's landing view: the whole picture in shapes, with as few words
 * as will do, for the staff's work reports and then complaints, on one page. Everything here
 * comes from the chart endpoints; nothing is computed that the server did not
 * already count. The picked dates drive both sections. The AI summary exists per
 * day, so it shows the last picked date.
 */
/** Where a number on the overview leads: the Reports tab, already filtered to it. */
export type OverviewTarget =
  | { kind: 'complaints'; date: string; status?: 'new' | 'in_progress' | 'resolved'; priority?: 'high' | 'medium' | 'low' }
  | { kind: 'cleaning'; date: string; view: 'recap' | 'reports'; alertsOnly?: boolean };

export default function OverviewPanel({
  onOpenStaff,
  onOpen,
}: {
  onOpenStaff: (staffId: string, range: DateRange) => void;
  onOpen: (target: OverviewTarget) => void;
}) {
  const { t, language } = useLanguage();
  // null until a date is picked: the rolling default.
  const [picked, setPicked] = useState<DateRange | null>(null);
  // What the two date inputs hold, which may be half-typed; only a usable range becomes `picked`.
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [cleaning, setCleaning] = useState<CleaningCharts | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [view, setView] = useState<OverviewView>(savedView);
  // Where the switch sits in the page, so a change made far down starts the new view at its top.
  const switchSpot = useRef<HTMLDivElement>(null);
  const pickView = (v: OverviewView) => {
    setView(v);
    const spot = switchSpot.current?.getBoundingClientRect().top;
    if (spot !== undefined && spot < 0) window.scrollTo({ top: window.scrollY + spot - 60 });
    try {
      sessionStorage.setItem(VIEW_KEY, v);
    } catch {
      /* private mode: the choice simply is not remembered */
    }
  };
  // The summary's own day (the last picked date), for the numbers under it.
  const [day, setDay] = useState<{ complaints: ChartData | null; work: CleaningCharts | null }>({ complaints: null, work: null });
  const [places, setPlaces] = useState<Place[]>([]);
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  // Narrow every chart to one staff member and/or one building; empty is "all".
  const [scope, setScope] = useState<ChartScope>({});
  const [staffOptions, setStaffOptions] = useState<StaffOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const { from, to } = picked ?? rollingRange();
    const run = ++latestLoad.current;
    const oneDay = from === to;
    const [d, c, sum, dayC, dayW] = await Promise.all([
      api.charts(from, to, scope).catch(() => null),
      api.cleaningCharts(from, to, scope).catch(() => null),
      api.summary(to).catch(() => null),
      // A one-day range already is the summary's day: no second request.
      oneDay ? null : api.charts(to, to).catch(() => null),
      oneDay ? null : api.cleaningCharts(to, to).catch(() => null),
    ]);
    // Dates picked in quick succession: only the newest answer may reach the screen.
    if (run !== latestLoad.current) return;
    setData(d);
    setCleaning(c);
    setSummary(sum);
    // The summary's numbers are the whole campus's day, like the AI's text above them: never the filtered ones.
    const narrowed = !!(scope.staff || scope.building);
    const [wholeDayC, wholeDayW] =
      oneDay && narrowed
        ? await Promise.all([api.charts(to, to).catch(() => null), api.cleaningCharts(to, to).catch(() => null)])
        : [oneDay ? d : dayC, oneDay ? c : dayW];
    if (run !== latestLoad.current) return;
    setDay({ complaints: wholeDayC, work: wholeDayW });
    setLoading(false);
  }, [picked, scope]);

  usePolling(load, 60_000);

  // Which building is "A", "B" and so on: the same list the location pickers use (cached for 5 minutes).
  useEffect(() => {
    api
      .cleaningAreas()
      .then((r) => {
        setAreas(r.data);
        setPlaces(buildPlaces(r.data));
      })
      .catch(() => setPlaces([]));
    api
      .staffList()
      .then((r) => setStaffOptions(r.data))
      .catch(() => setStaffOptions([]));
  }, []);

  if (loading) return <p className="mt-6 text-ink-600">{t('common.loading')}</p>;

  const range = picked ?? rollingRange();
  const shown = draft ?? range;
  const problem = rangeProblem(shown, t);
  const today = wibDate();
  const lastDay = new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', {
    timeZone: 'UTC',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  }).format(new Date(range.to));

  const pick = (next: DateRange) => {
    setDraft(next);
    if (rangeProblem(next, t) === null) setPicked(next);
  };

  const exportData = async (format: ExportFormat) => {
    setExporting(true);
    setExportFailed(false);
    try {
      // Fetched for exactly these dates, so the file cannot disagree with its own period.
      const [{ exportDashboard }, charts, reports, cleaningCharts] = await Promise.all([
        import('../lib/export-dashboard'),
        // The file holds what the screen shows: the same dates and the same staff and building filters.
        api.charts(range.from, range.to, scope),
        api.exportReports(range.from, range.to, scope),
        api.cleaningCharts(range.from, range.to, scope).catch(() => null),
      ]);
      await exportDashboard({ format, ...range, charts, reports: reports.data, cleaning: cleaningCharts, t });
    } catch {
      setExportFailed(true);
    } finally {
      setExporting(false);
    }
  };

  // A failed load still draws the frames, with a line saying the zeros are not a count.
  const complaints = data ?? emptyCharts(range);
  const work = cleaning ?? emptyCleaning(range, areas);
  const failed = !data || !cleaning;

  const narrowed = !!(scope.staff || scope.building);

  return (
    <div className="mt-6 space-y-4">
      {/* Three views over the same dates: the day at a glance, then each side in full.
          Pinned under the header while scrolling, as a pane of frosted glass: no strip of its own. */}
      <div ref={switchSpot} aria-hidden className="!mt-0" />
      <div className="sticky top-[85px] z-40 py-2 md:top-[48px]">
        <ViewSwitch value={view} onChange={pickView} />
      </div>

      {/* Above the charts, because everything below answers for these dates and filters. */}
      <div className="card relative z-30 flex flex-wrap items-end gap-3 p-3">
        <label className="w-[calc(50%-0.375rem)] min-w-0 text-xs text-ink-700 sm:w-auto">
          <span className="mb-1 block font-semibold">{t('time.from_date')}</span>
          <input
            type="date"
            className="input !w-full !py-1.5 max-sm:!px-3 max-sm:!text-sm sm:!w-auto"
            value={shown.from}
            max={shown.to || today}
            onChange={(e) => pick({ ...shown, from: e.target.value })}
          />
        </label>
        <label className="w-[calc(50%-0.375rem)] min-w-0 text-xs text-ink-700 sm:w-auto">
          <span className="mb-1 block font-semibold">{t('time.to_date')}</span>
          <input
            type="date"
            className="input !w-full !py-1.5 max-sm:!px-3 max-sm:!text-sm sm:!w-auto"
            value={shown.to}
            min={shown.from || undefined}
            max={today}
            onChange={(e) => pick({ ...shown, to: e.target.value })}
          />
        </label>
        <label className="w-[calc(50%-0.375rem)] min-w-0 text-xs text-ink-700 sm:w-48">
          <span className="mb-1 block font-semibold">{t('export.staff')}</span>
          <Select
            className="input !w-full !py-1.5 max-sm:!px-3 max-sm:!text-sm"
            value={scope.staff ?? ''}
            onChange={(v) => setScope((s) => ({ ...s, staff: v || undefined }))}
            aria-label={t('export.staff')}
          >
            <option value="">{t('clean.all_staff')}</option>
            {staffOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="w-[calc(50%-0.375rem)] min-w-0 text-xs text-ink-700 sm:w-56">
          <span className="mb-1 block font-semibold">{t('ov.buildings')}</span>
          <Select
            className="input !w-full !py-1.5 max-sm:!px-3 max-sm:!text-sm"
            value={scope.building ?? ''}
            onChange={(v) => setScope((s) => ({ ...s, building: v || undefined }))}
            aria-label={t('ov.buildings')}
          >
            <option value="">{t('location.all_buildings')}</option>
            {/* A building by its letter; a place outside the buildings by its name, as the charts group them. */}
            {places.map((p) => (
              <option key={p.key} value={p.code ?? p.name}>
                {p.code ? `${p.code} · ${p.name}` : p.name}
              </option>
            ))}
          </Select>
        </label>
        {(picked || narrowed) && (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setDraft(null);
              setScope({});
            }}
            className="pb-2 text-xs font-semibold text-accent-600 underline underline-offset-2"
          >
            {t('ov.reset_filters')}
          </button>
        )}
        <ExportMenu
          className="max-sm:w-full sm:ml-auto"
          busy={exporting}
          disabled={problem !== null}
          onPick={exportData}
        />
        {failed && (
          <p role="alert" className="w-full text-xs font-semibold text-red-700">
            {t('ov.load_failed')}
          </p>
        )}
        {problem && (
          <p role="alert" className="w-full text-xs font-semibold text-red-700">
            {problem}
          </p>
        )}
        {exportFailed && (
          <p role="alert" className="w-full text-xs font-semibold text-red-700">
            {t('ov.export_failed')}
          </p>
        )}
      </div>

      {view === 'summary' && (
        <>
          {/* One summary for the day, complaints and the staff's work together. */}
          <SummaryCard
            summary={summary}
            onSummary={setSummary}
            date={range.to}
            title={range.to === today ? t('dashboard.summary') : t('dashboard.summary_on', { date: lastDay })}
            complaints={day.complaints}
            work={day.work}
            onOpen={onOpen}
          />
          {/* The staff's work comes first: it is what this system is for. Complaints support it. */}
          <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
            <CleaningHeadline data={work} />
            {/* The line between them: across when they stack, upright when they stand side by side. */}
            <div aria-hidden className="h-px bg-mist-200 xl:h-auto xl:w-px" />
            <ComplaintHeadline data={complaints} />
          </div>
        </>
      )}

      {view === 'staff' && (
        <>
          <CleaningHeadline data={work} wide />
          <CleaningDetails data={work} places={places} onOpenStaff={(id) => onOpenStaff(id, range)} />
        </>
      )}

      {view === 'complaints' && (
        <>
          <ComplaintHeadline data={complaints} wide />
          <ComplaintDetails data={complaints} places={places} />
        </>
      )}
    </div>
  );
}

type OverviewView = 'summary' | 'staff' | 'complaints';
const VIEWS: OverviewView[] = ['summary', 'staff', 'complaints'];
const VIEW_KEY = 'kato.overview.view';

/** Which of the three views was open last in this tab; storage may be blocked, so it is only a convenience. */
function savedView(): OverviewView {
  try {
    const v = sessionStorage.getItem(VIEW_KEY) as OverviewView | null;
    return v && VIEWS.includes(v) ? v : 'summary';
  } catch {
    return 'summary';
  }
}

/** The three-way switch under the dates: Summary, Staff Reports, Complaints. */
function ViewSwitch({ value, onChange }: { value: OverviewView; onChange: (v: OverviewView) => void }) {
  const { t } = useLanguage();
  const label = { summary: t('ov.view_summary'), staff: t('ov.section_staff'), complaints: t('sub.complaints') };
  return (
    <div
      role="tablist"
      aria-label={t('ov.view_label')}
      className="glass grid grid-cols-3 gap-1 rounded-full p-1 sm:inline-grid"
    >
      {VIEWS.map((v) => (
        <button
          key={v}
          type="button"
          role="tab"
          aria-selected={value === v}
          onClick={() => onChange(v)}
          className={`whitespace-nowrap rounded-full px-2 py-2 text-nav font-semibold transition sm:px-5 sm:py-1.5 sm:text-body-sm ${
            value === v ? 'bg-glass text-ink-900 shadow-subtle' : 'text-ink-700 hover:text-ink-900'
          }`}
        >
          {label[v]}
        </button>
      ))}
    </div>
  );
}

/** The day in words, next to the day in shapes: the AI's summary and where reports came from. */
/** One number under the summary that opens the list behind it. */
function SummaryChip({
  value,
  label,
  tone = 'plain',
  onClick,
}: {
  value: ReactNode;
  label: string;
  tone?: 'plain' | 'alert';
  onClick: () => void;
}) {
  const alert = tone === 'alert';
  return (
    <button
      type="button"
      onClick={onClick}
      className={`group inline-flex items-baseline gap-1.5 rounded-full px-3 py-1.5 text-xs ring-1 transition hover:bg-mist-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-500 ${
        alert ? 'text-red-700 ring-red-300' : 'text-ink-700 ring-mist-300'
      }`}
    >
      <b className={`tabular-nums text-sm ${alert ? '' : 'text-ink-900'}`}>{value}</b>
      {label}
      <span aria-hidden className="text-ink-600 transition group-hover:translate-x-0.5">›</span>
    </button>
  );
}

/**
 * The day in a few lines: the AI's paragraph (two lines until opened), and the
 * day's numbers for both sides, each a way into the list behind it.
 */
function SummaryCard({
  summary,
  onSummary,
  date,
  title,
  complaints,
  work,
  onOpen,
}: {
  summary: DailySummary | null;
  onSummary: (s: DailySummary) => void;
  date: string;
  title: string;
  /** The summary's day only, not the picked range. */
  complaints: ChartData | null;
  work: CleaningCharts | null;
  onOpen: (target: OverviewTarget) => void;
}) {
  const { t } = useLanguage();
  const [generating, setGenerating] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const countOf = (status: string) => Number(complaints?.statuses.find((s) => s.status === status)?.count ?? 0);
  const topLocations = complaints?.top_locations.slice(0, 3) ?? [];
  const more = !!summary?.highlights?.length || !!topLocations.length;

  return (
    <Reveal>
      <section className="card px-4 py-3.5 sm:px-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="flex items-center gap-2 text-base font-semibold text-ink-900">
            {title}
            <InfoTip label={t('dashboard.summary_schedule')}>{t('dashboard.summary_schedule')}</InfoTip>
          </h3>
          <button
            className="btn-neutral !min-h-0 !px-3 !py-1 text-xs"
            disabled={generating}
            onClick={async () => {
              setGenerating(true);
              setFailure(null);
              try {
                onSummary(await api.generateSummary(date));
              } catch (err) {
                // The previous summary stays on screen, but the supervisor is told why the new one did not come.
                setFailure(err instanceof Error ? err.message : '');
              } finally {
                setGenerating(false);
              }
            }}
          >
            {generating ? t('dashboard.generating') : t('dashboard.regenerate')}
          </button>
        </div>

        {failure !== null && (
          <p role="alert" className="mt-2 text-xs font-semibold text-red-700">
            {t('dashboard.summary_failed')}
            {failure && <span className="block break-words font-normal opacity-80">{failure.slice(0, 180)}</span>}
          </p>
        )}

        {summary?.exists ? (
          <div className="mt-2">
            <p className={`text-sm leading-relaxed text-ink-800 ${open ? '' : 'line-clamp-2'}`}>{summary.summary}</p>
            {open && (
              <div className="mt-2 grid gap-3 sm:grid-cols-2">
                {!!summary.highlights?.length && (
                  <ul className="space-y-1">
                    {summary.highlights.map((h) => (
                      <li key={h} className="flex gap-2 text-xs text-ink-700">
                        <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                        {h}
                      </li>
                    ))}
                  </ul>
                )}
                {!!topLocations.length && (
                  <div className="text-xs text-ink-700">
                    <p className="mb-1 font-semibold text-ink-600">{t('ov.top_locations')}</p>
                    <ol className="space-y-0.5">
                      {topLocations.map((l) => (
                        <li key={l.location} className="flex justify-between gap-3">
                          <span className="truncate">{l.location}</span>
                          <b className="tabular-nums text-ink-900">{l.count}</b>
                        </li>
                      ))}
                    </ol>
                  </div>
                )}
              </div>
            )}
            {(more || (summary.summary?.length ?? 0) > 160) && (
              <button
                type="button"
                onClick={() => setOpen((o) => !o)}
                aria-expanded={open}
                className="mt-1 text-xs font-semibold text-accent-600 underline underline-offset-2"
              >
                {open ? t('sum.less') : t('sum.more')}
              </button>
            )}
          </div>
        ) : (
          <p className="mt-2 text-sm text-ink-600">{t('dashboard.summary_empty')}</p>
        )}

        {/* The day's numbers, both sides; each opens the list it counts. */}
        <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-mist-200 pt-3">
          {complaints && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 w-full text-nav font-semibold text-ink-600 sm:w-auto">{t('sub.complaints')}</span>
              <SummaryChip value={complaints.trend.reports} label={t('sum.in')} onClick={() => onOpen({ kind: 'complaints', date })} />
              <SummaryChip
                value={countOf('new')}
                label={t('sum.new')}
                onClick={() => onOpen({ kind: 'complaints', date, status: 'new' })}
              />
              <SummaryChip
                value={complaints.trend.high}
                label={t('sum.high')}
                tone={complaints.trend.high ? 'alert' : 'plain'}
                onClick={() => onOpen({ kind: 'complaints', date, priority: 'high' })}
              />
            </div>
          )}
          {work && (
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="mr-0.5 w-full text-nav font-semibold text-ink-600 sm:w-auto">{t('ov.section_staff')}</span>
              <SummaryChip
                value={work.trend.reports}
                label={t('sum.reports')}
                onClick={() => onOpen({ kind: 'cleaning', date, view: 'reports' })}
              />
              <SummaryChip
                value={`${work.areas.covered}/${work.areas.total}`}
                label={t('sum.areas')}
                onClick={() => onOpen({ kind: 'cleaning', date, view: 'recap' })}
              />
              <SummaryChip
                value={work.trend.alerts}
                label={t('sum.flagged')}
                tone={work.trend.alerts ? 'alert' : 'plain'}
                onClick={() => onOpen({ kind: 'cleaning', date, view: 'reports', alertsOnly: true })}
              />
            </div>
          )}
        </div>
      </section>
    </Reveal>
  );
}

/** A section's answer at a glance: one dial, four tiles for the numbers behind it. */
function Headline({
  title,
  dial,
  children,
  wide = false,
}: {
  title: string;
  dial: ReactNode;
  children: ReactNode;
  /** The full page width to itself: the four tiles stand in one row instead of two. */
  wide?: boolean;
}) {
  return (
    <Reveal className="h-full">
      <InView className="flex h-full flex-col">
        <h3 className="section-title mb-3">{title}</h3>
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,200px)_1fr]">
          <section className="card flex items-center justify-center p-3 sm:p-4">
            {/* A phone has the full width to give, and the dial would fill the whole first screen. */}
            <div className="w-32 sm:w-full">{dial}</div>
          </section>
          <div className={`grid grid-cols-2 gap-3 ${wide ? 'lg:grid-cols-4' : ''}`}>{children}</div>
        </div>
      </InView>
    </Reveal>
  );
}

/** The dates of a daily series as "9 Nov", for the readout under a pointer on a sparkline. */
function shortDates(dates: string[], language: string): string[] {
  const f = new Intl.DateTimeFormat(language === 'id' ? 'id-ID' : 'en-GB', { day: 'numeric', month: 'short', timeZone: 'UTC' });
  return dates.map((d) => f.format(new Date(`${d}T00:00:00Z`)));
}

function ComplaintHeadline({ data, wide = false }: { data: ChartData; wide?: boolean }) {
  const { t, language } = useLanguage();
  const days = shortDates(data.daily.map((d) => d.date), language);
  const { trend } = data;
  const rate = trend.reports ? Math.round((trend.resolved / trend.reports) * 100) : 0;
  const open = data.statuses.filter((s) => s.status !== 'resolved').reduce((n, s) => n + Number(s.count), 0);

  return (
    <Headline
      wide={wide} title={t('sub.complaints')} dial={<RadialGauge value={rate} label={t('ov.rate')} />}>
      <KpiCard
        label={t('ov.total_reports')}
        value={trend.reports}
        series={data.daily.map((d) => d.total)}
        seriesLabels={days}
        color={SERIES.received}
        change={trend.change}
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('charts.kpi_high')}
        value={trend.high}
        series={data.dailyByPriority.map((d) => d.high)}
        seriesLabels={days}
        color={PRIORITY_COLORS.high}
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('ov.open')}
        value={open}
        series={data.daily.map((d) => d.total - d.resolved)}
        seriesLabels={days}
        color={PRIORITY_COLORS.medium}
      />
      <KpiCard
        label={t('ov.speed')}
        value={duration(data.resolution.minutes, t)}
        series={data.daily.map((d) => d.minutes)}
        seriesLabels={days}
        describePoint={(m, day) => `${day} · ${duration(m, t)}`}
        color={SINGLE}
        note={`${data.resolution.count} ${t('ov.reports')}`}
      />
    </Headline>
  );
}

function CleaningHeadline({ data, wide = false }: { data: CleaningCharts; wide?: boolean }) {
  const { t, language } = useLanguage();
  const days = shortDates(data.daily.map((d) => d.date), language);
  const { trend, areas } = data;
  const coverage = areas.total ? Math.round((areas.covered / areas.total) * 100) : 0;

  return (
    <Headline
      wide={wide}
      title={t('ov.section_staff')}
      dial={<RadialGauge value={coverage} label={t('ov.clean_reported')} from="#5E5CE6" to="#30B0C7" />}
    >
      <KpiCard
        label={t('ov.clean_reports')}
        value={trend.reports}
        series={data.daily.map((d) => d.reports)}
        seriesLabels={days}
        color={SERIES.resolved}
        change={trend.change}
        goodDirection="up"
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('ov.clean_coverage')}
        value={`${areas.covered}/${areas.total}`}
        series={data.daily.map((d) => d.areas)}
        seriesLabels={days}
        color="#30B0C7"
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('ov.clean_staff')}
        value={data.staff.length}
        series={data.daily.map((d) => d.staff)}
        seriesLabels={days}
        color="#5E5CE6"
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('clean.stat_alerts')}
        value={trend.alerts}
        series={data.daily.map((d) => d.reports - d.on_campus)}
        seriesLabels={days}
        color={PRIORITY_COLORS.high}
        note={t('ov.days', { n: trend.days })}
      />
    </Headline>
  );
}

function ComplaintDetails({ data, places }: { data: ChartData; places: Place[] }) {
  const { t } = useLanguage();

  const hours = useMemo(() => {
    const h = new Array<number>(24).fill(0);
    for (const row of data.hourByDay) h[row.hour] += Number(row.count);
    return h;
  }, [data]);

  const weekHeat = useMemo<HeatmapCell[]>(() => {
    const cells = new Map<string, number>();
    for (const { day, hour, count } of data.hourByDay) {
      const key = `${day}|${HOUR_BUCKETS[Math.floor(hour / 3)]}`;
      cells.set(key, (cells.get(key) ?? 0) + Number(count));
    }
    return [...cells].map(([key, value]) => {
      const [day, hour] = key.split('|');
      return { row: t(`weekday.${day}` as 'weekday.0'), column: `${hour.padStart(2, '0')}.00`, value };
    });
  }, [data, t]);

  const { trend } = data;
  const priorityLabels = {
    high: t('priority_short.high'),
    medium: t('priority_short.medium'),
    low: t('priority_short.low'),
  };
  const count = (rows: Array<{ count: number }>, pick: (r: never) => boolean) =>
    Number(rows.find((r) => pick(r as never))?.count ?? 0);

  const statusSegments = (['new', 'in_progress', 'resolved'] as const).map((k) => ({
    key: k,
    label: t(`status.${k}`),
    value: count(data.statuses, (r: { status: string }) => r.status === k),
    color: STATUS_COLORS[k],
  }));
  const prioritySegments = (['high', 'medium', 'low'] as const).map((k) => ({
    key: k,
    label: priorityLabels[k],
    value: count(data.priorities, (r: { priority: string }) => r.priority === k),
    color: PRIORITY_COLORS[k],
  }));
  const categorySegments = CATEGORY_ORDER.map((k) => ({
    key: k,
    label: t(`category.${k}` as 'category.other'),
    value: count(data.categories, (r: { category: string }) => r.category === k),
    color: CATEGORY_COLORS[k],
  }))
    .filter((c) => c.value > 0)
    .sort((a, b) => b.value - a.value);
  // Nothing counted yet: every category stands at zero instead of the chart vanishing.
  const categoryRings = categorySegments.length
    ? categorySegments
    : CATEGORY_ORDER.map((k) => ({ key: k, label: t(`category.${k}` as 'category.other'), value: 0, color: CATEGORY_COLORS[k] }));

  const codes = buildingCodes(places);
  const charted = [...new Set(data.matrix.map((m) => m.building_code))].sort();
  const buildingsPresent = charted.length ? charted : codes;
  const chartedCategories = CATEGORY_ORDER.filter((c) => data.matrix.some((m) => m.category === c));
  const categoriesPresent = chartedCategories.length ? chartedCategories : CATEGORY_ORDER;
  const tiles = data.buildings.length ? buildingTiles(data.buildings) : codes.map((c) => ({ key: c, label: c, value: 0 }));

  const hint = buildingHint(places, data.buildings, t);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,280px)]">
        <Tile title={t('ov.days', { n: trend.days })}>
          {/* One day has no line to draw, so its two numbers stand as bars. */}
          {data.daily.length > 1 ? (
            <AreaChart data={data.daily} receivedLabel={t('charts.received')} resolvedLabel={t('charts.resolved')} />
          ) : (
            <BarChart
              data={[
                { label: t('charts.received'), value: data.daily[0].total, color: SERIES.received },
                { label: t('charts.resolved'), value: data.daily[0].resolved, color: SERIES.resolved },
              ]}
            />
          )}
        </Tile>
        <Tile title={t('ov.status')}>
          <Donut segments={statusSegments} totalLabel={t('ov.total')} />
        </Tile>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tile title={t('ov.hours')}>
          <HourClock hours={hours} unit={t('ov.reports')} />
        </Tile>
        <Tile title={t('ov.problems')}>
          <RadialBars items={categoryRings} />
        </Tile>
        <Tile title={t('ov.priority')} className="md:col-span-2 lg:col-span-1">
          <Donut segments={prioritySegments} totalLabel={t('ov.total')} />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Tile title={t('ov.buildings')} hint={hint}>
          <Treemap items={tiles} />
        </Tile>
        <Tile title={t('ov.aging')}>
          <AgingBars values={data.aging} labels={AGING_COLORS.map((_, i) => t(`ov.age_${i}` as 'ov.age_0'))} />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Tile title={`${t('ov.buildings')} × ${t('ov.problems')}`} hint={hint}>
          <Heatmap
            data={data.matrix.map((m) => ({ row: m.building_code, column: m.category, value: Number(m.count) }))}
            rows={buildingsPresent}
            columns={categoriesPresent}
            columnLabel={(c) => t(`category.${c}` as 'category.other')}
            verticalLabels
            fewerLabel={t('charts.fewer')}
            moreLabel={t('charts.more')}
          />
        </Tile>
        <Tile title={t('ov.speed')}>
          <BarChart
            data={(['high', 'medium', 'low'] as const).map((p) => {
              const row = data.resolutionByPriority.find((r) => r.priority === p);
              return {
                label: priorityLabels[p],
                value: Math.round(row?.minutes ?? 0),
                display: row ? duration(row.minutes, t) : '—',
                color: PRIORITY_COLORS[p],
              };
            })}
          />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Tile title={t('charts.pattern')}>
          <Heatmap
            data={weekHeat}
            rows={[0, 1, 2, 3, 4, 5, 6].map((d) => t(`weekday.${d}` as 'weekday.0'))}
            columns={HOUR_BUCKETS.map((h) => `${String(h).padStart(2, '0')}.00`)}
            columnLabel={(c) => c.slice(0, 2)}
            fewerLabel={t('charts.fewer')}
            moreLabel={t('charts.more')}
          />
        </Tile>
        <Tile title={t('charts.composition')}>
          <StackedBarChart data={data.dailyByPriority} labels={priorityLabels} />
        </Tile>
      </div>
    </>
  );
}

/**
 * The same dates, for the work the staff reported. Staff do not own areas, so
 * there is no score per person: a gap belongs to the area, and the staff chart
 * only says who did how much. Each question gets its own shape.
 */
function CleaningDetails({
  data,
  places,
  onOpenStaff,
}: {
  data: CleaningCharts;
  places: Place[];
  onOpenStaff: (staffId: string) => void;
}) {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-GB';
  const { trend, areas } = data;
  const hint = buildingHint(places, data.buildings, t);

  const format = (options: Intl.DateTimeFormatOptions, date: string) =>
    new Intl.DateTimeFormat(locale, { timeZone: 'UTC', ...options }).format(new Date(date));
  const charted = [...new Set(data.matrix.map((m) => m.building_code))].sort();
  const buildings = charted.length ? charted : buildingCodes(places);

  return (
    <>
      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <Tile title={t('ov.clean_by_staff')}>
          <StaffBubbles
            staff={data.staff.map((s) => ({
              id: s.staff_id,
              name: s.staff_name,
              value: Number(s.tasks),
              target: Number(s.target),
              alerts: Number(s.alerts),
            }))}
            describe={(name, n, target) =>
              target ? t('ov.clean_bubble', { name, n, target }) : t('ov.clean_bubble_none', { name, n })
            }
            totalLabel={t('ov.clean_bubble_total', { days: data.workdays })}
            onOpen={onOpenStaff}
          />
        </Tile>
        <Tile title={t('ov.clean_tasks')}>
          <TaskDials
            items={CLEANING_TASKS.map((task) => ({
              key: task,
              label: t(`task.${task}`),
              value: Number(data.tasks.find((x) => x.task === task)?.count ?? 0),
            }))}
          />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,280px)]">
        <Tile title={t('ov.clean_map', { covered: areas.covered, total: areas.total })}>
          <CoverageGrid
            areas={areas.list}
            yardKey={t('ov.clean_yard')}
            missingLabel={t('ov.clean_missing')}
            areaLabel={(a) =>
              a.reports ? t('ov.clean_area', { name: a.name, n: a.reports }) : t('ov.clean_area_none', { name: a.name })
            }
          />
        </Tile>
        <Tile title={t('ov.clean_location')}>
          <Donut
            totalLabel={t('ov.total')}
            segments={[
              { key: 'ok', label: t('clean.loc_ok'), value: data.location.ok, color: STATUS_COLORS.resolved },
              { key: 'far', label: t('ov.clean_far'), value: data.location.far, color: PRIORITY_COLORS.high },
              { key: 'unknown', label: t('clean.loc_unknown'), value: data.location.unknown, color: STATUS_COLORS.new },
            ]}
          />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.3fr_1fr]">
        <Tile title={t('ov.clean_calendar')}>
          <CalendarHeat
            data={data.daily.map((d) => ({ date: d.date, value: d.reports }))}
            weekdayLabel={(d) => t(`weekday.${d}` as 'weekday.0')}
            monthLabel={(date) => format({ month: 'short' }, date)}
            dayLabel={(date, n) => t('ov.clean_day', { date: format({ day: 'numeric', month: 'short' }, date), n })}
            fewerLabel={t('charts.fewer')}
            moreLabel={t('charts.more')}
          />
        </Tile>
        <Tile title={t('ov.hours')}>
          <HourBars hours={data.hours} unit={t('ov.reports')} />
        </Tile>
      </div>

      <Tile title={t('ov.clean_building_task')} hint={hint}>
        <Heatmap
          data={data.matrix.map((m) => ({ row: m.building_code, column: m.task, value: Number(m.count) }))}
          rows={buildings}
          columns={[...CLEANING_TASKS]}
          columnLabel={(c) => t(`task.${c}` as 'task.tidy')}
          verticalLabels
          fewerLabel={t('charts.fewer')}
          moreLabel={t('charts.more')}
        />
      </Tile>
    </>
  );
}
