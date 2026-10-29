import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK } from './colors';
import type { Segment } from './Donut';

const STEP = 14;
const SW = 10;

/**
 * Concentric rings, one per category, longest for the most reported — an
 * activity-ring read of "which problem dominates". The list beside it prints
 * the numbers so no ring has to be measured by eye.
 */
export default function RadialBars({ items }: { items: Segment[] }) {
  const mounted = useMounted();
  const [hot, setHot] = useState<string | null>(null);
  const max = Math.max(1, ...items.map((i) => i.value));
  const rings = items.slice(0, 6);

  return (
    <figure className="m-0 flex flex-col items-center gap-4 sm:flex-row sm:justify-center lg:flex-col">
      <svg viewBox="0 0 200 200" className="aspect-square w-full max-w-[200px] -rotate-90" role="img">
        {rings.map((it, i) => {
          const r = 90 - i * STEP;
          const c = 2 * Math.PI * r;
          const len = (it.value / max) * 0.8 * c;
          return (
            <g key={it.key} opacity={hot && hot !== it.key ? 0.3 : 1} style={{ transition: 'opacity .2s' }}>
              <circle cx="100" cy="100" r={r} fill="none" stroke={INK.gridline} strokeWidth={SW} opacity={0.6} />
              <circle
                cx="100"
                cy="100"
                r={r}
                fill="none"
                stroke={it.color}
                strokeWidth={SW}
                strokeLinecap="round"
                strokeDasharray={`${mounted ? Math.max(len, 0.01) : 0.01} ${c}`}
                onMouseEnter={() => setHot(it.key)}
                onMouseLeave={() => setHot(null)}
                style={{ transition: `stroke-dasharray 1.3s ${EASE} ${i * 110}ms` }}
              />
            </g>
          );
        })}
      </svg>
      <ul className="w-full max-w-[200px] space-y-1">
        {rings.map((it) => (
          <li
            key={it.key}
            onMouseEnter={() => setHot(it.key)}
            onMouseLeave={() => setHot(null)}
            className="flex items-center gap-2 text-nav font-semibold transition-opacity"
            style={{ color: INK.secondary, opacity: hot && hot !== it.key ? 0.4 : 1 }}
          >
            <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color }} />
            <span className="truncate capitalize">{it.label}</span>
            <b className="ml-auto tabular-nums" style={{ color: INK.primary }}>
              {it.value}
            </b>
          </li>
        ))}
      </ul>
    </figure>
  );
}
