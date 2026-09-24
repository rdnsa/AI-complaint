import { useState } from 'react';
import { INK, inkOn, SEQUENTIAL, sequentialStep } from './colors';

export interface HeatmapCell {
  row: string;
  column: string;
  value: number;
}

/**
 * A matrix of counts, shaded on a single-hue sequential ramp.
 *
 * Two dimensions at once is what makes this worth drawing: a bar chart of
 * buildings and a bar chart of categories cannot show that one building is the
 * source of one particular problem. Zero keeps the empty surface rather than
 * the palest step, so "none" and "few" never look alike.
 */
export default function Heatmap({
  data,
  rows,
  columns,
  columnLabel,
  verticalLabels = false,
  fewerLabel,
  moreLabel,
}: {
  data: HeatmapCell[];
  rows: string[];
  columns: string[];
  columnLabel?: (c: string) => string;
  /**
   * Long column names (categories) stand on end on a phone, so every column
   * keeps a thumb-sized cell instead of the matrix scrolling out of view.
   */
  verticalLabels?: boolean;
  fewerLabel: string;
  moreLabel: string;
}) {
  const [hovered, setHovered] = useState<HeatmapCell | null>(null);

  const cells = new Map(data.map((d) => [`${d.row}|${d.column}`, d.value]));
  const max = Math.max(1, ...data.map((d) => d.value));
  const valueAt = (r: string, c: string) => cells.get(`${r}|${c}`) ?? 0;

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        {/* Fixed layout: the columns share the width equally and never push the card wider. */}
        <table className="w-full table-fixed border-separate border-spacing-[2px] text-xs">
          <colgroup>
            <col className="w-9 sm:w-12" />
            {columns.map((c) => (
              <col key={c} />
            ))}
          </colgroup>
          <thead>
            <tr>
              <th />
              {columns.map((c) => (
                <th
                  key={c}
                  className={`pb-1 align-bottom font-semibold capitalize max-sm:text-[11px] ${
                    verticalLabels ? 'max-sm:h-24 sm:text-center' : 'text-center'
                  }`}
                  style={{ color: INK.secondary }}
                >
                  {verticalLabels ? (
                    <span className="inline-block max-sm:rotate-180 max-sm:[writing-mode:vertical-rl]">
                      {columnLabel ? columnLabel(c) : c}
                    </span>
                  ) : columnLabel ? (
                    columnLabel(c)
                  ) : (
                    c
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th
                  className="truncate pr-1.5 text-right font-semibold"
                  style={{ color: INK.secondary }}
                >
                  {r}
                </th>
                {columns.map((c) => {
                  const n = valueAt(r, c);
                  return (
                    <td
                      key={c}
                      onMouseEnter={() => setHovered({ row: r, column: c, value: n })}
                      onMouseLeave={() => setHovered(null)}
                      className="h-9 rounded-md border border-krem-200 text-center font-bold tabular-nums"
                      style={{
                        background: sequentialStep(n, max),
                        color: n ? inkOn(n, max) : INK.muted,
                      }}
                    >
                      {n || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: INK.muted }}>
        <span>{fewerLabel}</span>
        <span className="flex gap-0.5">
          {SEQUENTIAL.map((c) => (
            <span key={c} className="h-3 w-5 rounded-sm border border-krem-200" style={{ background: c }} />
          ))}
        </span>
        <span>{moreLabel}</span>
        {hovered && (
          <span className="ml-auto font-bold" style={{ color: INK.primary }}>
            {hovered.row} · {hovered.column}: {hovered.value}
          </span>
        )}
      </div>
    </figure>
  );
}
