import { useState } from 'react';
import { SERI, TINTA } from './warna';

export interface TitikHarian {
  tanggal: string;
  total: number;
  selesai: number;
}

const L = 34; // ruang sumbu kiri
const K = 8;
const A = 12;
const B = 22; // ruang label tanggal
const W = 640;
const H = 190;

/**
 * Reports received and reports resolved over time.
 *
 * Both are the same unit (a count of reports), so one Y axis is enough. A dual
 * axis is deliberately avoided: two scales on one plot make the gap between the
 * lines read as a difference that does not exist.
 */
export default function Garis({
  data,
  labelMasuk,
  labelSelesai,
}: {
  data: TitikHarian[];
  labelMasuk: string;
  labelSelesai: string;
}) {
  const [sorot, setSorot] = useState<number | null>(null);
  if (data.length < 2) return null;

  const maks = Math.max(1, ...data.map((d) => d.total));
  const x = (i: number) => L + (i * (W - L - K)) / (data.length - 1);
  const y = (n: number) => A + (1 - n / maks) * (H - A - B);

  const garis = (ambil: (d: TitikHarian) => number) =>
    data.map((d, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)},${y(ambil(d)).toFixed(1)}`).join(' ');

  const tanda = [0, Math.round(maks / 2), maks].filter((v, i, a) => a.indexOf(v) === i);
  const aktif = sorot === null ? null : data[sorot];

  return (
    <figure className="m-0">
      <div className="mb-2 flex flex-wrap items-center gap-4 text-xs font-semibold text-maroon-700">
        {[
          { warna: SERI.masuk, label: labelMasuk },
          { warna: SERI.selesai, label: labelSelesai },
        ].map((s) => (
          <span key={s.label} className="inline-flex items-center gap-1.5">
            <span className="h-2.5 w-2.5 rounded-full" style={{ background: s.warna }} />
            {s.label}
          </span>
        ))}
      </div>

      <div className="relative">
        <svg
          viewBox={`0 0 ${W} ${H}`}
          className="w-full"
          role="img"
          onMouseLeave={() => setSorot(null)}
        >
          {tanda.map((v) => (
            <g key={v}>
              <line x1={L} x2={W - K} y1={y(v)} y2={y(v)} stroke={TINTA.garis} strokeWidth={1} />
              <text x={L - 7} y={y(v) + 3.5} textAnchor="end" fontSize={10} fill={TINTA.redup}>
                {v}
              </text>
            </g>
          ))}

          {data.map((d, i) =>
            // Dates are labelled sparsely so they do not collide on narrow screens.
            i % Math.ceil(data.length / 5) === 0 || i === data.length - 1 ? (
              <text
                key={d.tanggal}
                x={x(i)}
                y={H - 6}
                textAnchor="middle"
                fontSize={10}
                fill={TINTA.redup}
              >
                {d.tanggal.slice(8)}/{d.tanggal.slice(5, 7)}
              </text>
            ) : null,
          )}

          <path d={garis((d) => d.total)} fill="none" stroke={SERI.masuk} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
          <path d={garis((d) => d.selesai)} fill="none" stroke={SERI.selesai} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />

          {sorot !== null && aktif && (
            <g>
              <line x1={x(sorot)} x2={x(sorot)} y1={A} y2={H - B} stroke={TINTA.redup} strokeWidth={1} strokeDasharray="3 3" />
              {/* Cincin putih memisahkan penanda dari garis di belakangnya. */}
              <circle cx={x(sorot)} cy={y(aktif.total)} r={5} fill={SERI.masuk} stroke="#fff" strokeWidth={2} />
              <circle cx={x(sorot)} cy={y(aktif.selesai)} r={5} fill={SERI.selesai} stroke="#fff" strokeWidth={2} />
            </g>
          )}

          {/* Bidang tak terlihat: sasaran arahkan kursor jauh lebih besar dari titiknya. */}
          {data.map((d, i) => (
            <rect
              key={d.tanggal}
              x={x(i) - (W - L - K) / (data.length - 1) / 2}
              y={0}
              width={(W - L - K) / (data.length - 1)}
              height={H - B}
              fill="transparent"
              onMouseEnter={() => setSorot(i)}
            />
          ))}
        </svg>

        {sorot !== null && aktif && (
          <div
            className="pointer-events-none absolute -translate-x-1/2 -translate-y-full rounded-lg bg-maroon-900 px-2.5 py-1.5 text-xs text-white shadow-naik"
            style={{ left: `${(x(sorot) / W) * 100}%`, top: `${(y(Math.max(aktif.total, aktif.selesai)) / H) * 100}%` }}
          >
            <p className="font-bold">{aktif.tanggal}</p>
            <p>
              {labelMasuk}: {aktif.total}
            </p>
            <p>
              {labelSelesai}: {aktif.selesai}
            </p>
          </div>
        )}
      </div>

      {/* Padanan tabel untuk pembaca layar dan penyalinan data. */}
      <table className="sr-only">
        <caption>{`${labelMasuk} / ${labelSelesai}`}</caption>
        <tbody>
          {data.map((d) => (
            <tr key={d.tanggal}>
              <th scope="row">{d.tanggal}</th>
              <td>{d.total}</td>
              <td>{d.selesai}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </figure>
  );
}
