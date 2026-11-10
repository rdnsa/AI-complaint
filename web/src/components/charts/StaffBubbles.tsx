import { useMounted } from './motion';
import { INK, SINGLE } from './colors';
import { NARROW, useWidth } from './useWidth';

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
  onOpen,
}: {
  staff: Array<{ id: string; name: string; value: number; alerts: number }>;
  describe: (name: string, value: number) => string;
  /** Opens this person's own reports. */
  onOpen: (id: string) => void;
}) {
  const mounted = useMounted();
  const [box, width] = useWidth<HTMLUListElement>();
  const max = Math.max(1, ...staff.map((s) => s.value));
  // On a phone the desktop sizes fit two to a row and the list runs past a screen: smaller, three or four to a row.
  const scale = width && width < NARROW ? 0.6 : 1;

  // Nobody reported yet: a few dashed bubbles hold the place the people will take.
  if (!staff.length)
    return (
      <ul aria-hidden className="m-0 flex flex-1 list-none flex-wrap content-center items-end justify-center gap-x-4 gap-y-5 p-0">
        {[0.7, 1, 0.55].map((scale, i) => (
          <li
            key={i}
            className="flex flex-col items-center gap-1.5"
            style={{ opacity: mounted ? 1 : 0, transition: `opacity .4s ease ${i * 80}ms` }}
          >
            <span
              className="grid place-content-center rounded-full border border-dashed border-ink-600/50 text-lg font-bold"
              style={{ width: MIN + scale * (MAX - MIN) * 0.6, height: MIN + scale * (MAX - MIN) * 0.6, color: INK.muted }}
            >
              0
            </span>
            <span className="h-2 w-14 rounded-full bg-mist-200" />
          </li>
        ))}
      </ul>
    );

  return (
    <ul
      ref={box}
      className={`m-0 flex flex-1 list-none flex-wrap content-center items-end justify-center p-0 ${
        scale < 1 ? 'gap-x-2.5 gap-y-3' : 'gap-x-4 gap-y-5'
      }`}
    >
      {staff.map((s, i) => {
        const size = (MIN + Math.sqrt(s.value / max) * (MAX - MIN)) * scale;
        return (
          <li
            key={s.id}
            style={{
              opacity: mounted ? 1 : 0,
              transform: mounted ? 'none' : 'scale(0.2)',
              transition: `opacity .4s ease ${i * 80}ms, transform .8s ${SPRING} ${i * 80}ms`,
            }}
          >
            <button
              type="button"
              onClick={() => onOpen(s.id)}
              title={describe(s.name, s.value)}
              aria-label={describe(s.name, s.value)}
              className="group flex flex-col items-center gap-1.5 rounded-2xl outline-none focus-visible:ring-2 focus-visible:ring-accent-500"
            >
              <span className="chart-float relative block" style={{ animationDelay: `${(i % 5) * -0.9}s` }}>
                <span
                  className={`grid place-content-center rounded-full font-bold tabular-nums text-white transition-transform duration-200 group-hover:scale-105 group-active:scale-95 ${
                    scale < 1 ? 'text-sm' : 'text-lg'
                  }`}
                  style={{ width: size, height: size, background: SINGLE, boxShadow: `0 6px 18px ${SINGLE}44` }}
                >
                  {s.value}
                </span>
                {s.alerts > 0 && (
                  <span className="absolute -right-0.5 top-0 grid h-5 min-w-5 place-content-center rounded-full bg-red-600 px-1 text-[10px] font-bold text-white ring-2 ring-surface">
                    {s.alerts}
                  </span>
                )}
              </span>
              <span
                className={`truncate font-semibold group-hover:underline ${scale < 1 ? 'max-w-[84px] text-[11px]' : 'max-w-[118px] text-nav'}`}
                style={{ color: INK.secondary }}
              >
                {s.name}
              </span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
