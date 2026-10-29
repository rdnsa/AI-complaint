import { useCallback, useEffect, useMemo, useState, type ReactNode } from 'react';
import AgingBars from './charts/AgingBars';
import AreaChart from './charts/AreaChart';
import BarChart from './charts/BarChart';
import Donut from './charts/Donut';
import Heatmap, { type HeatmapCell } from './charts/Heatmap';
import HourClock from './charts/HourClock';
import KpiCard from './charts/KpiCard';
import RadialBars from './charts/RadialBars';
import RadialGauge from './charts/RadialGauge';
import StackedBarChart from './charts/StackedBarChart';
import StaffRings from './charts/StaffRings';
import Treemap from './charts/Treemap';
import { AGING_COLORS, CATEGORY_COLORS, PRIORITY_COLORS, SERIES, SINGLE, STATUS_COLORS } from './charts/colors';
import { api, type ChartData, type CleaningRecap, type DailyStats } from '../lib/api';
import { useLanguage, type Translate } from '../lib/i18n';
import { Reveal } from '../lib/motion';

const RANGES = [7, 14, 30, 90] as const;
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21];
const CATEGORY_ORDER = ['cleanliness', 'supplies', 'damage', 'odor', 'flooding', 'other'];

function duration(minutes: number | null, t: Translate): string {
  if (minutes === null) return '—';
  return minutes >= 60
    ? `${t('charts.hours', { n: Math.floor(minutes / 60) })} ${t('charts.minutes', { n: Math.round(minutes % 60) })}`
    : t('charts.minutes', { n: Math.round(minutes) });
}

function Tile({ title, children, className = '' }: { title: string; children: ReactNode; className?: string }) {
  return (
    <Reveal className={className}>
      <section className="card h-full p-5">
        <h3 className="section-title mb-4">{title}</h3>
        {children}
      </section>
    </Reveal>
  );
}

/**
 * The supervisor's landing view: the whole picture in shapes, with as few words
 * as will do. Everything here comes from the existing chart, stats and cleaning
 * recap endpoints; nothing is computed that the server did not already count.
 */
