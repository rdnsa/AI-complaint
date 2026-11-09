import type { Row } from 'write-excel-file/browser';
import type { ChartData, CleaningCharts, ExportReport } from './api';
import type { Translate } from './i18n';

export type ExportFormat = 'xlsx' | 'csv' | 'pdf';

type Cell = string | number | null;

/** One table: an optional title line, an optional header row, then the rows. */
interface Table {
  title?: string;
  header?: string[];
  rows: Cell[][];
}

/** A sheet in Excel, a block in the CSV, a part of the PDF. */
interface Section {
  name: string;
  tables: Table[];
  /** Column widths in Excel's units. */
  widths: number[];
  /** A single table with a header row: Excel keeps that row in view while scrolling. */
  sticky?: boolean;
}

const rounded = (minutes: number | null) => (minutes === null ? null : Math.round(minutes));

/** A titled two-column table: a label and its number. */
const pairs = (title: string, rows: Array<[string, Cell]>): Table => ({ title, rows });

/**
 * What the overview shows for a date range, once, in a shape any file format
 * can take: the numbers behind the charts, the daily series, every report of
 * the range, and the staff's cleaning work.
 */
function buildSections({
  from,
  to,
  charts,
  reports,
  cleaning,
  t,
}: {
  from: string;
  to: string;
  charts: ChartData;
  reports: ExportReport[];
  cleaning: CleaningCharts | null;
  t: Translate;
}): Section[] {
  const priorityLabel = (p: string | null) => (p ? t(`priority_short.${p}` as 'priority_short.high') : '');
  const categoryLabel = (c: string) => t(`category.${c}` as 'category.other');
  const countOf = (rows: Array<{ count: number }>) => Number(rows.reduce((sum, r) => sum + Number(r.count), 0));
  const buildingName = (b: { building_code: string; building_name: string }) =>
    b.building_code === b.building_name ? b.building_name : `${b.building_code} - ${b.building_name}`;

  const hours = new Array<number>(24).fill(0);
  for (const row of charts.hourByDay) hours[row.hour] += Number(row.count);
  const open = countOf(charts.statuses.filter((s) => s.status !== 'resolved'));
  const period: Table = { title: t('export.title'), rows: [[t('export.period'), `${from} – ${to}`]] };

  const sections: Section[] = [
    {
      name: t('export.sheet_summary'),
      widths: [34, 24],
      tables: [
        period,
        pairs(t('export.key_numbers'), [
          [t('ov.total_reports'), charts.trend.reports],
          [t('export.previous_period'), charts.trend.previous_reports],
          [t('export.change_pct'), charts.trend.change],
          [t('ov.rate'), charts.trend.resolved],
          [t('charts.kpi_high'), charts.trend.high],
          [t('ov.open'), open],
          [t('export.avg_minutes'), rounded(charts.resolution.minutes)],
        ]),
        pairs(t('ov.status'), charts.statuses.map((s) => [t(`status.${s.status}` as 'status.new'), Number(s.count)])),
        pairs(t('ov.priority'), charts.priorities.map((p) => [priorityLabel(p.priority), Number(p.count)])),
        pairs(t('ov.problems'), charts.categories.map((c) => [categoryLabel(c.category), Number(c.count)])),
        pairs(t('ov.top_locations'), charts.top_locations.map((l) => [l.location, Number(l.count)])),
        pairs(t('ov.buildings'), charts.buildings.map((b) => [buildingName(b), Number(b.count)])),
        pairs(
          `${t('ov.buildings')} × ${t('ov.problems')}`,
          charts.matrix.map((m) => [`${m.building_code} · ${categoryLabel(m.category)}`, Number(m.count)]),
        ),
        pairs(t('ov.aging'), charts.aging.map((n, i) => [t(`ov.age_${i}` as 'ov.age_0'), n])),
        pairs(
          t('export.avg_minutes_by_priority'),
          charts.resolutionByPriority.map((r) => [priorityLabel(r.priority), rounded(r.minutes)]),
        ),
        pairs(t('ov.hours'), hours.map((n, h) => [`${String(h).padStart(2, '0')}.00`, n])),
      ],
    },
  ];

  const priorityByDate = new Map(charts.dailyByPriority.map((d) => [d.date, d]));
  sections.push({
    name: t('export.sheet_daily'),
    widths: [14],
    sticky: true,
    tables: [
      {
        header: [
          t('export.date'),
          t('charts.received'),
          t('charts.resolved'),
          t('priority_short.high'),
          t('priority_short.medium'),
          t('priority_short.low'),
        ],
        rows: charts.daily.map((d) => {
          const p = priorityByDate.get(d.date);
          return [d.date, d.total, d.resolved, p?.high ?? 0, p?.medium ?? 0, p?.low ?? 0];
        }),
      },
    ],
  });

  sections.push({
    name: t('export.sheet_reports'),
    widths: [20, 20, 10, 28, 10, 14, 10, 24, 48, 48, 48, 18, 38],
    sticky: true,
    tables: [
      {
        header: [
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
        ],
        rows: reports.map((r) => [
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
      },
    ],
  });

  if (cleaning) {
    const { trend, areas } = cleaning;
    sections.push({
      name: t('export.sheet_cleaning'),
      widths: [44, 16, 16, 14, 18],
      tables: [
        { title: t('tab.cleaning'), rows: [[t('export.period'), `${from} – ${to}`]] },
        pairs(t('export.key_numbers'), [
          [t('ov.clean_reports'), trend.reports],
          [t('export.previous_period'), trend.previous_reports],
          [t('export.change_pct'), trend.change],
          [t('ov.clean_coverage'), `${areas.covered}/${areas.total}`],
          [t('ov.clean_staff'), cleaning.staff.length],
          [t('clean.stat_alerts'), trend.alerts],
        ]),
        pairs(t('ov.clean_tasks'), cleaning.tasks.map((x) => [t(`task.${x.task}`), Number(x.count)])),
        pairs(t('ov.buildings'), cleaning.buildings.map((b) => [buildingName(b), Number(b.count)])),
        // Nobody owns an area, so the gap is listed by place, not by person.
        { title: t('ov.clean_missing'), rows: areas.missing.map((a) => [a.name]) },
        {
          header: [
            t('export.staff'),
            t('export.tasks_done'),
            t('export.areas_worked'),
            t('export.cleaning_reports'),
            t('export.alerts'),
          ],
          rows: cleaning.staff.map((s) => [s.staff_name, Number(s.tasks), Number(s.areas), Number(s.reports), Number(s.alerts)]),
        },
        {
          header: [t('export.date'), t('clean.stat_reports'), t('clean.loc_ok')],
          rows: cleaning.daily.map((d) => [d.date, d.reports, d.on_campus]),
        },
      ],
    });
  }

  return sections;
}

/** Hands the browser a file to save. */
function download(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
}

/**
 * Excel: one sheet per section. Complaint text arrives as string cells, so
 * nothing a reporter typed can run as a formula.
 */
async function toExcel(sections: Section[], name: string) {
  const { default: writeExcelFile } = await import('write-excel-file/browser');
  const bold = (values: string[]): Row => values.map((value) => ({ value, fontWeight: 'bold' }));
  // An empty cell is left truly empty, so Excel can still sum and filter the column.
  const plain = (values: Cell[]): Row => values.map((value) => (value === null ? null : { value }));

  const sheets = sections.map((s) => {
    const data: Row[] = [];
    s.tables.forEach((table, i) => {
      if (i > 0) data.push([]);
      if (table.title) data.push(bold([table.title]));
      if (table.header) data.push(bold(table.header));
      for (const row of table.rows) data.push(plain(row));
    });
    return {
      data,
      sheet: s.name,
      columns: s.widths.map((width) => ({ width })),
      ...(s.sticky ? { stickyRowsCount: 1 } : {}),
    };
  });
  await writeExcelFile(sheets).toFile(`${name}.xlsx`);
}

/**
 * CSV: one file, each section after the other, separated by an empty line. A
 * cell that a spreadsheet would read as a formula (=, +, -, @) is prefixed with
 * an apostrophe, so complaint text cannot run when the file is opened.
 */
function toCsv(sections: Section[], name: string) {
  const cell = (value: Cell) => {
    if (value === null) return '';
    if (typeof value === 'number') return String(value);
    const safe = /^[=+\-@\t\r]/.test(value) ? `'${value}` : value;
    return /[",\r\n]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
  };
  const lines: string[] = [];
  for (const s of sections) {
    if (lines.length) lines.push('');
    lines.push(cell(`[${s.name}]`));
    s.tables.forEach((table, i) => {
      if (i > 0) lines.push('');
      if (table.title) lines.push(cell(table.title));
      if (table.header) lines.push(table.header.map(cell).join(','));
      for (const row of table.rows) lines.push(row.map(cell).join(','));
    });
  }
  // The byte-order mark makes Excel read the file as UTF-8, so "–" and names stay intact.
  download(new Blob(['﻿', lines.join('\r\n')], { type: 'text/csv;charset=utf-8' }), `${name}.csv`);
}

/** PDF: landscape A4, each section under its own heading, its tables drawn as grids. */
async function toPdf(sections: Section[], name: string, title: string) {
  const [{ jsPDF }, { autoTable }] = await Promise.all([import('jspdf'), import('jspdf-autotable')]);
  const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
  const margin = 12;
  const pageHeight = doc.internal.pageSize.getHeight();
  const accent: [number, number, number] = [0, 82, 163];
  let y = margin;

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(16);
  doc.text(title, margin, y + 4);
  y += 10;

  const lastY = () => (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  sections.forEach((s, si) => {
    // The long reports table starts on a fresh page instead of squeezed under the last one.
    if (si > 0 && (s.sticky || y > pageHeight - 40)) {
      doc.addPage();
      y = margin;
    }
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(...accent);
    doc.text(s.name, margin, y + 4);
    doc.setTextColor(0, 0, 0);
    y += 7;

    for (const table of s.tables) {
      if (!table.rows.length && !table.header) continue;
      const columns = Math.max(table.header?.length ?? 0, ...table.rows.map((r) => r.length), 1);
      const head = table.header
        ? [
            ...(table.title ? [[{ content: table.title, colSpan: columns }]] : []),
            table.header,
          ]
        : table.title
          ? [[{ content: table.title, colSpan: columns }]]
          : undefined;
      const wide = columns > 6;
      autoTable(doc, {
        startY: y,
        margin: { left: margin, right: margin },
        head,
        body: table.rows.map((r) => r.map((v) => (v === null ? '' : String(v)))),
        // Two-column tables stay narrow; the wide ones take the page.
        tableWidth: columns <= 2 ? 140 : 'auto',
        theme: 'grid',
        styles: { fontSize: wide ? 6.5 : 8.5, cellPadding: wide ? 1.2 : 1.6, overflow: 'linebreak', valign: 'top' },
        headStyles: { fillColor: accent, textColor: 255, fontStyle: 'bold' },
        alternateRowStyles: { fillColor: [245, 247, 250] },
        // On a wide table the long text columns get the room; the rest stay snug.
        columnStyles: wide
          ? { 8: { cellWidth: 40 }, 9: { cellWidth: 46 }, 10: { cellWidth: 40 } }
          : columns === 2
            ? { 1: { cellWidth: 40, halign: 'right' } }
            : {},
        showHead: 'everyPage',
      });
      y = lastY() + 5;
      if (y > pageHeight - 20) {
        doc.addPage();
        y = margin;
      }
    }
  });

  // Page numbers last, once the page count is known.
  const pages = doc.getNumberOfPages();
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(8);
  doc.setTextColor(120, 120, 120);
  for (let i = 1; i <= pages; i++) {
    doc.setPage(i);
    doc.text(`${i} / ${pages}`, doc.internal.pageSize.getWidth() - margin, pageHeight - 6, { align: 'right' });
  }
  doc.save(`${name}.pdf`);
}

/** Writes what the overview shows for a date range to a file in the chosen format. */
export async function exportDashboard(args: {
  format: ExportFormat;
  from: string;
  to: string;
  charts: ChartData;
  reports: ExportReport[];
  cleaning: CleaningCharts | null;
  t: Translate;
}): Promise<void> {
  const sections = buildSections(args);
  const name = `kato-dashboard_${args.from}_${args.to}`;
  if (args.format === 'xlsx') await toExcel(sections, name);
  else if (args.format === 'csv') toCsv(sections, name);
  else await toPdf(sections, name, `${args.t('export.title')} · ${args.from} – ${args.to}`);
}
