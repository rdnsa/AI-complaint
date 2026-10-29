import { useCallback, useEffect, useMemo, useState } from 'react';
import Header from '../components/Header';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import LocationSelect from '../components/LocationSelect';
import { api, type CleaningArea, type PublicCleaningReport, type PublicReport } from '../lib/api';
import { useFormatTime, useLanguage, useRelativeTime } from '../lib/i18n';
import { buildPlaces, reportIsAt } from '../lib/places';
import { CheckGlyph, ReportsMark, StaffMark, StudentMark } from '../components/Marks';
import ZoomableImage from '../components/ZoomableImage';
import { Reveal } from '../lib/motion';
import Select from '../components/Select';

type Tab = 'reporters' | 'staff';

/**
 * The public board: the complaints from reporters, and the work reports from
 * staff, side by side under two tabs and one location filter.
 *
 * Nothing here can be changed: status, analysis and deletion stay with
 * signed-in staff. Neither list names a staff member.
 */
export default function PublicReports() {
  const { t } = useLanguage();
  const [tab, setTab] = useState<Tab>('reporters');
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [placeKey, setPlaceKey] = useState('');
  const [part, setPart] = useState('');

  useEffect(() => {
    api
      .cleaningAreas()
      .then((r) => setAreas(r.data))
      .catch(() => setAreas([]));
  }, []);

  const places = useMemo(() => buildPlaces(areas), [areas]);
  const place = places.find((p) => p.key === placeKey) ?? null;
  /** No place: everything. Staff reports always point at an area. */
  const isHere = (r: Pick<PublicReport, 'area_id' | 'building_code' | 'floor'>) =>
    !place || reportIsAt(r, areas, place, part);

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={t('public.title')}
        description={t('public.description')}
        mark={<ReportsMark size="h-12 w-12 rounded-[14px]" />}
      />

      <main className="mx-auto max-w-3xl px-4">
        <nav className="mt-6 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => setTab('reporters')}
            aria-pressed={tab === 'reporters'}
            className={tab === 'reporters' ? 'choice-on !py-3' : 'choice-off !py-3'}
          >
            <StudentMark size="h-8 w-8 rounded-lg" />
            {t('public.tab_reporters')}
          </button>
          <button
            type="button"
            onClick={() => setTab('staff')}
            aria-pressed={tab === 'staff'}
            className={tab === 'staff' ? 'choice-on !py-3' : 'choice-off !py-3'}
          >
            <StaffMark size="h-8 w-8 rounded-lg" />
            {t('public.tab_staff')}
          </button>
        </nav>

        <div className="mt-4">
          <LocationSelect
            places={places}
            placeKey={placeKey}
            part={part}
            onChange={(key, next) => {
              setPlaceKey(key);
              setPart(next);
            }}
          />
        </div>

        {tab === 'reporters' ? <ReporterList isHere={isHere} /> : <StaffList isHere={isHere} />}
      </main>
    </div>
  );
}

type IsHere = (r: Pick<PublicReport, 'area_id' | 'building_code' | 'floor'>) => boolean;

