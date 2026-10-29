import { EASE, useMounted } from './motion';
import { INK } from './colors';

export interface StaffRing {
  id: string;
  name: string;
  done: number;
  expected: number;
  alerts: number;
}

const R = 30;
const C = 2 * Math.PI * R;

function Ring({ s, index }: { s: StaffRing; index: number }) {
  const mounted = useMounted();
  const pct = s.expected ? Math.min(1, s.done / s.expected) : 0;
  const color = pct >= 1 ? '#0E9F6E' : pct > 0 ? '#0071E3' : INK.muted;
  const initials = s.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <li className="flex w-[84px] flex-col items-center gap-1.5 text-center" title={`${s.name}: ${s.done}/${s.expected}`}>
      <div className="relative h-[76px] w-[76px]">
        <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90">
          <circle cx="38" cy="38" r={R} fill="none" stroke={INK.gridline} strokeWidth={7} opacity={0.7} />
          <circle
            cx="38"
            cy="38"
            r={R}
            fill="none"
            stroke={color}
            strokeWidth={7}
            strokeLinecap="round"
            strokeDasharray={`${mounted ? Math.max(pct * C, pct ? 0.01 : 0) : 0} ${C}`}
            style={{ transition: `stroke-dasharray 1.2s ${EASE} ${index * 70}ms`, filter: pct >= 1 ? `drop-shadow(0 0 4px ${color}88)` : undefined }}
          />
        </svg>
        <span className="absolute inset-0 grid place-content-center text-body-sm font-semibold" style={{ color: INK.primary }}>
          {initials}
        </span>
        {s.alerts > 0 && (
          <span className="absolute -right-0.5 top-0 grid h-5 min-w-5 place-content-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
            {s.alerts}
          </span>
        )}
      </div>
      <span className="w-full truncate text-nav font-semibold" style={{ color: INK.secondary }}>
        {s.name.split(/\s+/)[0]}
      </span>
      <span className="-mt-1 text-nav font-bold tabular-nums" style={{ color }}>
        {s.done}/{s.expected}
      </span>
    </li>
  );
}

/** One progress ring per cleaner, a red badge where a report came from off campus. */
export default function StaffRings({ staff }: { staff: StaffRing[] }) {
  return (
    <ul className="m-0 flex list-none flex-wrap justify-center gap-x-3 gap-y-4 p-0 sm:justify-start">
      {staff.map((s, i) => (
        <Ring key={s.id} s={s} index={i} />
      ))}
    </ul>
  );
}
