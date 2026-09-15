import { useState } from 'react';
import { PRIORITAS_WARNA, TINTA } from './warna';

export interface HariPrioritas {
  tanggal: string;
  tinggi: number;
  sedang: number;
  rendah: number;
}

const URUTAN = ['tinggi', 'sedang', 'rendah'] as const;

/**
 * How the day's reports were composed, not merely how many there were.
 *
 * Stacked rather than grouped because the question is the mix within a day; the
 * total height stays comparable across days, and each segment is separated by a
 * two-pixel gap so adjoining colours never touch.
 */
export default function BatangBertumpuk({
  data,
  label,
}: {
  data: HariPrioritas[];
  label: Record<(typeof URUTAN)[number], string>;
}) {
  const [sorot, setSorot] = useState<number | null>(null);
  if (!data.length) return null;

  const total = (d: HariPrioritas) => d.tinggi + d.sedang + d.rendah;
  const maks = Math.max(1, ...data.map(total));

  return (
    <figure className="m-0">
      <div className="mb-3 flex flex-wrap gap-4 text-xs font-semibold text-maroon-700">
        {URUTAN.map((p) => (
          <span key={p} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-sm" style={{ background: PRIORITAS_WARNA[p] }} />
            {label[p]}
          </span>
        ))}
      </div>

      <div className="relative flex h-40 items-end gap-1" onMouseLeave={() => setSorot(null)}>
        {data.map((d, i) => (
          <div
            key={d.tanggal}
            className="flex h-full flex-1 cursor-default flex-col justify-end gap-0.5"
            onMouseEnter={() => setSorot(i)}
            style={{ opacity: sorot === null || sorot === i ? 1 : 0.45 }}
          >
            {URUTAN.map((p) => {
              const nilai = d[p];
              if (!nilai) return null;
              return (
                <div
                  key={p}
                  className="w-full rounded-[3px]"
                  style={{
                    height: `${(nilai / maks) * 100}%`,
                    background: PRIORITAS_WARNA[p],
                    minHeight: 3,
                  }}
                />
              );
            })}
            {/* An empty day still needs a visible baseline, or it reads as missing data. */}
            {!total(d) && <div className="h-[3px] w-full rounded-full bg-krem-200" />}
          </div>
        ))}

        {sorot !== null && (
          <div
            className="pointer-events-none absolute -top-2 z-10 -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-lg bg-maroon-900 px-2.5 py-1.5 text-xs text-permukaan shadow-naik"
            style={{ left: `${((sorot + 0.5) / data.length) * 100}%` }}
          >
            <p className="font-bold">{data[sorot].tanggal}</p>
            {URUTAN.map((p) => (
              <p key={p}>
                {label[p]}: {data[sorot][p]}
              </p>
            ))}
          </div>
        )}
      </div>

      <div className="mt-1.5 flex justify-between text-[10px]" style={{ color: TINTA.redup }}>
        <span>{data[0].tanggal.slice(5)}</span>
        <span>{data[data.length - 1].tanggal.slice(5)}</span>
      </div>
    </figure>
  );
}
