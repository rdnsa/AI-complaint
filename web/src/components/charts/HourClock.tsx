import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, sequentialStep } from './colors';

const CX = 130;
const CY = 130;
const R0 = 40;
const R1 = 106;

function sector(r0: number, r1: number, a0: number, a1: number): string {
  const p = (r: number, a: number) => `${(CX + r * Math.cos(a)).toFixed(2)},${(CY + r * Math.sin(a)).toFixed(2)}`;
  return `M${p(r1, a0)} A${r1},${r1} 0 0 1 ${p(r1, a1)} L${p(r0, a1)} A${r0},${r0} 0 0 0 ${p(r0, a0)} Z`;
}

/**
 * The 24 hours of the day as a clock face: each hour a wedge whose length is
 * how many reports came in then. The busiest hour is the headline in the middle.
 */
export default function HourClock({ hours, unit }: { hours: number[]; unit: string }) {
  const mounted = useMounted();
  const [hot, setHot] = useState<number | null>(null);
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  const shown = hot ?? peak;
  const gap = 0.022;

  return (
    <figure className="relative m-0 mx-auto aspect-square w-full max-w-[300px]">
      <svg viewBox="0 0 260 260" className="h-full w-full" role="img" onMouseLeave={() => setHot(null)}>
        {hours.map((v, h) => {
          const a0 = (h / 24) * 2 * Math.PI - Math.PI / 2 + gap;
          const a1 = ((h + 1) / 24) * 2 * Math.PI - Math.PI / 2 - gap;
          const r = R0 + (R1 - R0) * Math.sqrt(v / max);
          const lit = v > 0;
          return (
            <g key={h} onMouseEnter={() => setHot(h)}>
              <path d={sector(R0, R1, a0, a1)} fill={INK.gridline} opacity={0.55} />
              <path
                d={sector(R0, Math.max(r, R0 + 3), a0, a1)}
                fill={lit ? sequentialStep(v, max) : 'transparent'}
                stroke={h === shown && lit ? INK.primary : 'none'}
                strokeWidth={1.5}
                style={{
                  transformOrigin: `${CX}px ${CY}px`,
                  transform: mounted ? 'scale(1)' : 'scale(0.3)',
                  opacity: mounted ? 1 : 0,
                  transition: `transform 1s ${EASE} ${h * 28}ms, opacity .5s ${h * 28}ms`,
                }}
              />
            </g>
          );
        })}
        {[0, 6, 12, 18].map((h) => {
          const a = (h / 24) * 2 * Math.PI - Math.PI / 2;
          return (
            <text
              key={h}
              x={CX + 119 * Math.cos(a)}
              y={CY + 119 * Math.sin(a) + 3.5}
              textAnchor="middle"
              fontSize={10}
              fontWeight={600}
              fill={INK.muted}
            >
              {String(h).padStart(2, '0')}
            </text>
          );
        })}
      </svg>
      <figcaption className="pointer-events-none absolute inset-0 grid place-content-center text-center">
        <span className="font-display text-[26px] font-light leading-none tabular-nums" style={{ color: INK.primary }}>
          {String(shown).padStart(2, '0')}.00
        </span>
        <span className="mt-1 text-nav font-semibold" style={{ color: INK.muted }}>
          {hours[shown]} {unit}
        </span>
      </figcaption>
    </figure>
  );
}
