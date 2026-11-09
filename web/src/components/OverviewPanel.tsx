import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import AgingBars from './charts/AgingBars';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import CalendarHeat from './charts/CalendarHeat';
import CoverageGrid from './charts/CoverageGrid';
import ExportMenu from './ExportMenu';
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
import { api, CLEANING_TASKS, type ChartData, type CleaningArea, type CleaningCharts, type DailySummary } from '../lib/api';
import { useLanguage, type Translate } from '../lib/i18n';
import { buildPlaces, type Place } from '../lib/places';
import type { ExportFormat } from '../lib/export-dashboard';
import { Reveal } from '../lib/motion';
import { usePolling } from '../lib/polling';

export interface DateRange {
  from: string;
  to: string;
}

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
    daily: dates.map((date) => ({ date, total: 0, resolved: 0 })),
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
    daily: dates.map((date) => ({ date, reports: 0, on_campus: 0 })),
    hours: new Array<number>(24).fill(0),
    tasks: [],
    buildings: [],
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
export default function OverviewPanel({ onOpenStaff }: { onOpenStaff: (staffId: string, range: DateRange) => void }) {
  const { t, language } = useLanguage();
  // null until a date is picked: the rolling default.
  const [picked, setPicked] = useState<DateRange | null>(null);
  // What the two date inputs hold, which may be half-typed; only a usable range becomes `picked`.
  const [draft, setDraft] = useState<DateRange | null>(null);
  const [data, setData] = useState<ChartData | null>(null);
  const [cleaning, setCleaning] = useState<CleaningCharts | null>(null);
  const [summary, setSummary] = useState<DailySummary | null>(null);
  const [places, setPlaces] = useState<Place[]>([]);
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(false);
  const [exportFailed, setExportFailed] = useState(false);
  const latestLoad = useRef(0);

  const load = useCallback(async () => {
    const { from, to } = picked ?? rollingRange();
    const run = ++latestLoad.current;
    const [d, c, sum] = await Promise.all([
      api.charts(from, to).catch(() => null),
      api.cleaningCharts(from, to).catch(() => null),
      api.summary(to).catch(() => null),
    ]);
    // Dates picked in quick succession: only the newest answer may reach the screen.
    if (run !== latestLoad.current) return;
    setData(d);
    setCleaning(c);
    setSummary(sum);
    setLoading(false);
  }, [picked]);

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
        api.charts(range.from, range.to),
        api.exportReports(range.from, range.to),
        api.cleaningCharts(range.from, range.to).catch(() => null),
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

  return (
    <div className="mt-6 space-y-4">
      {/* Above everything, because everything below answers for these dates. */}
      <div className="card relative z-30 flex flex-wrap items-end gap-3 p-3">
        <label className="min-w-0 flex-1 text-xs text-ink-700 sm:flex-none">
          <span className="mb-1 block font-semibold">{t('time.from_date')}</span>
          <input
            type="date"
            className="input !w-full !py-1.5 max-sm:!px-3 max-sm:!text-sm sm:!w-auto"
            value={shown.from}
            max={shown.to || today}
            onChange={(e) => pick({ ...shown, from: e.target.value })}
          />
        </label>
        <label className="min-w-0 flex-1 text-xs text-ink-700 sm:flex-none">
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
        {picked && (
          <button
            type="button"
            onClick={() => {
              setPicked(null);
              setDraft(null);
            }}
            className="pb-2 text-xs font-semibold text-accent-600 underline underline-offset-2"
          >
            {t('time.reset')}
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

      {/* The staff's work comes first: it is what this system is for. Complaints support it. */}
      {/* One summary for the day, complaints and the staff's work together, above both sections. */}
      <SummaryCard
        summary={summary}
        onSummary={setSummary}
        date={range.to}
        title={range.to === today ? t('dashboard.summary') : t('dashboard.summary_on', { date: lastDay })}
        topLocations={data?.top_locations ?? []}
        missingAreas={cleaning?.areas.missing ?? []}
      />

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)]">
        <CleaningHeadline data={work} />
        {/* The line between them: across when they stack, upright when they stand side by side. */}
        <div aria-hidden className="h-px bg-mist-200 xl:h-auto xl:w-px" />
        <ComplaintHeadline data={complaints} />
      </div>

      <SectionTitle>{t('ov.section_staff')}</SectionTitle>
      <CleaningDetails data={work} places={places} onOpenStaff={(id) => onOpenStaff(id, range)} />

      <SectionTitle>{t('sub.complaints')}</SectionTitle>
      <ComplaintDetails data={complaints} places={places} />
    </div>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return (
    <h2 className="!mt-10 !mb-6 flex items-center gap-4 font-display text-xl font-semibold text-ink-900 sm:text-2xl">
      <span aria-hidden className="h-px flex-1 bg-mist-200" />
      {children}
      <span aria-hidden className="h-px flex-1 bg-mist-200" />
    </h2>
  );
}

/** The day in words, next to the day in shapes: the AI's summary and where reports came from. */
function SummaryCard({
  summary,
  onSummary,
  date,
  title,
  topLocations,
  missingAreas,
}: {
  summary: DailySummary | null;
  onSummary: (s: DailySummary) => void;
  date: string;
  title: string;
  topLocations: ChartData['top_locations'];
  /** Areas no staff report has come from in the picked dates. */
  missingAreas: CleaningCharts['areas']['missing'];
}) {
  const { t } = useLanguage();
  const [generating, setGenerating] = useState(false);

  return (
      <Reveal>
        <section className="card overflow-hidden">
          <div className="flex items-center justify-between gap-3 px-5 pt-5">
            <h3 className="section-title flex items-center gap-2">
              {title}
              <InfoTip label={t('dashboard.summary_schedule')}>{t('dashboard.summary_schedule')}</InfoTip>
            </h3>
            <button
              className="btn-neutral !px-3 !py-1.5 text-xs"
              disabled={generating}
              onClick={async () => {
                setGenerating(true);
                try {
                  onSummary(await api.generateSummary(date));
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

          <div className="grid gap-6 p-5 lg:grid-cols-[1.6fr_1fr]">
            <div>
              {summary?.exists ? (
                <>
                  <p className="leading-relaxed text-ink-900">{summary.summary}</p>
                  {!!summary.highlights?.length && (
                    <ul className="mt-3 space-y-1.5">
                      {summary.highlights.map((h) => (
                        <li key={h} className="flex gap-2 text-sm text-ink-700">
                          <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500" />
                          {h}
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              ) : (
                <p className="text-sm text-ink-600">{t('dashboard.summary_empty')}</p>
              )}
            </div>

            {/* Both sides at a glance: where complaints pile up, and where no staff report has come from. */}
            {(!!topLocations.length || !!missingAreas.length) && (
              <div className="space-y-5">
                {!!topLocations.length && (
                  <div>
                    <p className="mb-2 text-nav font-semibold text-ink-600">{t('ov.top_locations')}</p>
                    <BarChart data={topLocations.map((l) => ({ label: l.location, value: Number(l.count) }))} />
                  </div>
                )}
                {!!missingAreas.length && (
                  <div>
                    <p className="mb-2 text-nav font-semibold text-ink-600">
                      {t('ov.clean_missing')} · {missingAreas.length}
                    </p>
                    <ul className="flex flex-wrap gap-1.5">
                      {missingAreas.slice(0, 8).map((a) => (
                        <li
                          key={a.id}
                          className="rounded-full border border-dashed border-ink-600/50 px-2.5 py-0.5 text-xs font-semibold text-ink-700"
                        >
                          {a.name}
                        </li>
                      ))}
                      {missingAreas.length > 8 && (
                        <li className="px-1 py-0.5 text-xs font-semibold text-ink-600">+{missingAreas.length - 8}</li>
                      )}
                    </ul>
                  </div>
                )}
              </div>
            )}
          </div>
        </section>
      </Reveal>
  );
}

/** A section's answer at a glance: one dial, four tiles for the numbers behind it. */
function Headline({ title, dial, children }: { title: string; dial: ReactNode; children: ReactNode }) {
  return (
    <Reveal className="h-full">
      <InView className="flex h-full flex-col">
        <h3 className="section-title mb-3">{title}</h3>
        <div className="grid flex-1 gap-3 sm:grid-cols-[minmax(0,200px)_1fr]">
          <section className="card flex items-center justify-center p-4">
            {/* A phone has the full width to give, and the dial would fill the whole first screen. */}
            <div className="w-40 sm:w-full">{dial}</div>
          </section>
          <div className="grid grid-cols-2 gap-3">{children}</div>
        </div>
      </InView>
    </Reveal>
  );
}

function ComplaintHeadline({ data }: { data: ChartData }) {
  const { t } = useLanguage();
  const { trend } = data;
  const rate = trend.reports ? Math.round((trend.resolved / trend.reports) * 100) : 0;
  const open = data.statuses.filter((s) => s.status !== 'resolved').reduce((n, s) => n + Number(s.count), 0);

  return (
    <Headline title={t('sub.complaints')} dial={<RadialGauge value={rate} label={t('ov.rate')} />}>
      <KpiCard
        label={t('ov.total_reports')}
        value={trend.reports}
        series={data.daily.map((d) => d.total)}
        color={SERIES.received}
        change={trend.change}
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('charts.kpi_high')}
        value={trend.high}
        series={data.dailyByPriority.map((d) => d.high)}
        color={PRIORITY_COLORS.high}
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('ov.open')}
        value={open}
        series={data.daily.map((d) => d.total - d.resolved)}
        color={PRIORITY_COLORS.medium}
      />
      <KpiCard
        label={t('ov.speed')}
        value={duration(data.resolution.minutes, t)}
        color={SINGLE}
        note={`${data.resolution.count} ${t('ov.reports')}`}
      />
    </Headline>
  );
}

function CleaningHeadline({ data }: { data: CleaningCharts }) {
  const { t } = useLanguage();
  const { trend, areas } = data;
  const coverage = areas.total ? Math.round((areas.covered / areas.total) * 100) : 0;

  return (
    <Headline
      title={t('ov.section_staff')}
      dial={<RadialGauge value={coverage} label={t('ov.clean_reported')} from="#5E5CE6" to="#30B0C7" />}
    >
      <KpiCard
        label={t('ov.clean_reports')}
        value={trend.reports}
        series={data.daily.map((d) => d.reports)}
        color={SERIES.resolved}
        change={trend.change}
        goodDirection="up"
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard
        label={t('ov.clean_coverage')}
        value={`${areas.covered}/${areas.total}`}
        color={SINGLE}
        note={t('ov.days', { n: trend.days })}
      />
      <KpiCard label={t('ov.clean_staff')} value={data.staff.length} color={SINGLE} note={t('ov.days', { n: trend.days })} />
      <KpiCard
        label={t('clean.stat_alerts')}
        value={trend.alerts}
        series={data.daily.map((d) => d.reports - d.on_campus)}
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
            staff={data.staff.map((s) => ({ id: s.staff_id, name: s.staff_name, value: Number(s.tasks), alerts: Number(s.alerts) }))}
            describe={(name, n) => t('ov.clean_bubble', { name, n })}
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
