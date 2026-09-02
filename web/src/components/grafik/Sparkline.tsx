/**
 * A sparkline carries shape, not values.
 *
 * It sits inside a KPI tile where the exact number is already printed beside
 * it, so it deliberately has no axes, no grid, and no labels — its whole job is
 * to say whether the number has been rising or falling.
 */
export default function Sparkline({ data, warna }: { data: number[]; warna: string }) {
  if (data.length < 2) return null;

  const maks = Math.max(...data, 1);
  const W = 100;
  const H = 26;
  const x = (i: number) => (i * W) / (data.length - 1);
  const y = (n: number) => H - 2 - (n / maks) * (H - 4);

  const garis = data.map((n, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(n).toFixed(1)}`).join(' ');
  const area = `${garis} L${W},${H} L0,${H} Z`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="h-7 w-full" preserveAspectRatio="none" aria-hidden>
      <path d={area} fill={warna} opacity={0.12} />
      <path d={garis} fill="none" stroke={warna} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}
