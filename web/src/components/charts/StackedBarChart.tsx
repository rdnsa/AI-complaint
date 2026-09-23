import { useState } from 'react';
import { PRIORITY_COLORS, INK } from './colors';

export interface DailyPriority {
  date: string;
  high: number;
  medium: number;
  low: number;
}

const ORDER = ['high', 'medium', 'low'] as const;

/**
 * How the day's reports were composed, not merely how many there were.
 *
 * Stacked rather than grouped because the question is the mix within a day; the
 * total height stays comparable across days, and each segment is separated by a
 * two-pixel gap so adjoining colours never touch.
 */
export default function StackedBarChart({
  data,
  labels,
}: {
  data: DailyPriority[];
  labels: Record<(typeof ORDER)[number], string>;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (!data.length) return null;

  const total = (d: DailyPriority) => d.high + d.medium + d.low;
  const max = Math.max(1, ...data.map(total));

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-maroon-700">
        {ORDER.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PRIORITY_COLORS[p] }} />
            {labels[p]}
          </span>
        ))}
      </div>

      <div className="relative flex h-40 items-end gap-1" onMouseLeave={() => setHovered(null)}>
        {data.map((d, i) => (
          <div
            key={d.date}
            className="flex h-full flex-1 cursor-default flex-col justify-end gap-0.5"
            onMouseEnter={() => setHovered(i)}
            style={{ opacity: hovered === null || hovered === i ? 1 : 0.45 }}
          >
            {ORDER.map((p) => {
              const value = d[p];
              if (!value) return null;
              return (
                <div
                  key={p}
                  className="w-full rounded-[3px]"
                  style={{
                    height: `${(value / max) * 100}%`,
                    background: PRIORITY_COLORS[p],
                    minHeight: 3,
                  }}
                />
              );
            })}
            {/* An empty day still needs a visible baseline, or it reads as missing data. */}
            {!total(d) && <div className="h-[3px] w-full rounded-full bg-krem-200" />}
          </div>
        ))}

        {hovered !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-maroon-900 px-2.5 py-1.5 text-xs text-permukaan shadow-naik"
            style={{ left: `${((hovered + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-bold">{data[hovered].date}</p>
            {ORDER.map((p) => (
              <p key={p}>
                {labels[p]}: {data[hovered][p]}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: INK.muted }}>
        <span>{data[0].date.slice(5)}</span>
        <span>{data[data.length - 1].date.slice(5)}</span>
      </div>
    </figure>
  );
}
