import { useCallback, useEffect, useMemo, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Camera from '../components/Camera';
import Header from '../components/Header';
import StaffPicker from '../components/StaffPicker';
import {
  api,
  ApiError,
  type Campus,
  type CleaningArea,
  type CleaningTask,
  type LocationStatus,
  type StaffOption,
} from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { formatWIB, useServerClock } from '../lib/server-clock';
import { useSelectedStaff } from '../lib/staff';
import { CameraGlyph, CheckGlyph, DoneMark, PinGlyph, StaffMark } from '../components/Marks';

/**
 * The cleaning report for one area, opened from the area's QR.
 *
 * The staff member picks their name, then photographs each task they did on
 * this area: a ticked task is a task with a photo. Photos come only from the
 * live camera, carry a stamp with name, area, server time and GPS, and are
 * uploaded the moment they are taken so the server's receipt time is the
 * capture time. The phone's position is checked against the campus; far away
 * or unknown, the staff member is warned and can still send, but the report is
 * flagged to the supervisor.
 */

type Position = { latitude: number; longitude: number; accuracy: number | null };
type Gps =
  | { state: 'locating' }
  | { state: 'ok' | 'far'; position: Position; distance: number }
  | { state: 'unavailable'; reason: 'denied' | 'unsupported' | 'failed' };

function distanceMeters(lat1: number, lng1: number, lat2: number, lng2: number): number {
  const rad = Math.PI / 180;
  const a =
    Math.sin(((lat2 - lat1) * rad) / 2) ** 2 +
    Math.cos(lat1 * rad) * Math.cos(lat2 * rad) * Math.sin(((lng2 - lng1) * rad) / 2) ** 2;
  return 2 * 6_371_000 * Math.asin(Math.sqrt(a));
}

/** Mirrors the server's rule, only to warn early; the server decides what is stored. */
function useCampusGps(campus: Campus | null) {
  const [gps, setGps] = useState<Gps>({ state: 'locating' });

  const locate = useCallback((): Promise<Gps> => {
    if (!campus) return Promise.resolve({ state: 'locating' });
    if (!navigator.geolocation) {
      const g: Gps = { state: 'unavailable', reason: 'unsupported' };
      setGps(g);
      return Promise.resolve(g);
    }
    setGps((g) => (g.state === 'unavailable' ? { state: 'locating' } : g));
    return new Promise((resolve) => {
      navigator.geolocation.getCurrentPosition(
        (p) => {
          const position = {
            latitude: p.coords.latitude,
            longitude: p.coords.longitude,
            accuracy: Number.isFinite(p.coords.accuracy) ? Math.round(p.coords.accuracy) : null,
          };
          const distance = Math.round(distanceMeters(campus.lat, campus.lng, position.latitude, position.longitude));
          const slack = Math.min(position.accuracy ?? 0, 200);
          const g: Gps = { state: distance - slack > campus.radius_m ? 'far' : 'ok', position, distance };
          setGps(g);
          resolve(g);
        },
        (err) => {
          const g: Gps = { state: 'unavailable', reason: err.code === err.PERMISSION_DENIED ? 'denied' : 'failed' };
          setGps(g);
          resolve(g);
        },
        { enableHighAccuracy: true, timeout: 15_000, maximumAge: 30_000 },
      );
    });
  }, [campus]);

  useEffect(() => {
    locate();
  }, [locate]);

  return { gps, locate };
}

function formatDistance(m: number): string {
  return m >= 1000 ? `${(m / 1000).toFixed(1)} km` : `${m} m`;
}

type Shot = { preview: string; key: string | null; uploading: boolean; error: string | null };

export default function CleaningForm() {
  const { areaId = '' } = useParams();
  const { t } = useLanguage();
  const { staffList, selected, select, loading: loadingStaff } = useSelectedStaff();
  const [area, setArea] = useState<(CleaningArea & { campus: Campus }) | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .cleaningArea(areaId)
      .then(setArea)
      .catch(() => setArea(null))
      .finally(() => setLoading(false));
  }, [areaId]);

  // The staff assigned here come first on the dropdown.
  const sortedStaff = useMemo(() => {
    const assigned = new Set(area?.staff.map((s) => s.id));
    return [...staffList].sort((a, b) => Number(assigned.has(b.id)) - Number(assigned.has(a.id)));
  }, [staffList, area]);

  if (loading || loadingStaff) {
    return (
      <div className="min-h-screen">
        <Header title={t('clean.title')} compact />
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!area) {
    return (
      <div className="min-h-screen">
        <Header title={t('clean.unknown_area')} compact />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <p className="text-ink-700">{t('clean.unknown_area_body')}</p>
          <p className="mt-2">
            <code className="rounded-lg bg-mist-200 px-2 py-1 text-sm text-ink-800">{areaId}</code>
          </p>
          <Link to="/clean" className="btn-primary mt-6">
            {t('report.choose_manually')}
          </Link>
        </div>
      </div>
    );
  }

  const notAssigned = selected && !area.staff.some((s) => s.id === selected.id);

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('clean.title')} description={t('clean.description')} compact mark={<StaffMark />} />

      <main className="mx-auto max-w-lg px-4">
        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-ink-900">{area.name}</h2>

        <div className="mt-4">
          <StaffPicker staffList={sortedStaff} selected={selected} onSelect={select} />
        </div>
        {notAssigned && (
          <p className="mt-2 rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
            {t('clean.not_assigned')}
          </p>
        )}

        {/* Keyed by person, so switching names on a shared phone starts a clean form. */}
        {selected && <ReportForm key={selected.id} area={area} staff={selected} />}
      </main>
    </div>
  );
}

