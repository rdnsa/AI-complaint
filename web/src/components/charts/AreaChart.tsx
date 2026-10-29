import { useId, useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, SERIES } from './colors';

export interface DailyPoint {
  date: string;
  total: number;
  resolved: number;
}

const W = 640;
const H = 230;
const L = 28;
const R = 10;
const T = 16;
const B = 24;

/** Fritsch–Carlson monotone curve: smooth, and it never dips below a real value. */
function monotone(pts: Array<[number, number]>): string {
  const n = pts.length;
  if (n < 2) return '';
  const dx: number[] = [];
  const m: number[] = [];
  for (let i = 0; i < n - 1; i++) {
    dx[i] = pts[i + 1][0] - pts[i][0];
    m[i] = (pts[i + 1][1] - pts[i][1]) / dx[i];
  }
  const t = new Array<number>(n);
  t[0] = m[0];
  t[n - 1] = m[n - 2];
  for (let i = 1; i < n - 1; i++) t[i] = m[i - 1] * m[i] <= 0 ? 0 : (m[i - 1] + m[i]) / 2;
  for (let i = 0; i < n - 1; i++) {
    if (m[i] === 0) {
      t[i] = t[i + 1] = 0;
      continue;
    }
    const a = t[i] / m[i];
    const b = t[i + 1] / m[i];
    const s = a * a + b * b;
    if (s > 9) {
      const k = 3 / Math.sqrt(s);
      t[i] = k * a * m[i];
      t[i + 1] = k * b * m[i];
    }
  }
  let d = `M${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)}`;
  for (let i = 0; i < n - 1; i++) {
    const [x0, y0] = pts[i];
    const [x1, y1] = pts[i + 1];
    d += ` C${(x0 + dx[i] / 3).toFixed(1)},${(y0 + (t[i] * dx[i]) / 3).toFixed(1)} ${(x1 - dx[i] / 3).toFixed(1)},${(y1 - (t[i + 1] * dx[i]) / 3).toFixed(1)} ${x1.toFixed(1)},${y1.toFixed(1)}`;
  }
  return d;
}

/**
 * Reports received and resolved over time, as two smooth gradient areas that
 * draw in from the left. One Y axis: both series are counts of reports.
 */
export default function AreaChart({
  data,
  receivedLabel,
  resolvedLabel,
}: {
  data: DailyPoint[];
  receivedLabel: string;
  resolvedLabel: string;
}) {
  const id = useId();
  const mounted = useMounted();
  const [hot, setHot] = useState<number | null>(null);
  if (data.length < 2) return null;

  const max = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => L + (i * (W - L - R)) / (data.length - 1);
  const y = (n: number) => T + (1 - n / max) * (H - T - B);
  const series = (pick: (d: DailyPoint) => number) => data.map((d, i): [number, number] => [x(i), y(pick(d))]);

  const received = series((d) => d.total);
  const resolved = series((d) => d.resolved);
  const base = H - B;
  const area = (pts: Array<[number, number]>) =>
    `${monotone(pts)} L${pts[pts.length - 1][0]},${base} L${pts[0][0]},${base} Z`;

  const peak = data.reduce((best, d, i) => (d.total > data[best].total ? i : best), 0);
  const ticks = [0, Math.round(max / 2), max].filter((v, i, a) => a.indexOf(v) === i);
  const step = Math.ceil(data.length / 6);
  const band = (W - L - R) / (data.length - 1);
  const active = hot === null ? null : data[hot];

  return (
    <figure className="m-0">
      <div className="mb-1 flex flex-wrap gap-4 text-nav font-semibold" style={{ color: INK.secondary }}>
        {[
          [SERIES.received, receivedLabel],
          [SERIES.resolved, resolvedLabel],
        ].map(([c, l]) => (
          <span key={l} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: c }} />
            {l}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" onMouseLeave={() => setHot(null)}>
          <defs>
            {(
              [
                ['r', SERIES.received, 0.32],
                ['s', SERIES.resolved, 0.42],
              ] as const
            ).map(([k, c, o]) => (
              <linearGradient key={k} id={`${id}${k}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor={c} stopOpacity={o} />
                <stop offset="1" stopColor={c} stopOpacity={0} />
              </linearGradient>
            ))}
            <clipPath id={`${id}c`}>
              <rect x="0" y="0" height={H} width={mounted ? W : 0} style={{ transition: `width 1.5s ${EASE}` }} />
            </clipPath>
          </defs>

          {ticks.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - R} y1={y(v)} y2={y(v)} stroke={INK.gridline} strokeDasharray={v ? '3 5' : undefined} />
              <text x={L - 8} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={INK.muted}>
                {v}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            i % step === 0 || i === data.length - 1 ? (
              <text key={d.date} x={x(i)} y={H - 6} textAnchor={i === data.length - 1 ? 'end' : 'middle'} fontSize={10} fill={INK.muted}>
                {d.date.slice(8)}/{d.date.slice(5, 7)}
              </text>
            ) : null,
          )}

          <g clipPath={`url(#${id}c)`}>
            <path d={area(received)} fill={`url(#${id}r)`} />
            <path d={area(resolved)} fill={`url(#${id}s)`} />
            <path d={monotone(received)} fill="none" stroke={SERIES.received} strokeWidth={2.2} strokeLinecap="round" />
            <path
              d={monotone(resolved)}
              fill="none"
              stroke={SERIES.resolved}
              strokeWidth={2.6}
              strokeLinecap="round"
              style={{ filter: `drop-shadow(0 2px 6px ${SERIES.resolved}66)` }}
            />
          </g>

          {/* The busiest day, marked so the eye lands on it first. */}
          {data[peak].total > 0 && hot === null && (
            <g style={{ opacity: mounted ? 1 : 0, transition: 'opacity .6s 1.2s' }}>
              <circle cx={x(peak)} cy={y(data[peak].total)} r={9} fill={SERIES.received} opacity={0.18} />
              <circle cx={x(peak)} cy={y(data[peak].total)} r={4} fill={SERIES.received} stroke={INK.surface} strokeWidth={2} />
              <text x={x(peak)} y={y(data[peak].total) - 12} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK.primary}>
                {data[peak].total}
              </text>
            </g>
          )}

          {hot !== null && active && (
            <g>
              <line x1={x(hot)} x2={x(hot)} y1={T} y2={base} stroke={INK.muted} strokeDasharray="3 3" />
              <circle cx={x(hot)} cy={y(active.total)} r={5} fill={SERIES.received} stroke={INK.surface} strokeWidth={2} />
              <circle cx={x(hot)} cy={y(active.resolved)} r={5} fill={SERIES.resolved} stroke={INK.surface} strokeWidth={2} />
            </g>
          )}

          {data.map((d, i) => (
            <rect key={d.date} x={x(i) - band / 2} y={0} width={band} height={base} fill="transparent" onMouseEnter={() => setHot(i)} />
          ))}
        </svg>

        {hot !== null && active && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-ink-900 px-2.5 py-1.5 text-xs text-surface"
            style={{ left: `${(x(hot) / W) * 100}%`, top: `${(y(Math.max(active.total, active.resolved)) / H) * 100}%` }}
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
