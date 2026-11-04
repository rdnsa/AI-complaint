import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, SINGLE } from './colors';

/**
 * The working day as a skyline: one column per WIB hour, rising left to right.
 * The busiest hour stays in full colour and carries the only label on the chart.
 */
export default function HourBars({ hours, unit }: { hours: number[]; unit: string }) {
  const mounted = useMounted();
  const [hot, setHot] = useState<number | null>(null);
  const max = Math.max(1, ...hours);
  const peak = hours.indexOf(Math.max(...hours));
  const shown = hot ?? peak;

  return (
    <figure className="m-0">
      <p className="mb-2 text-right text-xs font-bold" style={{ color: INK.primary }} aria-live="polite">
        {String(shown).padStart(2, '0')}.00 · {hours[shown]} {unit}
      </p>
      <div className="flex h-56 items-stretch gap-[2px]" onMouseLeave={() => setHot(null)}>
        {hours.map((n, h) => (
          <div key={h} className="flex flex-1 flex-col justify-end" onMouseEnter={() => setHot(h)}>
            {n > 0 ? (
              <div
                className="w-full origin-bottom rounded-t"
                style={{
                  height: `${(n / max) * 100}%`,
                  minHeight: 4,
                  background: SINGLE,
                  opacity: h === shown ? 1 : 0.45,
                  transform: mounted ? 'none' : 'scaleY(0)',
                  transition: `transform .9s ${EASE} ${h * 35}ms, opacity .2s`,
                }}
              />
            ) : (
              <div className="h-[3px] w-full rounded-full bg-mist-200" />
            )}
          </div>
        ))}
      </div>
      <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: INK.muted }}>
        {['00', '06', '12', '18', '23'].map((h) => (
          <span key={h}>{h}</span>
        ))}
      </div>
    </figure>
  );
}
