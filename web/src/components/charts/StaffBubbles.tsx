import { useMounted } from './motion';
import { INK, SINGLE } from './colors';

const MIN = 58;
const MAX = 118;
const SPRING = 'cubic-bezier(0.34, 1.56, 0.64, 1)';

/**
 * Who did how much, with no target to fall short of: anyone may do any task, so
 * this is a picture of the work and not a score. A bubble's area follows the
 * count, which is printed on it, and a red badge counts reports from off campus
 * or without GPS.
 */
export default function StaffBubbles({
  staff,
  describe,
}: {
  staff: Array<{ id: string; name: string; value: number; alerts: number }>;
  describe: (name: string, value: number) => string;
}) {
  const mounted = useMounted();
  const max = Math.max(1, ...staff.map((s) => s.value));

  return (
    <ul className="m-0 flex list-none flex-wrap items-end justify-center gap-x-4 gap-y-5 p-0">
      {staff.map((s, i) => {
        const size = MIN + Math.sqrt(s.value / max) * (MAX - MIN);
        return (
          <li
            key={s.id}
            title={describe(s.name, s.value)}
            className="flex flex-col items-center gap-1.5"
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'scale(0.2)',
              transition: `opacity .4s ease ${i * 80}ms, transform .8s ${SPRING} ${i * 80}ms`,
            }}
          >
            <div className="chart-float relative" style={{ animationDelay: `${(i % 5) * -0.9}s` }}>
              <div
                className="grid place-content-center rounded-full text-lg font-bold tabular-nums text-white"
                style={{ width: size, height: size, background: SINGLE, boxShadow: `0 6px 18px ${SINGLE}44` }}
              >
                {s.value}
              </div>
              {s.alerts > 0 && (
                <span className="absolute -right-0.5 top-0 grid h-5 min-w-5 place-content-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                  {s.alerts}
                </span>
              )}
            </div>
            <span className="max-w-[118px] truncate text-nav font-semibold" style={{ color: INK.secondary }}>
              {s.name}
            </span>
          </li>
        );
      })}
    </ul>
  );
}
