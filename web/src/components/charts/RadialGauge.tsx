import { useId } from 'react';
import CountUp from './CountUp';
import { EASE, useMounted } from './motion';
import { INK } from './colors';

const SWEEP = 240; // degrees of arc; the gap sits at the bottom
const START = 150; // degrees clockwise from 3 o'clock
const R = 78;
const C = 2 * Math.PI * R;
const TICKS = 48;

/**
 * One percentage as a dial: a gradient arc over a track, a ring of ticks that
 * light up to the value, and the number counting up in the middle.
 */
export default function RadialGauge({
  value,
  label,
  from = '#0071E3',
  to = '#0E9F6E',
}: {
  value: number;
  label?: string;
  from?: string;
  to?: string;
}) {
  const id = useId();
  const mounted = useMounted();
  const pct = Math.min(100, Math.max(0, value));
  const arc = (SWEEP / 360) * C;

  return (
    <figure className="relative m-0 mx-auto aspect-square w-full max-w-[280px]">
      <svg viewBox="0 0 200 200" className="h-full w-full" role="img" aria-label={`${Math.round(pct)}%`}>
        <defs>
          <linearGradient id={`${id}g`} x1="0" y1="1" x2="1" y2="0">
            <stop offset="0" stopColor={from} />
            <stop offset="1" stopColor={to} />
          </linearGradient>
        </defs>

        {Array.from({ length: TICKS + 1 }, (_, i) => {
          const a = ((START + (SWEEP * i) / TICKS) * Math.PI) / 180;
          const on = (i / TICKS) * 100 <= pct && pct > 0;
          const major = i % 12 === 0;
          const r0 = major ? 91 : 93;
          return (
            <line
              key={i}
              x1={100 + r0 * Math.cos(a)}
              y1={100 + r0 * Math.sin(a)}
              x2={100 + 98 * Math.cos(a)}
              y2={100 + 98 * Math.sin(a)}
              stroke={on ? `url(#${id}g)` : INK.gridline}
              strokeWidth={major ? 2 : 1.2}
              strokeLinecap="round"
              style={{ opacity: mounted ? 1 : 0, transition: `opacity 0.4s ${i * 14}ms` }}
            />
          );
        })}

        <g transform={`rotate(${START} 100 100)`} fill="none" strokeLinecap="round" strokeWidth={14}>
          <circle cx="100" cy="100" r={R} stroke={INK.gridline} strokeDasharray={`${arc} ${C}`} />
          <circle
            cx="100"
            cy="100"
            r={R}
            stroke={`url(#${id}g)`}
            strokeDasharray={`${mounted ? Math.max((pct / 100) * arc, 0.01) : 0.01} ${C}`}
            style={{ transition: `stroke-dasharray 1.4s ${EASE}`, filter: `drop-shadow(0 0 6px ${to}66)` }}
          />
        </g>
      </svg>

      <figcaption className="absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-[56px] font-light leading-none tracking-tight" style={{ color: INK.primary }}>
          <CountUp value={pct} />
          <span className="text-2xl" style={{ color: INK.muted }}>%</span>
        </span>
        {label && (
          <span className="mt-1.5 text-nav font-semibold uppercase tracking-wider" style={{ color: INK.muted }}>
            {label}
          </span>
        )}
      </figcaption>
    </figure>
  );
}