function ReportForm({ area, staff }: { area: CleaningArea & { campus: Campus }; staff: StaffOption }) {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-GB';
  const clock = useServerClock();
  const { gps, locate } = useCampusGps(area.campus);
  const [shots, setShots] = useState<Partial<Record<CleaningTask, Shot>>>({});
  const [camera, setCamera] = useState<CleaningTask | null>(null);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<{
    tasks: CleaningTask[];
    status: LocationStatus;
    distance: number | null;
    at: Date | null;
  } | null>(null);

  // Object URLs are released when the form goes away.
  useEffect(() => () => Object.values(shots).forEach((s) => s && URL.revokeObjectURL(s.preview)), []); // eslint-disable-line react-hooks/exhaustive-deps

  function stampFor(task: CleaningTask): () => string[] {
    return () => {
      const now = clock.now();
      const position = gps.state === 'ok' || gps.state === 'far' ? gps.position : null;
      return [
        `${staff.name} · ${t(`task.${task}`)}`,
        area.name,
        now ? formatWIB(now, locale) : t('clean.stamp_no_time'),
        position
          ? `GPS ${position.latitude.toFixed(5)}, ${position.longitude.toFixed(5)}${position.accuracy !== null ? ` (±${position.accuracy} m)` : ''}`
          : t('clean.stamp_no_gps'),
      ];
    };
  }

  async function capture(task: CleaningTask, photo: File) {
    const previous = shots[task];
    if (previous) URL.revokeObjectURL(previous.preview);
    const preview = URL.createObjectURL(photo);
    setError(null);
    setShots((s) => ({ ...s, [task]: { preview, key: null, uploading: true, error: null } }));
    try {
      const { key } = await api.uploadPhoto(photo, 'cleaning');
      setShots((s) => (s[task]?.preview === preview ? { ...s, [task]: { preview, key, uploading: false, error: null } } : s));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clean.upload_failed');
      setShots((s) =>
        s[task]?.preview === preview ? { ...s, [task]: { preview, key: null, uploading: false, error: message } } : s,
      );
    }
  }

  function remove(task: CleaningTask) {
    const shot = shots[task];
    if (shot) URL.revokeObjectURL(shot.preview);
    setShots((s) => {
      const next = { ...s };
      delete next[task];
      return next;
    });
  }

  const ready = area.tasks.filter((task) => shots[task]?.key);
  const uploading = area.tasks.some((task) => shots[task]?.uploading);

  async function send(force: boolean) {
    setError(null);
    // A fresh position at the moment of sending; the one from page load may be stale.
    const current = await locate();
    if (!force && current.state !== 'ok') {
      setConfirming(true);
      return;
    }
    setConfirming(false);
    setSending(true);
    try {
      const position = current.state === 'ok' || current.state === 'far' ? current.position : null;
      const result = await api.submitCleaning({
        staff_id: staff.id,
        area_id: area.id,
        tasks: ready.map((task) => ({ task, photo_key: shots[task]!.key! })),
        note: note.trim() || null,
        position,
      });
      setSent({ tasks: ready, status: result.location_status, distance: result.distance_m, at: clock.now() });
    } catch (err) {
      // A photo the server refused (too old, already used) must be taken again.
      const task = err instanceof ApiError ? (err.data.task as CleaningTask | undefined) : undefined;
      if (task) remove(task);
      setError(err instanceof Error ? err.message : t('clean.error_submit'));
    } finally {
      setSending(false);
    }
  }

  if (sent) {
    return (
      <section className="card mt-4 p-6 text-center">
        <DoneMark className="mx-auto" />
        <h3 className="mt-3 text-xl font-extrabold tracking-tight text-ink-900">{t('clean.submitted')}</h3>
        <p className="mt-1 text-ink-700">{area.name}</p>
        {sent.at && <p className="mt-0.5 text-sm text-ink-600">{formatWIB(sent.at, locale)}</p>}
        <ul className="mx-auto mt-4 max-w-xs space-y-1 text-left">
          {sent.tasks.map((task) => (
            <li key={task} className="flex items-center gap-2 text-ink-900">
              <CheckGlyph className="h-4 w-4 text-emerald-600" />
              {t(`task.${task}`)}
            </li>
          ))}
        </ul>
        {sent.status !== 'ok' && (
          <p className="mt-4 rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
            {sent.status === 'far'
              ? t('clean.sent_flagged_far', { distance: formatDistance(sent.distance ?? 0) })
              : t('clean.sent_flagged_unknown')}
          </p>
        )}
        <Link to="/clean" className="btn-primary mt-6 w-full py-3">
          {t('clean.report_another')}
        </Link>
      </section>
    );
  }

  return (
    <div className="mt-4 space-y-5">
      <GpsCard gps={gps} campus={area.campus} onRetry={locate} />

      <div>
        <span className="label">{t('clean.tasks_label')}</span>
        <p className="-mt-1 mb-2 text-xs leading-relaxed text-ink-600">{t('clean.tasks_hint')}</p>
        <div className="space-y-3">
          {area.tasks.map((task) => {
            const shot = shots[task];
            return (
              <article
                key={task}
                className={`card p-4 ${shot?.key ? 'ring-2 ring-emerald-400' : ''}`}
              >
                <div className="flex items-center gap-3">
                  <span
                    className={`grid h-7 w-7 shrink-0 place-items-center rounded-lg border-2 ${
                      shot?.key ? 'border-emerald-500 bg-emerald-500 text-white' : 'border-mist-300 text-transparent'
                    }`}
                    aria-hidden
                  >
                    <CheckGlyph className="h-4 w-4" />
                  </span>
                  <p className="flex-1 text-lg font-bold text-ink-900">{t(`task.${task}`)}</p>
                  {!shot && (
                    <button type="button" onClick={() => setCamera(task)} className="btn-primary !px-4 !py-2">
                      <CameraGlyph className="h-5 w-5" />
                      {t('clean.photo')}
                    </button>
                  )}
                </div>

                {shot && (
                  <div className="mt-3">
                    <img src={shot.preview} alt="" className="w-full rounded-xl" />
                    <div className="mt-2 flex items-center gap-2 text-sm">
                      {shot.uploading && <span className="text-ink-600">{t('dashboard.uploading')}</span>}
                      {shot.key && (
                        <span className="flex items-center gap-1 font-semibold text-emerald-700">
                          <CheckGlyph className="h-4 w-4" />
                          {t('clean.photo_saved')}
                        </span>
                      )}
                      {shot.error && <span className="text-red-700">{shot.error}</span>}
                      <button
                        type="button"
                        onClick={() => setCamera(task)}
                        disabled={shot.uploading || sending}
                        className="btn-neutral ml-auto !px-3 !py-1.5 text-xs"
                      >
                        {t('clean.retake')}
                      </button>
                      <button
                        type="button"
                        onClick={() => remove(task)}
                        disabled={shot.uploading || sending}
                        className="btn !px-3 !py-1.5 text-xs text-red-700 hover:bg-red-50"
                      >
                        {t('report.remove_photo')}
                      </button>
                    </div>
                  </div>
                )}
              </article>
            );
          })}
        </div>
        <Camera
          open={camera !== null}
          onClose={() => setCamera(null)}
          onCapture={(f) => camera && capture(camera, f)}
          stamp={camera ? stampFor(camera) : undefined}
        />
      </div>

      <div>
        <label htmlFor="note" className="label">
          {t('clean.note_label')}
        </label>
        <textarea
          id="note"
          className="input min-h-[80px] resize-y"
          placeholder={t('clean.note_placeholder')}
          value={note}
          onChange={(e) => setNote(e.target.value)}
          maxLength={500}
        />
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([t('clean.note_example1'), t('clean.note_example2'), t('clean.note_example3')] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setNote(c)}
              className="rounded-full border border-mist-200 bg-surface px-3 py-1.5 text-sm text-ink-700 transition hover:border-accent-300 hover:text-accent-700"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800" role="alert">
          {error}
        </p>
      )}

      {confirming ? (
        <div role="alertdialog" className="rounded-card bg-red-50 p-5 text-red-900 ring-2 ring-red-300">
          <p className="font-bold">
            {gps.state === 'far' ? t('clean.confirm_far_title') : t('clean.confirm_unknown_title')}
          </p>
          <p className="mt-1 text-body-sm">
            {gps.state === 'far'
              ? t('clean.confirm_far_body', { distance: formatDistance(gps.distance) })
              : t('clean.confirm_unknown_body')}
          </p>
          <div className="mt-4 flex flex-col gap-2">
            <button type="button" onClick={() => setConfirming(false)} className="btn-primary w-full py-3">
              {t('clean.confirm_cancel')}
            </button>
            <button
              type="button"
              onClick={() => send(true)}
              disabled={sending}
              className="btn w-full py-2.5 text-red-800 ring-1 ring-red-300 hover:bg-red-100"
            >
              {t('clean.confirm_send_anyway')}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => send(false)}
          disabled={sending || uploading || !ready.length}
          className="btn-primary w-full py-3.5 text-base"
        >
          {sending
            ? t('report.submitting')
            : ready.length
              ? t('clean.submit', { n: ready.length })
              : t('clean.submit_empty')}
        </button>
      )}
    </div>
  );
}

