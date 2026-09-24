import { useCallback, useEffect, useMemo, useState } from 'react';
import { api, type StaffOption, type WorkLog } from '../lib/api';
import { useFormatTime, useLanguage, useRelativeTime } from '../lib/i18n';
import TimeFilter, { EMPTY_TIME_RANGE, type TimeRange } from './TimeFilter';
import { CheckGlyph, DropGlyph } from './Marks';
import ZoomableImage from './ZoomableImage';

/**
 * The supervisor's view of the staff work log: which toilets have been
 * cleaned, by whom, with the AI-checked photo — for everyone, or one person.
 */
export default function WorkLogPanel() {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [data, setData] = useState<WorkLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [staffList, setStaffList] = useState<StaffOption[]>([]);
  const [staffId, setStaffId] = useState('');
  const [time, setTime] = useState<TimeRange>(EMPTY_TIME_RANGE);
  const formatTime = useFormatTime();

  const load = useCallback(async () => {
    try {
      setData((await api.workLogs({ staff_id: staffId, ...time, limit: '200' })).data);
    } catch {
      setData([]);
    } finally {
      setLoading(false);
    }
  }, [staffId, time]);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    api
      .staffList()
      .then((r) => setStaffList(r.data))
      .catch(() => setStaffList([]));
  }, []);

  // How many toilets each person has on record in the loaded list, busiest first.
  const perStaff = useMemo(() => {
    const counts = new Map<string, number>();
    for (const w of data) counts.set(w.staff_name, (counts.get(w.staff_name) ?? 0) + 1);
    return [...counts].sort((a, b) => b[1] - a[1]);
  }, [data]);

  return (
    <div className="mt-6">
      <p className="rounded-xl bg-permukaan px-4 py-3 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
        {t('work.description')}
      </p>

      <select
        className="input mt-4 !w-auto !py-2"
        value={staffId}
        onChange={(e) => setStaffId(e.target.value)}
      >
        <option value="">{t('work.all_staff')}</option>
        {staffList.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>

      <TimeFilter value={time} onChange={setTime} />

      {!loading && <p className="mt-3 text-xs text-maroon-600">{t('time.count', { n: data.length })}</p>}

      {!staffId && perStaff.length > 1 && (
        <div className="mt-3 flex flex-wrap gap-2">
          {perStaff.map(([name, count]) => (
            <span
              key={name}
              className="rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-900 ring-1 ring-emerald-200"
            >
              {name}: {count}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 space-y-3">
        {loading && <p className="text-maroon-600">{t('common.loading')}</p>}
        {!loading && !data.length && (
          <p className="card p-10 text-center text-maroon-600">{t('work.empty')}</p>
        )}
        {data.map((w) => (
          <article key={w.id} className="card border-l-4 border-l-emerald-400 p-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-bold text-emerald-800 ring-1 ring-inset ring-emerald-200">
                <CheckGlyph className="h-3.5 w-3.5" />
                {t('dashboard.proof_verified')}
              </span>
              <span className="text-sm font-semibold text-maroon-900">{w.staff_name}</span>
              <span className="ml-auto text-xs text-maroon-600">{relativeTime(w.created_at)}</span>
            </div>
            <p className="mt-1.5 flex items-center gap-1 text-xs text-maroon-700">
              <DropGlyph className="h-3.5 w-3.5" />
              <span className="font-semibold">{t('time.cleaned')}:</span> {formatTime(w.created_at)}
            </p>
            <p className="mt-2 font-bold text-maroon-900">{w.toilet_name}</p>
            <p className="mt-1 text-maroon-800">{w.description}</p>
            {w.photo_url && (
              <figure className="m-0 mt-3">
                <ZoomableImage
                  src={w.photo_url}
                  caption={`${t('dashboard.proof')} · ${w.toilet_name}`}
                  frameClassName="ring-2 ring-emerald-400"
                  className="max-h-44"
                />
                {w.proof_reason && (
                  <figcaption className="mt-1 max-w-xs text-xs italic text-maroon-600">
                    {w.proof_reason}
                  </figcaption>
                )}
              </figure>
            )}
          </article>
        ))}
      </div>
    </div>
  );
}
