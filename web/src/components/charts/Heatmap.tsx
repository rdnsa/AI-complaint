import { useState } from 'react';
import { langkahSekuensial, SEKUENSIAL, TINTA, tintaDiAtas } from './warna';

export interface SelPanas {
  baris: string;
  kolom: string;
  nilai: number;
}

/**
 * A matrix of counts, shaded on a single-hue sequential ramp.
 *
 * Two dimensions at once is what makes this worth drawing: a bar chart of
 * buildings and a bar chart of categories cannot show that one building is the
 * source of one particular problem. Zero keeps the empty surface rather than
 * the palest step, so "none" and "few" never look alike.
 */
export default function PetaPanas({
  data,
  baris,
  kolom,
  labelKolom,
  labelSedikit,
  labelBanyak,
}: {
  data: SelPanas[];
  baris: string[];
  kolom: string[];
  labelKolom?: (k: string) => string;
  labelSedikit: string;
  labelBanyak: string;
}) {
  const [sorot, setSorot] = useState<SelPanas | null>(null);

  const peta = new Map(data.map((d) => [`${d.baris}|${d.kolom}`, d.nilai]));
  const maks = Math.max(1, ...data.map((d) => d.nilai));
  const nilai = (b: string, k: string) => peta.get(`${b}|${k}`) ?? 0;

  return (
    <figure className="m-0">
      <div className="overflow-x-auto">
        <table className="w-full border-separate border-spacing-[2px] text-xs">
          <thead>
            <tr>
              <th />
              {kolom.map((k) => (
                <th
                  key={k}
                  className="pb-1 text-center font-semibold capitalize"
                  style={{ color: TINTA.sekunder }}
                >
                  {labelKolom ? labelKolom(k) : k}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {baris.map((b) => (
              <tr key={b}>
                <th
                  className="whitespace-nowrap pr-2 text-right font-semibold"
                  style={{ color: TINTA.sekunder }}
                >
                  {b}
                </th>
                {kolom.map((k) => {
                  const n = nilai(b, k);
                  return (
                    <td
                      key={k}
                      onMouseEnter={() => setSorot({ baris: b, kolom: k, nilai: n })}
                      onMouseLeave={() => setSorot(null)}
                      className="h-9 rounded-md border border-krem-200 text-center font-bold tabular-nums"
                      style={{
                        background: langkahSekuensial(n, maks),
                        color: n ? tintaDiAtas(n, maks) : TINTA.redup,
                      }}
                    >
                      {n || ''}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="mt-3 flex items-center gap-2 text-[10px]" style={{ color: TINTA.redup }}>
        <span>{labelSedikit}</span>
        <span className="flex gap-0.5">
          {SEKUENSIAL.map((c) => (
            <span key={c} className="h-3 w-5 rounded-sm border border-krem-200" style={{ background: c }} />
          ))}
        </span>
        <span>{labelBanyak}</span>
        {sorot && (
          <span className="ml-auto font-bold" style={{ color: TINTA.utama }}>
            {sorot.baris} · {sorot.kolom}: {sorot.nilai}
          </span>
        )}
      </div>
    </figure>
  );
}
