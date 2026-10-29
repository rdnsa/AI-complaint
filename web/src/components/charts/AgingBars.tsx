import { EASE, useMounted } from './motion';
import { AGING_COLORS, INK } from './colors';
import CountUp from './CountUp';

/** Columns that grow from the baseline, coloured from fresh to neglected. */
export default function AgingBars({ values, labels }: { values: number[]; labels: string[] }) {
  const mounted = useMounted();
  const max = Math.max(1, ...values);

  return (
    <div className="flex h-44 items-end gap-2.5">
      {values.map((v, i) => (
        <div key={labels[i]} className="flex h-full flex-1 flex-col items-center justify-end gap-1.5">
          <CountUp value={v} className="text-body-sm font-bold" style={{ color: v ? AGING_COLORS[i] : INK.muted }} />
          <div className="flex w-full flex-1 items-end rounded-xl bg-mist-100/70">
            <div
              className="w-full rounded-xl"
              style={{
                height: mounted ? `${Math.max((v / max) * 100, v ? 8 : 4)}%` : '0%',
                background: v ? `linear-gradient(180deg, ${AGING_COLORS[i]}, ${AGING_COLORS[i]}99)` : INK.gridline,
                boxShadow: v ? `0 6px 16px -6px ${AGING_COLORS[i]}` : 'none',
                transition: `height 1.1s ${EASE} ${i * 100}ms`,
              }}
            />
          </div>
          <span className="text-[11px] font-semibold" style={{ color: INK.muted }}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}