function ReporterList({ isHere }: { isHere: IsHere }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [reports, setReports] = useState<PublicReport[]>([]);
  const [counts, setCounts] = useState({ total: 0, resolved: 0 });
  const [filter, setFilter] = useState({ status: '', priority: '' });
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    try {
      const r = await api.publicReports(filter);
      setReports(r.data);
      setCounts({ total: r.counts.total, resolved: r.counts.resolved ?? 0 });
    } catch {
      setReports([]);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => {
    load();
  }, [load]);

  const shown = reports.filter(isHere);

  return (
    <>
      <p className="card mt-4 px-4 py-3 text-sm font-semibold text-ink-800">
        {t('public.count', { resolved: counts.resolved, total: counts.total })}
      </p>

      <div className="mt-4 flex flex-wrap gap-2">
        <Select
          className="input !w-auto !py-2"
          value={filter.status}
          onChange={(v) => setFilter((f) => ({ ...f, status: v }))}
        >
          <option value="">{t('dashboard.all_statuses')}</option>
          <option value="new">{t('status.new')}</option>
          <option value="in_progress">{t('status.in_progress')}</option>
          <option value="resolved">{t('status.resolved')}</option>
        </Select>
        <Select
          className="input !w-auto !py-2"
          value={filter.priority}
          onChange={(v) => setFilter((f) => ({ ...f, priority: v }))}
        >
          <option value="">{t('dashboard.all_priorities')}</option>
          <option value="high">{t('priority_short.high')}</option>
          <option value="medium">{t('priority_short.medium')}</option>
          <option value="low">{t('priority_short.low')}</option>
        </Select>
      </div>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-ink-600">{t('dashboard.loading_reports')}</p>}
        {!loading && !shown.length && <p className="card p-10 text-center text-ink-600">{t('public.empty')}</p>}

        {shown.map((r) => (
          <Reveal key={r.id}>
            <article className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <PriorityBadge value={r.priority} />
                <StatusBadge value={r.status} />
                {r.categories.map((c) => (
                  <CategoryBadge key={c} value={c} />
                ))}
                <span className="ml-auto text-xs text-ink-600">{relativeTime(r.created_at)}</span>
              </div>

              <p className="mt-2.5 font-bold text-ink-900">{r.location_name}</p>
              <p className="mt-1 text-ink-800">
                {r.summary ?? <span className="italic text-ink-600">{t('public.pending_summary')}</span>}
              </p>

              {/* The staff proof photo is shown openly: this is what lets anyone
                  check the claim that a report "has been handled". */}
              {r.proof_photo_url && (
                <ZoomableImage
                  src={r.proof_photo_url}
                  alt={t('dashboard.proof')}
                  caption={`${t('dashboard.proof')} · ${r.location_name}`}
                  frameClassName="mt-3 ring-2 ring-emerald-400"
                  className="max-h-48"
                />
              )}

              {r.resolved_at && (
                <p className="mt-2 flex items-center gap-1 text-xs font-semibold text-emerald-700">
                  <CheckGlyph className="h-3.5 w-3.5" />
                  {t('tracker.resolved')} · {relativeTime(r.resolved_at)}
                </p>
              )}
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}

function StaffList({ isHere }: { isHere: IsHere }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const formatTime = useFormatTime();
  const [reports, setReports] = useState<PublicCleaningReport[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .publicCleaningReports()
      .then((r) => setReports(r.data))
      .catch(() => setReports([]))
      .finally(() => setLoading(false));
  }, []);

  const shown = reports.filter((r) => isHere({ area_id: r.area_id, building_code: null, floor: null }));

  return (
    <>
      <p className="card mt-4 px-4 py-3 text-sm font-semibold text-ink-800">
        {t('public.staff_count', { n: shown.length })}
      </p>

      <div className="mt-4 space-y-3">
        {loading && <p className="text-ink-600">{t('dashboard.loading_reports')}</p>}
        {!loading && !shown.length && <p className="card p-10 text-center text-ink-600">{t('public.staff_empty')}</p>}

        {shown.map((r) => (
          <Reveal key={r.id}>
            <article className="card p-6">
              <div className="flex flex-wrap items-center gap-2">
                <span className="flex items-center gap-1.5 text-sm font-semibold text-ink-800">
                  <StaffMark size="h-6 w-6 rounded-md" />
                  {t('public.staff_by')}
                </span>
                <span className="ml-auto text-xs text-ink-600">{relativeTime(r.created_at)}</span>
              </div>
              <p className="mt-2.5 font-bold text-ink-900">{r.area_name}</p>
              {r.note && <p className="mt-1 text-ink-800">“{r.note}”</p>}
              <div className="mt-3 flex flex-wrap gap-3">
                {r.tasks.map((task) => (
                  <figure key={task.task} className="m-0">
                    {task.photo_url && (
                      <ZoomableImage
                        src={task.photo_url}
                        caption={`${t(`task.${task.task}`)} · ${r.area_name}`}
                        className="max-h-40"
                      />
                    )}
                    <figcaption className="mt-1 flex items-center gap-1 text-xs font-bold text-ink-800">
                      <CheckGlyph className="h-3.5 w-3.5 text-emerald-600" />
                      {t(`task.${task.task}`)} · {formatTime(task.photo_at)}
                    </figcaption>
                  </figure>
                ))}
              </div>
            </article>
          </Reveal>
        ))}
      </div>
    </>
  );
}
