import { TINTA, TUNGGAL } from './warna';

export interface ItemBatang {
  label: string;
  nilai: number;
  /** Overrides the printed value when the raw number is not the readable form. */
  tampil?: string;
  warna?: string;
}

/**
 * A magnitude ranking. The bars run horizontally because the labels are long
 * text (category names, building names) that would be truncated on an X axis.
 *
 * Values are printed at the end of each bar, so the chart stays readable
 * without relying on colour or on a pointer.
 */
export default function Batang({ data }: { data: ItemBatang[] }) {
  if (!data.length) return null;
  const maks = Math.max(...data.map((d) => d.nilai), 1);

  return (
    <ul className="space-y-2">
      {data.map((d) => (
        <li key={d.label} className="group">
          <div className="flex items-baseline justify-between gap-3 text-sm">
            <span className="truncate font-medium capitalize" style={{ color: TINTA.sekunder }}>
              {d.label}
            </span>
            <span className="shrink-0 font-bold" style={{ color: TINTA.utama }}>
              {d.tampil ?? d.nilai}
            </span>
          </div>
          <div className="mt-1 h-2.5 w-full overflow-hidden rounded-full bg-krem-100">
            <div
              className="h-full rounded-full transition-all duration-500"
              style={{
                width: `${Math.max((d.nilai / maks) * 100, 3)}%`,
                background: d.warna ?? TUNGGAL,
              }}
            />
          </div>
        </li>
      ))}
    </ul>
  );
}
