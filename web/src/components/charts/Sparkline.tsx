import { useMounted } from './motion';

/**
 * A sparkline carries shape, not values.
 *
 * It sits inside a KPI tile where the exact number is already printed beside
 * it, so it deliberately has no axes, no grid, and no labels — its whole job is
 * to say whether the number has been rising or falling.
 */
export default function Sparkline({ data, color }: { data: number[]; color: string }) {
  const mounted = useMounted();
  if (data.length < 2) return null;

  const max = Math.max(...data, 1);
  const W = 100;
  const H = 26;
  const x = (i: number) => (i * W) / (data.length - 1);
  const y = (n: number) => H - 2 - (n / max) * (H - 4);

  const line = data.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  const area = `${line} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={color} style={{ opacity: mounted ? 0.12 : 0, transition: 'opacity .8s ease .5s' }} />
      {/* pathLength=1: the line draws itself from the left, whatever its real length. */}
      <path
        d={line}
        fill="none"
        stroke={color}
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        pathLength={1}
        strokeDasharray={1}
        style={{ strokeDashoffset: mounted ? 0 : 1, transition: 'stroke-dashoffset 1.2s ease-out' }}
      />
    </svg>
  );
}
