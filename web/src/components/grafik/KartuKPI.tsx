import Sparkline from './Sparkline';
import { TINTA } from './warna';

/**
 * A headline number with its recent shape and its direction of travel.
 *
 * The delta is the point: a bare count says how many, while "+12% vs the
 * previous 14 days" says whether things are getting better or worse. When there
 * is no comparable previous period the delta is omitted rather than faked.
 */
export default function KartuKPI({
  label,
  nilai,
  satuan,
  deret,
  warna,
  perubahan,
  keterangan,
  arahBaik = 'turun',
}: {
  label: string;
  nilai: string | number;
  satuan?: string;
  deret?: number[];
  warna: string;
  perubahan?: number | null;
  keterangan?: string;
  arahBaik?: 'naik' | 'turun';
}) {
  const naik = (perubahan ?? 0) > 0;
  const baik = arahBaik === 'naik' ? naik : !naik;
  const warnaDelta = perubahan === 0 ? 'text-maroon-600' : baik ? 'text-emerald-700' : 'text-red-700';

  return (
    <div className="kartu flex flex-col p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">{label}</p>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: TINTA.utama }}>
          {nilai}
        </span>
        {satuan && <span className="text-sm font-semibold text-maroon-600">{satuan}</span>}
      </div>

      {perubahan !== null && perubahan !== undefined && (
        <p className={`mt-0.5 text-xs font-bold ${warnaDelta}`}>
          {naik ? '▲' : perubahan === 0 ? '■' : '▼'} {Math.abs(perubahan)}%
          {keterangan && <span className="font-medium text-maroon-600"> {keterangan}</span>}
        </p>
      )}
      {(perubahan === null || perubahan === undefined) && keterangan && (
        <p className="mt-0.5 text-xs text-maroon-600">{keterangan}</p>
      )}

      {deret && deret.length > 1 && (
        <div className="mt-auto pt-3">
          <Sparkline data={deret} warna={warna} />
        </div>
      )}
    </div>
  );
}
