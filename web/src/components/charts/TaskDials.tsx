import CountUp from './CountUp';
import { EASE, useMounted } from './motion';
import { INK, SINGLE } from './colors';

const R = 30;
const C = 2 * Math.PI * R;

/**
 * One small dial per kind of work, its share of everything reported. Each dial
 * carries its own label, so six kinds of work need one colour rather than six
 * hues that some readers could not tell apart.
 */
export default function TaskDials({ items }: { items: Array<{ key: string; label: string; value: number }> }) {
  const mounted = useMounted();
  const total = items.reduce((n, i) => n + i.value, 0);

  return (
    <ul className="m-0 grid list-none grid-cols-2 gap-x-3 gap-y-5 p-0 sm:grid-cols-3">
      {items.map((it, i) => {
        const share = total ? it.value / total : 0;
        return (
          <li key={it.key} className="flex flex-col items-center gap-1.5 text-center">
            <div className="relative h-20 w-20">
              <svg viewBox="0 0 76 76" className="h-full w-full -rotate-90" aria-hidden>
                <circle cx="38" cy="38" r={R} fill="none" stroke={INK.gridline} strokeWidth={7} opacity={0.7} />
                <circle
                  cx="38"
                  cy="38"
                  r={R}
                  fill="none"
                  stroke={SINGLE}
                  strokeWidth={7}
                  strokeLinecap="round"
                  strokeDasharray={`${mounted && share ? Math.max(share * C, 0.01) : 0} ${C}`}
                  style={{ transition: `stroke-dasharray 1.2s ${EASE} ${i * 90}ms` }}
                />
              </svg>
              <CountUp value={it.value} className="absolute inset-0 grid place-content-center text-body-sm font-bold" style={{ color: INK.primary }} />
            </div>
            <span className="text-nav font-semibold leading-tight" style={{ color: INK.secondary }}>
              {it.label}
            </span>
            <span className="-mt-1 text-[11px] tabular-nums" style={{ color: INK.muted }}>
              {Math.round(share * 100)}%
            </span>
          </li>
        );
      })}
    </ul>
  );
}
