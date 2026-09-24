import Sparkline from './Sparkline';
import { INK } from './colors';
import { TrendGlyph } from '../Marks';

/**
 * A headline number with its recent shape and its direction of travel.
 *
 * The delta is the point: a bare count says how many, while "+12% vs the
 * previous 14 days" says whether things are getting better or worse. When there
 * is no comparable previous period the delta is omitted rather than faked.
 */
export default function KpiCard({
  label,
  value,
  unit,
  series,
  color,
  change,
  note,
  goodDirection = 'down',
}: {
  label: string;
  value: string | number;
  unit?: string;
  series?: number[];
  color: string;
  change?: number | null;
  note?: string;
  goodDirection?: 'up' | 'down';
}) {
  const up = (change ?? 0) > 0;
  const good = goodDirection === 'up' ? up : !up;
  const deltaColor = change === 0 ? 'text-maroon-600' : good ? 'text-emerald-700' : 'text-red-700';

  return (
    <div className="card flex flex-col p-4">
      <p className="text-[11px] font-bold uppercase tracking-wider text-maroon-600">{label}</p>

      <div className="mt-1 flex items-baseline gap-1.5">
        <span className="text-3xl font-extrabold tracking-tight" style={{ color: INK.primary }}>
          {value}
        </span>
        {unit && <span className="text-sm font-semibold text-maroon-600">{unit}</span>}
      </div>

      {change !== null && change !== undefined && (
        <p className={`mt-0.5 flex items-center gap-0.5 text-xs font-bold ${deltaColor}`}>
          <TrendGlyph direction={change === 0 ? 'flat' : up ? 'up' : 'down'} />
          {Math.abs(change)}%
          {note && <span className="font-medium text-maroon-600"> {note}</span>}
        </p>
      )}
      {(change === null || change === undefined) && note && (
        <p className="mt-0.5 text-xs text-maroon-600">{note}</p>
      )}

      {series && series.length > 1 && (
        <div className="mt-auto pt-3">
          <Sparkline data={series} color={color} />
        </div>
      )}
    </div>
  );
}
