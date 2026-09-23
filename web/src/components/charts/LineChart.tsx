import { useState } from 'react';
import { SERIES, INK } from './colors';

export interface DailyPoint {
  date: string;
  total: number;
  resolved: number;
}

const L = 34; // left axis room
const R = 8;
const T = 12;
const B = 22; // date label room
const W = 640;
const H = 190;

/**
 * Reports received and reports resolved over time.
 *
 * Both are the same unit (a count of reports), so one Y axis is enough. A dual
 * axis is deliberately avoided: two scales on one plot make the gap between the
 * lines read as a difference that does not exist.
 */
export default function LineChart({
  data,
  receivedLabel,
  resolvedLabel,
}: {
  data: DailyPoint[];
  receivedLabel: string;
  resolvedLabel: string;
}) {
  const [hovered, setHovered] = useState<number | null>(null);
  if (data.length < 2) return null;

  const max = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => L + (i * (W - L - R)) / (data.length - 1);
  const y = (n: number) => T + (1 - n / max) * (H - T - B);

  const line = (pick: (d: DailyPoint) => number) =>
    data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(pick(d)).toFixed(1)}`).join(' ');

  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const active = hovered === null ? null : data[hovered];

  return (
    <figure className="m-0">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-maroon-700">
        {[
          { color: SERIES.received, label: receivedLabel },
          { color: SERIES.resolved, label: resolvedLabel },
        ].map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.color }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          onMouseLeave={() => setHovered(null)}
        >
          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={INK.gridline} strokeWidth={1} />
              <text x={L - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={INK.muted}>
                {v}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            // Dates are labelled sparsely so they do not collide on narrow screens.
            i % Math.ceil(data.length / 5) === 0 || i === data.length - 1 ? (
              <text
                key={d.date}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill={INK.muted}
              >
                {d.date.slice(8)}/{d.date.slice(5, 7)}
              </text>
            ) : null,
          )}

          <path d={line((d) => d.total)} fill="none" stroke={SERIES.received} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={line((d) => d.resolved)} fill="none" stroke={SERIES.resolved} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {hovered !== null && active && (
            <g>
              <line x1={x(hovered)} x2={x(hovered)} y1={T} y2={H - B} stroke={INK.muted} strokeWidth={1} strokeDasharray="3 3" />
              {/* A white ring separates the marker from the line behind it. */}
              <circle cx={x(hovered)} cy={y(active.total)} r={5} fill={SERIES.received} stroke={INK.surface} strokeWidth={2} />
              <circle cx={x(hovered)} cy={y(active.resolved)} r={5} fill={SERIES.resolved} stroke={INK.surface} strokeWidth={2} />
            </g>
          )}

          {/* Invisible bands: a hover target far larger than the point itself. */}
          {data.map((d, i) => (
            <rect
              key={d.date}
              x={x(i) - (W - L - R) / (data.length - 1) / 2}
              y={0}
              width={(W - L - R) / (data.length - 1)}
              height={H - B}
              fill="transparent"
              onMouseEnter={() => setHovered(i)}
            />
          ))}
        </svg>

        {hovered !== null && active && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-maroon-900 px-2.5 py-1.5 text-xs text-permukaan shadow-naik"
            style={{ left: `${(x(hovered) / W) * 100}%`, top: `${(y(Math.max(active.total, active.resolved)) / H) * 100}%` }}
          >
            <p className="font-bold">{active.date}</p>
            <p>
              {receivedLabel}: {active.total}
            </p>
            <p>
              {resolvedLabel}: {active.resolved}
            </p>
          </div>
        )}
      </div>

      {/* Table equivalent for screen readers and for copying the data. */}
      <table className="sr-only">
        <caption>{`${receivedLabel} / ${resolvedLabel}`}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.date}>
              <th scope="row">{d.date}</th>
              <td>{d.total}</td>
              <td>{d.resolved}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
