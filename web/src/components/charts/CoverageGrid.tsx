import { useState } from 'react';
import { EASE, useMounted } from './motion';
import { INK, inkOn, sequentialStep } from './colors';

export interface CoverageArea {
  id: string;
  name: string;
  building_code: string | null;
  building_name: string | null;
  floor: number | null;
  reports: number;
}

/**
 * The campus as a seating plan: one row per building, one square per floor and
 * yard, darker with more reports. Nobody owns an area, so the dashed squares,
 * the places no report has come from, are what the supervisor acts on.
 */
export default function CoverageGrid({
  areas,
  yardKey,
  missingLabel,
  areaLabel,
}: {
  areas: CoverageArea[];
  /** Explains the letter on a yard's square. */
  yardKey: string;
  missingLabel: string;
  /** What the readout says for an area. */
  areaLabel: (a: CoverageArea) => string;
}) {
  const mounted = useMounted();
  const [hot, setHot] = useState<string | null>(null);
  const max = Math.max(1, ...areas.map((a) => a.reports));

  const rows = new Map<string, CoverageArea[]>();
  for (const a of areas) {
    const key = a.building_code ?? a.id;
    rows.set(key, [...(rows.get(key) ?? []), a]);
  }
  const active = areas.find((a) => a.id === hot);
  let order = 0;

  return (
    <figure className="m-0">
      <ul className="m-0 list-none space-y-3 p-0 sm:space-y-1.5">
        {[...rows].map(([key, list]) => (
          <li key={key} className="grid gap-1 sm:grid-cols-[minmax(0,13rem)_1fr] sm:items-center sm:gap-2">
            <span className="truncate text-xs font-semibold" style={{ color: INK.secondary }}>
              {list[0].building_code && <b className="mr-1.5">{list[0].building_code}</b>}
              {list[0].building_code ? list[0].building_name : list[0].name}
            </span>
            <span className="flex flex-wrap gap-1">
              {list.map((a) => {
                const wait = order++ * 22;
                return (
                  <button
                    key={a.id}
                    type="button"
                    aria-label={areaLabel(a)}
                    onMouseEnter={() => setHot(a.id)}
                    onMouseLeave={() => setHot(null)}
                    onFocus={() => setHot(a.id)}
                    onBlur={() => setHot(null)}
                    className={`grid h-9 w-9 place-content-center rounded-md sm:h-8 sm:w-8 text-xs font-bold tabular-nums outline-none ${
                      a.reports ? '' : 'border border-dashed border-ink-600/60'
                    } ${hot === a.id ? 'ring-2 ring-ink-900' : ''}`}
                    style={{
                      background: a.reports ? sequentialStep(a.reports, max) : 'transparent',
                      color: a.reports ? inkOn(a.reports, max) : INK.muted,
                      opacity: mounted ? 1 : 0,
                      transform: mounted ? 'none' : 'translateY(10px) scale(0.6)',
                      transition: `opacity .4s ease ${wait}ms, transform .6s ${EASE} ${wait}ms`,
                    }}
                  >
                    {a.floor === 0 ? 'H' : (a.floor ?? '•')}
                  </button>
                );
              })}
            </span>
          </li>
        ))}
      </ul>
      <figcaption className="mt-3 flex min-h-5 flex-wrap items-center gap-x-4 gap-y-1 text-[10px]" style={{ color: INK.muted }}>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-sm border border-dashed border-ink-600/60" />
          {missingLabel}
        </span>
        <span>{yardKey}</span>
        <span className="ml-auto text-xs font-bold" style={{ color: INK.primary }} aria-live="polite">
          {active ? areaLabel(active) : ''}
        </span>
      </figcaption>
    </figure>
  );
}
