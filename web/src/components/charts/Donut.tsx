import { useState } from 'react';
import CountUp from './CountUp';
import { EASE, useMounted } from './motion';
import { INK } from './colors';

export interface Segment {
  key: string;
  label: string;
  value: number;
  color: string;
}

const R = 46;
const SW = 13;
const C = 2 * Math.PI * R;

/**
 * Parts of a whole. Hovering a slice (or its legend chip) dims the rest and
 * puts that slice's number in the middle; otherwise the middle shows the total.
 */
export default function Donut({
  segments,
  totalLabel,
}: {
  segments: Segment[];
  totalLabel: string;
}) {
  const mounted = useMounted();
  const [hot, setHot] = useState<string | null>(null);
  const live = segments.filter((s) => s.value > 0);
  const total = live.reduce((n, s) => n + s.value, 0);
  const gap = live.length > 1 ? SW + 3 : 0;
  const active = segments.find((s) => s.key === hot);

  let cum = 0;
  return (
    <figure className="m-0 flex flex-col items-center gap-4">
      <div className="relative aspect-square w-full max-w-[200px]">
        <svg viewBox="0 0 120 120" className="h-full w-full -rotate-90" role="img">
          <circle cx="60" cy="60" r={R} fill="none" stroke={INK.gridline} strokeWidth={SW} opacity={0.6} />
          {total > 0 &&
            live.map((s, i) => {
              const share = (s.value / total) * C;
              const len = Math.max(share - gap, 0.01);
              const offset = -(cum + gap / 2);
              cum += share;
              return (
                <circle
                  key={s.key}
                  cx="60"
                  cy="60"
                  r={R}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={hot === s.key ? SW + 3 : SW}
                  strokeLinecap="round"
                  strokeDasharray={`${mounted ? len : 0.01} ${C}`}
                  strokeDashoffset={offset}
                  opacity={hot && hot !== s.key ? 0.3 : 1}
                  onMouseEnter={() => setHot(s.key)}
                  onMouseLeave={() => setHot(null)}
                  style={{
                    transition: `stroke-dasharray 1.2s ${EASE} ${i * 120}ms, stroke-width .2s, opacity .2s`,
                    cursor: 'default',
                  }}
                />
              );
            })}
        </svg>
        <div className="pointer-events-none absolute inset-0 grid place-content-center text-center">
          <span className="font-display text-4xl font-light leading-none" style={{ color: active?.color ?? INK.primary }}>
            <CountUp value={active ? active.value : total} />
          </span>
          <span className="mt-1 text-nav font-semibold" style={{ color: INK.muted }}>
            {active ? active.label : totalLabel}
          </span>
        </div>
      </div>

      <ul className="flex flex-wrap justify-center gap-1.5">
        {segments.map((s) => (
          <li
            key={s.key}
            onMouseEnter={() => setHot(s.key)}
            onMouseLeave={() => setHot(null)}
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-nav font-semibold ring-1 ring-mist-200 transition"
            style={{ color: INK.secondary, opacity: hot && hot !== s.key ? 0.45 : 1 }}
          >
            <span className="h-2 w-2 rounded-full" style={{ background: s.color }} />
            {s.label}
            <b style={{ color: INK.primary }}>{s.value}</b>
          </li>
        ))}
      </ul>
    </figure>
  );
}