export default function OverviewPanel() {
  const { t } = useLanguage();
  const [days, setDays] = useState<(typeof RANGES)[number]>(14);
  const [data, setData] = useState<ChartData | null>(null);
  const [stats, setStats] = useState<DailyStats | null>(null);
  const [recap, setRecap] = useState<CleaningRecap | null>(null);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    const today = new Date(Date.now() + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
    const [d, s, r] = await Promise.all([
      api.charts(days).catch(() => null),
      api.stats().catch(() => null),
      api.cleaningRecap(today).catch(() => null),
    ]);
    setData(d);
    setStats(s);
    setRecap(r);
    setLoading(false);
  }, [days]);

  useEffect(() => {
    load();
    const timer = setInterval(load, 60_000);
    return () => clearInterval(timer);
  }, [load]);

  const hours = useMemo(() => {
    const h = new Array<number>(24).fill(0);
    for (const row of data?.hourByDay ?? []) h[row.hour] += Number(row.count);
    return h;
  }, [data]);

  const weekHeat = useMemo<HeatmapCell[]>(() => {
    const cells = new Map<string, number>();
    for (const { day, hour, count } of data?.hourByDay ?? []) {
      const key = `${day}|${HOUR_BUCKETS[Math.floor(hour / 3)]}`;
      cells.set(key, (cells.get(key) ?? 0) + Number(count));
    }
    return [...cells].map(([key, value]) => {
      const [day, hour] = key.split('|');
      return { row: t(`weekday.${day}` as 'weekday.0'), column: `${hour.padStart(2, '0')}.00`, value };
    });
  }, [data, t]);

  if (loading) return <p className="mt-6 text-ink-600">{t('common.loading')}</p>;
  if (!data) return <p className="card mt-6 p-10 text-center text-ink-600">{t('charts.no_data')}</p>;

  const { trend } = data;
  const rate = trend.reports ? Math.round((trend.resolved / trend.reports) * 100) : 0;
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

  const buildingItems = data.buildings.map((b) => ({
    key: b.building_code,
    label: b.building_code === b.building_name ? b.building_name : b.building_code,
    value: Number(b.count),
  }));
  const buildingsPresent = [...new Set(data.matrix.map((m) => m.building_code))].sort();
  const categoriesPresent = CATEGORY_ORDER.filter((c) => data.matrix.some((m) => m.category === c));

  const staff = (recap?.staff ?? [])
    .filter((s) => s.expected > 0 || s.reports > 0)
    .map((s) => ({ id: s.staff_id, name: s.staff_name, done: s.done, expected: s.expected, alerts: s.alerts }));
  const cleaningPct = recap && recap.totals.expected ? Math.round((recap.totals.done / recap.totals.expected) * 100) : 0;

  return (
    <div className="mt-6 space-y-4">
      <div className="flex justify-end">
        <div className="inline-flex gap-1 rounded-full bg-mist-200 p-1" role="group">
          {RANGES.map((n) => (
            <button
              key={n}
              onClick={() => setDays(n)}
              aria-pressed={days === n}
              className={`rounded-full px-3.5 py-1 text-nav font-semibold tabular-nums transition ${
                days === n ? 'bg-glass text-ink-900 shadow-subtle' : 'text-ink-700 hover:text-ink-900'
              }`}
            >
              {n}
            </button>
          ))}
        </div>
      </div>

      {/* The headline: one dial for the answer, four tiles for the numbers behind it. */}
      <Reveal>
        <div className="grid gap-4 lg:grid-cols-[minmax(0,300px)_1fr]">
          <section className="card grid place-content-center p-6">
            <RadialGauge value={rate} label={t('ov.rate')} />
          </section>
          <div className="grid grid-cols-2 gap-3">
            <KpiCard
              label={t('ov.today')}
              value={stats?.today.total ?? 0}
              series={data.daily.map((d) => d.total)}
              color={SERIES.received}
              change={trend.change}
              note={t('ov.days', { n: trend.days })}
            />
            <KpiCard
              label={t('charts.kpi_high')}
              value={stats?.today.high ?? 0}
              series={data.dailyByPriority.map((d) => d.high)}
              color={PRIORITY_COLORS.high}
              note={t('ov.today')}
            />
            <KpiCard
              label={t('ov.open')}
              value={stats?.unresolved ?? 0}
              series={data.daily.map((d) => d.total - d.resolved)}
              color={PRIORITY_COLORS.medium}
            />
            <KpiCard
              label={t('ov.speed')}
              value={duration(data.resolution.minutes, t)}
              color={SINGLE}
              note={`${data.resolution.count} ${t('ov.reports')}`}
            />
          </div>
        </div>
      </Reveal>

      <div className="grid gap-4 lg:grid-cols-[1fr_minmax(0,280px)]">
        <Tile title={t('ov.days', { n: trend.days })}>
          <AreaChart data={data.daily} receivedLabel={t('charts.received')} resolvedLabel={t('charts.resolved')} />
        </Tile>
        <Tile title={t('ov.status')}>
          <Donut segments={statusSegments} totalLabel={t('ov.total')} />
        </Tile>
      </div>

      {staff.length > 0 && (
        <Tile title={t('ov.cleaning')}>
          <div className="flex flex-col gap-6 sm:flex-row sm:items-center">
            <div className="w-40 shrink-0 self-center">
              <RadialGauge value={cleaningPct} from="#5E5CE6" to="#30B0C7" />
            </div>
            <StaffRings staff={staff} />
          </div>
        </Tile>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Tile title={t('ov.hours')}>
          <HourClock hours={hours} unit={t('ov.reports')} />
        </Tile>
        <Tile title={t('ov.problems')}>
          <RadialBars items={categorySegments} />
        </Tile>
        <Tile title={t('ov.priority')} className="md:col-span-2 lg:col-span-1">
          <Donut segments={prioritySegments} totalLabel={t('ov.total')} />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Tile title={t('ov.buildings')}>
          <Treemap items={buildingItems} />
        </Tile>
        <Tile title={t('ov.aging')}>
          <AgingBars values={data.aging} labels={AGING_COLORS.map((_, i) => t(`ov.age_${i}` as 'ov.age_0'))} />
        </Tile>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <Tile title={`${t('ov.buildings')} × ${t('ov.problems')}`}>
          {buildingsPresent.length ? (
            <Heatmap
              data={data.matrix.map((m) => ({ row: m.building_code, column: m.category, value: Number(m.count) }))}
              rows={buildingsPresent}
              columns={categoriesPresent}
              columnLabel={(c) => t(`category.${c}` as 'category.other')}
              verticalLabels
              fewerLabel={t('charts.fewer')}
              moreLabel={t('charts.more')}
            />
          ) : (
            <p className="text-sm text-ink-600">{t('charts.no_data')}</p>
          )}
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
    </div>
  );
}
