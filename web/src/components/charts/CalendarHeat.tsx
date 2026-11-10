import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, SEQUENTIAL, sequentialStep } from './colors';
import { NARROW, useWidth } from './useWidth';

/**
 * Every day of the range as one square, weeks left to right: a rhythm a line
 * cannot show, such as quiet weekends or a week nobody reported. An empty day
 * keeps the bare surface, so "none" and "few" never look alike. The squares
 * arrive as a wave from the first day.
 */
export default function CalendarHeat({
  data,
  weekdayLabel,
  monthLabel,
  dayLabel,
  fewerLabel,
  moreLabel,
}: {
  data: Array<{ date: string; value: number }>;
  /** 0 is Sunday. */
  weekdayLabel: (day: number) => string;
  monthLabel: (date: string) => string;
  /** What the readout says for a day. */
  dayLabel: (date: string, value: number) => string;
  fewerLabel: string;
  moreLabel: string;
}) {
  const mounted = useMounted();
  const [hot, setHot] = useState<number | null>(null);
  const [frame, width] = useWidth<HTMLElement>();
  if (!data.length) return null;
  // A phone gives each week far more width than a square needs; the cap keeps the month under half a screen tall.
  const cell = width > 0 && width < NARROW ? 36 : 52;

  const max = Math.max(1, ...data.map((d) => d.value));
  const peak = data.reduce((best, d, i) => (d.value > data[best].value ? i : best), 0);
  const shown = hot ?? peak;

  // Monday first: the campus week.
  const rowOf = (date: string) => (new Date(`${date}T00:00:00Z`).getUTCDay() + 6) % 7;
  const lead = rowOf(data[0].date);
  const weeks = Math.ceil((lead + data.length) / 7);

  const months = data.flatMap((d, i) => {
    const week = Math.floor((lead + i) / 7);
    return i === 0 || d.date.endsWith('-01') ? [{ week, label: monthLabel(d.date) }] : [];
  });
  // A range that starts at a month's end would otherwise print two names on top of each other.
  const monthsShown = months.filter((m, i) => i === months.length - 1 || months[i + 1].week - m.week >= 3);

  const grid = { gridTemplateColumns: `repeat(${weeks}, minmax(0, 1fr))` };

  return (
    <figure ref={frame} className="m-0 flex flex-1 flex-col justify-center">
      <div className="overflow-x-auto">
        <div className="mx-auto grid grid-cols-[28px_1fr] gap-x-1" style={{ minWidth: 32 + weeks * 12, maxWidth: 32 + weeks * cell }}>
          <span />
          <div className="mb-1 grid h-4 text-[10px] font-semibold" style={{ ...grid, color: INK.muted }}>
            {monthsShown.map((m) => (
              <span key={`${m.week}-${m.label}`} className="whitespace-nowrap" style={{ gridColumnStart: m.week + 1 }}>
                {m.label}
              </span>
            ))}
          </div>
          <div className="grid grid-rows-7 gap-[3px] text-[10px]" style={{ color: INK.muted }}>
            {[1, 2, 3, 4, 5, 6, 0].map((day, row) => (
              <span key={day} className="flex items-center overflow-hidden">
                {row % 2 === 0 ? weekdayLabel(day) : ''}
              </span>
            ))}
          </div>
          <div className="grid grid-flow-col grid-rows-7 gap-[3px]" style={{ gridTemplateColumns: grid.gridTemplateColumns }}>
            {data.map((d, i) => {
              const row = rowOf(d.date);
              const week = Math.floor((lead + i) / 7);
              return (
                <button
                  key={d.date}
                  type="button"
                  aria-label={dayLabel(d.date, d.value)}
                  onMouseEnter={() => setHot(i)}
                  onMouseLeave={() => setHot(null)}
                  onFocus={() => setHot(i)}
                  onBlur={() => setHot(null)}
                  className={`aspect-square w-full rounded-[3px] outline-none ${
                    hot === i ? 'ring-2 ring-ink-900' : d.value ? '' : 'ring-1 ring-inset ring-mist-200'
                  }`}
                  style={{
                    gridColumnStart: week + 1,
                    gridRowStart: row + 1,
                    background: sequentialStep(d.value, max),
                    opacity: mounted ? 1 : 0,
                    transform: mounted ? 'none' : 'scale(0.3)',
                    transition: `opacity .45s ease ${(week + row) * 18}ms, transform .6s ${EASE} ${(week + row) * 18}ms`,
                  }}
                />
              );
            })}
          </div>
        </div>
      </div>

      <figcaption className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 text-[10px]" style={{ color: INK.muted }}>
        <span className="flex items-center gap-2">
          {fewerLabel}
          <span className="flex gap-0.5">
            {SEQUENTIAL.map((c) => (
              <span key={c} className="h-3 w-3 rounded-sm" style={{ background: c }} />
            ))}
          </span>
          {moreLabel}
        </span>
        <span className="ml-auto text-xs font-bold" style={{ color: INK.primary }} aria-live="polite">
          {dayLabel(data[shown].date, data[shown].value)}
        </span>
      </figcaption>
    </figure>
  );
}
