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
  fewerLabel,
  moreLabel,
}: {
  data: HeatmapCell[];
  rows: string[];
  columns: string[];
  columnLabel?: (c: string) => string;
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
        <table className="w-full border-separate border-spacing-[2px] text-xs">
          <thead>
            <tr>
              <th />
              {columns.map((c) => (
                <th
                  key={c}
                  className="pb-1 text-center font-semibold capitalize"
                  style={{ color: INK.secondary }}
                >
                  {columnLabel ? columnLabel(c) : c}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r}>
                <th
                  className="whitespace-nowrap pr-2 text-right font-semibold"
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