function GpsCard({ gps, campus, onRetry }: { gps: Gps; campus: Campus; onRetry: () => void }) {
  const { t } = useLanguage();

  const tone =
    gps.state === 'ok'
      ? 'bg-emerald-50 text-emerald-900'
      : gps.state === 'locating'
        ? 'bg-mist-50 text-ink-700'
        : gps.state === 'far'
          ? 'bg-red-50 text-red-900'
          : 'bg-amber-50 text-amber-900';

  return (
    <div className={`flex items-start gap-3 rounded-nav px-4 py-3 text-body-sm ${tone}`} role="status">
      <PinGlyph className="mt-0.5 h-5 w-5" />
      <div className="flex-1">
        {gps.state === 'locating' && <p>{t('clean.gps_locating')}</p>}
        {gps.state === 'ok' && (
          <p className="font-semibold">
            {t('clean.gps_ok')}
            {gps.position.accuracy !== null && (
              <span className="font-normal"> · ±{gps.position.accuracy} m</span>
            )}
          </p>
        )}
        {gps.state === 'far' && (
          <>
            <p className="font-bold">{t('clean.gps_far_title', { distance: formatDistance(gps.distance) })}</p>
            <p className="mt-0.5">{t('clean.gps_far_body', { radius: formatDistance(campus.radius_m) })}</p>
          </>
        )}
        {gps.state === 'unavailable' && (
          <>
            <p className="font-bold">{t('clean.gps_unavailable_title')}</p>
            <p className="mt-0.5">{t(`clean.gps_${gps.reason}`)}</p>
          </>
        )}
      </div>
      {(gps.state === 'far' || gps.state === 'unavailable') && (
        <button type="button" onClick={onRetry} className="btn-neutral !px-3 !py-1.5 text-xs">
          {t('camera.retry')}
        </button>
      )}
    </div>
  );
}
