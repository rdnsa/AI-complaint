import { useCallback, useEffect, useState } from 'react';
import Camera from './Camera';
import {
  api,
  ApiError,
  CLEANING_TASKS,
  type Campus,
  type CleaningArea,
  type CleaningTask,
  type LocationStatus,
  type StaffOption,
} from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { formatWIB, useServerClock } from '../lib/server-clock';
import { ArrowGlyph, CameraGlyph, CheckGlyph, PinGlyph } from './Marks';

/**
 * The daily tasks of one area: the same six everywhere, each opened on its own
 * and sent on its own — a photo, an optional description, "Kirim".
 *
 * Photos come only from the live camera, carry a stamp with name, area, server
 * time and GPS, and are uploaded the moment they are taken so the server's
 * receipt time is the capture time. The phone's position is checked against
 * the campus; far away or unknown, the staff member is warned and can still
 * send, but the report is flagged to the supervisor.
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
function useCampusGps(campus: Campus) {
  const [gps, setGps] = useState<Gps>({ state: 'locating' });

  const locate = useCallback((): Promise<Gps> => {
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

export default function DailyTasks({
  area,
  campus,
  staff,
}: {
  area: CleaningArea;
  campus: Campus;
  staff: StaffOption;
}) {
  const { t } = useLanguage();
  const { gps, locate } = useCampusGps(campus);
  // One task open at a time, like the sketch: the list stays short on a phone.
  const [open, setOpen] = useState<CleaningTask | null>(null);
  const notAssigned = !area.staff.some((s) => s.id === staff.id);

  return (
    <div className="mt-4 space-y-3">
      <GpsCard gps={gps} campus={campus} onRetry={locate} />
      {notAssigned && (
        <p className="rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">{t('clean.not_assigned')}</p>
      )}
      {CLEANING_TASKS.map((task) => (
        <TaskItem
          key={task}
          task={task}
          area={area}
          staff={staff}
          gps={gps}
          locate={locate}
          open={open === task}
          onToggle={() => setOpen((o) => (o === task ? null : task))}
        />
      ))}
    </div>
  );
}

type Shot = { preview: string; key: string | null; uploading: boolean; error: string | null };
type Sent = { at: Date | null; status: LocationStatus; distance: number | null };

function TaskItem({
  task,
  area,
  staff,
  gps,
  locate,
  open,
  onToggle,
}: {
  task: CleaningTask;
  area: CleaningArea;
  staff: StaffOption;
  gps: Gps;
  locate: () => Promise<Gps>;
  open: boolean;
  onToggle: () => void;
}) {
  const { t, language } = useLanguage();
  const locale = language === 'id' ? 'id-ID' : 'en-GB';
  const clock = useServerClock();
  const [shot, setShot] = useState<Shot | null>(null);
  const [camera, setCamera] = useState(false);
  const [note, setNote] = useState('');
  const [confirming, setConfirming] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState<Sent | null>(null);

  // The preview's object URL is released when it is replaced or the task goes away.
  useEffect(() => (shot ? () => URL.revokeObjectURL(shot.preview) : undefined), [shot?.preview]); // eslint-disable-line react-hooks/exhaustive-deps

  function stamp(): string[] {
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
  }

  async function capture(photo: File) {
    const preview = URL.createObjectURL(photo);
    setError(null);
    setShot({ preview, key: null, uploading: true, error: null });
    try {
      const { key } = await api.uploadPhoto(photo, 'cleaning');
      setShot((s) => (s?.preview === preview ? { ...s, key, uploading: false } : s));
    } catch (err) {
      const message = err instanceof Error ? err.message : t('clean.upload_failed');
      setShot((s) => (s?.preview === preview ? { ...s, uploading: false, error: message } : s));
    }
  }

  async function send(force: boolean) {
    if (!shot?.key) return;
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
        tasks: [{ task, photo_key: shot.key }],
        note: note.trim() || null,
        position,
      });
      setSent({ at: clock.now(), status: result.location_status, distance: result.distance_m });
      setShot(null);
      setNote('');
    } catch (err) {
      // A photo the server refused (too old, already used) must be taken again.
      if (err instanceof ApiError && err.data.task) setShot(null);
      setError(err instanceof Error ? err.message : t('clean.error_submit'));
    } finally {
      setSending(false);
    }
  }

  const busy = sending || !!shot?.uploading;

  return (
    <article className={`card overflow-hidden ${sent ? 'ring-2 ring-emerald-400' : ''}`}>
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        className="flex w-full items-center gap-3 px-5 py-4 text-left"
      >
        {sent && (
          <span className="grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-emerald-500 text-white" aria-hidden>
            <CheckGlyph className="h-4 w-4" />
          </span>
        )}
        <span className="min-w-0 flex-1">
          <span className="block text-lg font-bold text-ink-900">{t(`task.${task}`)}</span>
          {sent && (
            <span className="block text-xs font-semibold text-emerald-700">
              {t('clean.sent_at', { time: sent.at ? formatWIB(sent.at, locale) : '' })}
            </span>
          )}
        </span>
        <ArrowGlyph
          className={`h-5 w-5 shrink-0 text-ink-600 transition-transform ${open ? 'rotate-90' : ''}`}
        />
      </button>

      {open && (
        <div className="space-y-3 border-t border-mist-200 px-5 pb-5 pt-4">
          {sent && sent.status !== 'ok' && !shot && (
            <p className="rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">
              {sent.status === 'far'
                ? t('clean.sent_flagged_far', { distance: formatDistance(sent.distance ?? 0) })
                : t('clean.sent_flagged_unknown')}
            </p>
          )}

          <div className="flex gap-3">
            {/* The photo tile: the camera when empty, the picture once taken. */}
            {shot ? (
              <button
                type="button"
                onClick={() => setCamera(true)}
                disabled={busy}
                aria-label={t('clean.retake')}
                className="relative h-24 w-24 shrink-0 overflow-hidden rounded-xl"
              >
                <img src={shot.preview} alt="" className="h-full w-full object-cover" />
                <span className="absolute inset-x-0 bottom-0 bg-tetap-ink/70 py-0.5 text-center text-xs font-semibold text-white">
                  {shot.uploading ? t('dashboard.uploading') : t('clean.retake')}
                </span>
              </button>
            ) : (
              <button
                type="button"
                onClick={() => setCamera(true)}
                disabled={sending}
                className="grid h-24 w-24 shrink-0 place-items-center content-center gap-1 rounded-xl border-2 border-dashed border-ink-600/60 text-sm font-semibold text-ink-900 hover:border-accent-500 hover:text-accent-700"
              >
                <CameraGlyph className="h-6 w-6" />
                {t('clean.photo')}
              </button>
            )}

            <div className="min-w-0 flex-1">
              <label htmlFor={`desc-${task}`} className="label !mb-1 !text-xs">
                {t('clean.desc_label')}
              </label>
              <textarea
                id={`desc-${task}`}
                className="input min-h-[72px] resize-y !px-3.5 !py-2 text-body-sm"
                placeholder={t('clean.desc_placeholder')}
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
              />
            </div>
          </div>

          {/* Ready-made sentences: a tap is easier than typing for most staff. */}
          <div className="flex flex-wrap gap-1.5">
            {([t('clean.note_example1'), t('clean.note_example2'), t('clean.note_example3')] as const).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNote(c)}
                className="rounded-full border border-mist-200 bg-glass px-3 py-1.5 text-xs text-ink-700 transition hover:border-accent-300 hover:text-accent-700"
              >
                {c}
              </button>
            ))}
          </div>

          {shot?.key && (
            <p className="flex items-center gap-1 text-sm font-semibold text-emerald-700">
              <CheckGlyph className="h-4 w-4" />
              {t('clean.photo_saved')}
            </p>
          )}
          {shot?.error && <p className="text-sm text-red-700">{shot.error}</p>}
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
            <div className="flex items-center justify-end gap-3">
              {!shot && <p className="flex-1 text-xs text-ink-600">{t('clean.photo_first')}</p>}
              <button
                type="button"
                onClick={() => send(false)}
                disabled={busy || !shot?.key}
                className="btn-primary !px-8"
              >
                {sending ? t('report.submitting') : sent ? t('clean.send_again') : t('clean.send')}
              </button>
            </div>
          )}
        </div>
      )}

      <Camera open={camera} onClose={() => setCamera(false)} onCapture={capture} stamp={stamp} />
    </article>
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
            {gps.position.accuracy !== null && <span className="font-normal"> · ±{gps.position.accuracy} m</span>}
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
