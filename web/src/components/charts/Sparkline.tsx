import { useRef, useState, type PointerEvent } from 'react';
import { useMounted } from './motion';

/**
 * A sparkline carries shape, not values.
 *
 * It sits inside a KPI tile where the exact number is already printed beside
 * it, so it deliberately has no axes, no grid, and no labels — its whole job is
 * to say whether the number has been rising or falling.
 *
 * Under a pointer (or a finger dragged along it) it answers for one day: a
 * guide and a dot glide to the nearest point and a small label gives that day
 * and its count. The dot and guide are HTML over the SVG, because the SVG is
 * stretched to the tile and would squash a circle into an oval.
 */
export default function Sparkline({
  data,
  color,
  labels,
  describe = (value, label) => (label ? `${label} · ${value}` : String(value)),
}: {
  data: number[];
  color: string;
  /** One per point, e.g. the dates; shown with the value under the pointer. */
  labels?: string[];
  describe?: (value: number, label: string | undefined) => string;
}) {
  const mounted = useMounted();
  const box = useRef<HTMLDivElement>(null);
  const [hot, setHot] = useState<number | null>(null);
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const W = 100;
  const H = 26;
  const x = (i: number) => (i * W) / (data.length - 1);
  const y = (n: number) => H - 2 - (n / max) * (H - 4);

  const line = data.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  const track = (e: PointerEvent<HTMLDivElement>) => {
    const r = box.current?.getBoundingClientRect();
    if (!r || !r.width) return;
    const share = Math.min(Math.max((e.clientX - r.left) / r.width, 0), 1);
    setHot(Math.round(share * (data.length - 1)));
  };

  const left = hot === null ? 0 : (x(hot) / W) * 100;
  const top = hot === null ? 0 : (y(data[hot]) / H) * 100;
  // Near an edge the label hangs inward, so it never pokes out of the tile.
  const align = left < 18 ? 'left-0' : left > 82 ? 'right-0' : '-translate-x-1/2';
  const glide = 'left .18s ease-out, top .18s ease-out, opacity .15s ease';

  return (
    <div
      ref={box}
      className="relative -my-2 cursor-crosshair touch-pan-y py-2"
      onPointerMove={track}
      onPointerDown={track}
      onPointerLeave={() => setHot(null)}
      onPointerCancel={() => setHot(null)}
    >
      <svg viewBox={`0 0 ${W} ${H}`} className="block h-7 w-full overflow-visible" preserveAspectRatio="none" aria-hidden>
        <path
          d={area}
          fill={color}
          style={{ opacity: mounted ? (hot === null ? 0.12 : 0.22) : 0, transition: 'opacity .3s ease' }}
        />
        {/* pathLength=1: the line draws itself from the left, whatever its real length. */}
        <path
          d={line}
          fill="none"
          stroke={color}
          strokeWidth={hot === null ? 2 : 2.4}
          strokeLinejoin="round"
          strokeLinecap="round"
          vectorEffect="non-scaling-stroke"
          pathLength={1}
          strokeDasharray={1}
          style={{ strokeDashoffset: mounted ? 0 : 1, transition: 'stroke-dashoffset 1.2s ease-out, stroke-width .2s' }}
        />
      </svg>

      {/* The guide, the dot and the label: over the stretched SVG, in percent of the box. */}
      <div aria-hidden className="pointer-events-none absolute inset-x-0 inset-y-2" style={{ opacity: hot === null ? 0 : 1, transition: 'opacity .15s ease' }}>
        <span
          className="absolute bottom-0 w-px"
          style={{ left: `${left}%`, top: `${top}%`, background: color, opacity: 0.45, transition: glide }}
        />
        <span
          className="absolute h-2.5 w-2.5 rounded-full ring-2 ring-surface"
          style={{
            left: `${left}%`,
            top: `${top}%`,
            background: color,
            boxShadow: `0 0 0 4px ${color}33, 0 0 10px ${color}`,
            transform: `translate(-50%, -50%) scale(${hot === null ? 0.4 : 1})`,
            transition: `${glide}, transform .2s cubic-bezier(0.34, 1.56, 0.64, 1)`,
          }}
        />
        {hot !== null && (
          <span className="absolute bottom-full mb-1.5" style={{ left: `${left}%`, transition: glide }}>
            <span
              className={`absolute bottom-0 whitespace-nowrap rounded-md bg-ink-900 px-2 py-0.5 text-[11px] font-semibold tabular-nums text-surface shadow-lg ${align}`}
            >
              {describe(data[hot], labels?.[hot])}
            </span>
          </span>
        )}
      </div>
      <span className="sr-only" aria-live="polite">
        {hot === null ? '' : describe(data[hot], labels?.[hot])}
      </span>
    </div>
  );
}
