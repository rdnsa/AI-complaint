import { useEffect, useMemo, useState } from 'react';
import BarChart from './charts/BarChart';
import StackedBarChart from './charts/StackedBarChart';
import LineChart from './charts/LineChart';
import KpiCard from './charts/KpiCard';
import Heatmap, { type HeatmapCell } from './charts/Heatmap';
import { PRIORITY_COLORS, SERIES, SINGLE } from './charts/colors';
import { api, type ChartData } from '../lib/api';
import { useLanguage, type Translate } from '../lib/i18n';

/** Hours are bucketed into threes: 24 columns would be unreadable on a phone. */
const HOUR_BUCKETS = [0, 3, 6, 9, 12, 15, 18, 21];

const CATEGORY_ORDER = ['cleanliness', 'supplies', 'damage', 'odor', 'flooding', 'other'];

function duration(minutes: number | null, t: Translate): string {
  if (minutes === null) return '—';
  return minutes >= 60
    ? `${t('charts.hours', { n: Math.floor(minutes / 60) })} ${t('charts.minutes', { n: Math.round(minutes % 60) })}`
    : t('charts.minutes', { n: Math.round(minutes) });
}

export default function ChartsPanel() {
  const { t } = useLanguage();
  const [data, setData] = useState<ChartData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .charts()
      .then(setData)
      .catch(() => setData(null))
      .finally(() => setLoading(false));
  }, []);

  const heat = useMemo<HeatmapCell[]>(() => {
    if (!data) return [];
    const cells = new Map<string, number>();
    for (const { day, hour, count } of data.hourByDay) {
      const bucket = HOUR_BUCKETS[Math.floor(hour / 3)];
      const key = `${day}|${bucket}`;
      cells.set(key, (cells.get(key) ?? 0) + Number(count));
    }
    return [...cells].map(([key, value]) => {
      const [day, hour] = key.split('|');
      return { row: t(`weekday.${day}` as 'weekday.0'), column: `${hour.padStart(2, '0')}.00`, value };
    });
  }, [data, t]);

  if (loading) return <p className="mt-6 text-maroon-600">{t('common.loading')}</p>;
  if (!data) return <p className="card mt-6 p-10 text-center text-maroon-600">{t('charts.no_data')}</p>;

  const { trend } = data;
  const resolvedRate = trend.reports ? Math.round((trend.resolved / trend.reports) * 100) : 0;
  const totalSeries = data.daily.map((d) => d.total);
  const resolvedSeries = data.daily.map((d) => d.resolved);
  const highSeries = data.dailyByPriority.map((d) => d.high);

  const buildingsPresent = [...new Set(data.matrix.map((m) => m.building_code))].sort();
  const categoriesPresent = CATEGORY_ORDER.filter((c) => data.matrix.some((m) => m.category === c));

  const priorityLabels = {
    high: t('priority_short.high'),
    medium: t('priority_short.medium'),
    low: t('priority_short.low'),
  };

  return (
    <div className="mt-6 space-y-4">
      {/* Headline numbers first: the answer before the evidence. */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <KpiCard
          label={t('charts.kpi_reports')}
          value={trend.reports}
          series={totalSeries}
          color={SERIES.received}
          change={trend.change}
          note={t('charts.vs_previous', { n: trend.days })}
        />
        <KpiCard
          label={t('charts.kpi_high')}
          value={trend.high}
          series={highSeries}
          color={PRIORITY_COLORS.high}
          note={t('charts.period', { n: trend.days })}
        />
        <KpiCard
          label={t('charts.kpi_resolution_rate')}
          value={resolvedRate}
          unit="%"
          series={resolvedSeries}
          color={SERIES.resolved}
          goodDirection="up"
          note={t('charts.period', { n: trend.days })}
        />
        <KpiCard
          label={t('charts.average')}
          value={duration(data.resolution.minutes, t)}
          color={SINGLE}
          note={t('charts.average_of', { n: data.resolution.count })}
        />
      </div>

      <section className="card p-5">
        <h3 className="section-title mb-3">{t('charts.daily')}</h3>
        <LineChart data={data.daily} receivedLabel={t('charts.received')} resolvedLabel={t('charts.resolved')} />
      </section>

      <section className="card p-5">
        <h3 className="section-title">{t('charts.composition')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('charts.composition_hint')}</p>
        <StackedBarChart data={data.dailyByPriority} labels={priorityLabels} />
      </section>

      <section className="card p-5">
        <h3 className="section-title">{t('charts.pattern')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('charts.pattern_hint')}</p>
        <Heatmap
          data={heat}
          rows={[0, 1, 2, 3, 4, 5, 6].map((d) => t(`weekday.${d}` as 'weekday.0'))}
          columns={HOUR_BUCKETS.map((h) => `${String(h).padStart(2, '0')}.00`)}
          fewerLabel={t('charts.fewer')}
          moreLabel={t('charts.more')}
        />
      </section>

      <section className="card p-5">
        <h3 className="section-title">{t('charts.matrix')}</h3>
        <p className="mb-3 mt-1 text-xs text-maroon-600">{t('charts.matrix_hint')}</p>
        {buildingsPresent.length ? (
          <Heatmap
            data={data.matrix.map((m) => ({
              row: m.building_code,
              column: m.category,
              value: Number(m.count),
            }))}
            rows={buildingsPresent}
            columns={categoriesPresent}
            columnLabel={(c) => {
              const label = t(`category.${c}` as 'category.other');
              return label.startsWith('category.') ? c : label;
            }}
            fewerLabel={t('charts.fewer')}
            moreLabel={t('charts.more')}
          />
        ) : (
          <p className="text-sm text-maroon-600">{t('charts.no_data')}</p>
        )}
      </section>

      <div className="grid gap-4 lg:grid-cols-2">
        <section className="card p-5">
          <h3 className="section-title">{t('charts.effectiveness')}</h3>
          <p className="mb-3 mt-1 text-xs text-maroon-600">{t('charts.effectiveness_hint')}</p>
          {data.resolutionByPriority.length ? (
            <BarChart
              data={(['high', 'medium', 'low'] as const).map((p) => {
                const row = data.resolutionByPriority.find((r) => r.priority === p);
                return {
                  label: priorityLabels[p],
                  value: Math.round(row?.minutes ?? 0),
                  display: row ? duration(row.minutes, t) : t('charts.none_resolved'),
                  color: PRIORITY_COLORS[p],
                };
              })}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('charts.no_data')}</p>
          )}
        </section>

        <section className="card p-5">
          <h3 className="section-title mb-3">{t('charts.buildings')}</h3>
          {data.buildings.length ? (
            <BarChart
              data={data.buildings.map((b) => ({
                label: `${b.building_code} · ${b.building_name}`,
                value: Number(b.count),
              }))}
            />
          ) : (
            <p className="text-sm text-maroon-600">{t('charts.no_data')}</p>
          )}
        </section>
      </div>
    </div>
  );
}
