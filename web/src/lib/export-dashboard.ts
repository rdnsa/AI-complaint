import writeExcelFile, { type Row, type Sheet } from 'write-excel-file/browser';
import type { ChartData, CleaningRecap, ExportReport } from './api';
import type { Translate } from './i18n';

const head = (labels: string[]): Row => labels.map((value) => ({ value, fontWeight: 'bold' }));
/** An empty cell is left truly empty, so Excel can still sum and filter the column. */
const plain = (values: Array<string | number | null>): Row => values.map((value) => (value === null ? null : { value }));

/** A titled two-column table in the summary sheet, with a blank line after it. */
function section(title: string, rows: Array<[string, string | number | null]>): Row[] {
  return [head([title]), ...rows.map(([label, value]) => plain([label, value])), []];
}

const rounded = (minutes: number | null) => (minutes === null ? null : Math.round(minutes));

/**
 * Writes what the overview shows for a date range to an .xlsx file: the numbers
 * behind the charts, the daily series, and every report of the range. Complaint
 * text arrives as string cells, so nothing a reporter typed can run as a formula.
 */
export async function exportDashboard({
  from,
  to,
  charts,
  reports,
  recap,
  t,
}: {
  from: string;
  to: string;
  charts: ChartData;
  reports: ExportReport[];
  recap: CleaningRecap | null;
  t: Translate;
}): Promise<void> {
  const priorityLabel = (p: string | null) => (p ? t(`priority_short.${p}` as 'priority_short.high') : '');
  const categoryLabel = (c: string) => t(`category.${c}` as 'category.other');
  const countOf = (rows: Array<{ count: number }>) => Number(rows.reduce((sum, r) => sum + Number(r.count), 0));

  const hours = new Array<number>(24).fill(0);
  for (const row of charts.hourByDay) hours[row.hour] += Number(row.count);

  const open = countOf(charts.statuses.filter((s) => s.status !== 'resolved'));

  const summary: Row[] = [
    head([t('export.title')]),
    plain([t('export.period'), `${from} – ${to}`]),
    [],
    ...section(t('export.key_numbers'), [
      [t('ov.total_reports'), charts.trend.reports],
      [t('export.previous_period'), charts.trend.previous_reports],
      [t('export.change_pct'), charts.trend.change],
      [t('ov.rate'), charts.trend.resolved],
      [t('charts.kpi_high'), charts.trend.high],
      [t('ov.open'), open],
      [t('export.avg_minutes'), rounded(charts.resolution.minutes)],
    ]),
    ...section(
      t('ov.status'),
      charts.statuses.map((s) => [t(`status.${s.status}` as 'status.new'), Number(s.count)]),
    ),
    ...section(
      t('ov.priority'),
      charts.priorities.map((p) => [priorityLabel(p.priority), Number(p.count)]),
    ),
    ...section(
      t('ov.problems'),
      charts.categories.map((c) => [categoryLabel(c.category), Number(c.count)]),
    ),
    ...section(
      t('ov.top_locations'),
      charts.top_locations.map((l) => [l.location, Number(l.count)]),
    ),
    ...section(
      t('ov.buildings'),
      charts.buildings.map((b) => [
        b.building_code === b.building_name ? b.building_name : `${b.building_code} - ${b.building_name}`,
        Number(b.count),
      ]),
    ),
    ...section(
      `${t('ov.buildings')} × ${t('ov.problems')}`,
      charts.matrix.map((m) => [`${m.building_code} · ${categoryLabel(m.category)}`, Number(m.count)]),
    ),
    ...section(
      t('ov.aging'),
      charts.aging.map((n, i) => [t(`ov.age_${i}` as 'ov.age_0'), n]),
    ),
    ...section(
      t('export.avg_minutes_by_priority'),
      charts.resolutionByPriority.map((r) => [priorityLabel(r.priority), rounded(r.minutes)]),
    ),
    ...section(
      t('ov.hours'),
      hours.map((n, h) => [`${String(h).padStart(2, '0')}.00`, n]),
    ),
  ];

  const priorityByDate = new Map(charts.dailyByPriority.map((d) => [d.date, d]));
  const daily: Row[] = [
    head([
      t('export.date'),
      t('charts.received'),
      t('charts.resolved'),
      t('priority_short.high'),
      t('priority_short.medium'),
      t('priority_short.low'),
    ]),
    ...charts.daily.map((d) => {
      const p = priorityByDate.get(d.date);
      return plain([d.date, d.total, d.resolved, p?.high ?? 0, p?.medium ?? 0, p?.low ?? 0]);
    }),
  ];

  const rows: Row[] = [
    head([
      t('time.received'),
      t('time.resolved'),
      t('export.minutes'),
      t('export.location'),
      t('ov.buildings'),
      t('ov.status'),
      t('ov.priority'),
      t('ov.problems'),
      t('export.summary'),
      t('export.description'),
      t('export.recommendation'),
      t('export.staff'),
      t('export.id'),
    ]),
    ...reports.map((r) =>
      plain([
        r.created_wib,
        r.resolved_wib,
        r.minutes_to_resolve,
        r.location_name,
        r.building_code ?? r.building_name,
        t(`status.${r.status}` as 'status.new'),
        priorityLabel(r.priority),
        r.categories.map(categoryLabel).join(', '),
        r.summary,
        r.description,
        r.recommendation,
        r.staff_name,
        r.id,
      ]),
    ),
  ];

  const sheets: Sheet<Blob>[] = [
    { data: summary, sheet: t('export.sheet_summary'), columns: [{ width: 34 }, { width: 24 }] },
    { data: daily, sheet: t('export.sheet_daily'), columns: [{ width: 14 }], stickyRowsCount: 1 },
    {
      data: rows,
      sheet: t('export.sheet_reports'),
      columns: [
        { width: 20 }, { width: 20 }, { width: 10 }, { width: 28 }, { width: 10 }, { width: 14 }, { width: 10 },
        { width: 24 }, { width: 48 }, { width: 48 }, { width: 48 }, { width: 18 }, { width: 38 },
      ],
      stickyRowsCount: 1,
    },
  ];

  // Cleaning is counted one day at a time, so its sheet carries the date it is for.
  if (recap) {
    sheets.push({
      data: [
        head([t('export.staff'), t('export.tasks_done'), t('export.tasks_expected'), t('export.cleaning_reports'), t('export.alerts')]),
        ...recap.staff
          .filter((s) => s.expected > 0 || s.reports > 0)
          .map((s) => plain([s.staff_name, s.done, s.expected, s.reports, s.alerts])),
      ],
      sheet: `${t('export.sheet_cleaning')} ${to}`,
      columns: [{ width: 24 }, { width: 14 }, { width: 14 }, { width: 14 }, { width: 14 }],
      stickyRowsCount: 1,
    });
  }

  await writeExcelFile(sheets).toFile(`kato-dashboard_${from}_${to}.xlsx`);
}
