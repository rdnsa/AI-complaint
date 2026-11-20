import { useEffect, useState } from 'react';
import Camera from './Camera';
import { CategoryBadge, PriorityBadge, StatusBadge } from './Badges';
import { api, type Report, type StaffOption } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { CameraGlyph, CheckGlyph } from './Marks';
import ZoomableImage from './ZoomableImage';

/** Long enough for a normal answer; after this staff just see that there is none yet. */
const DESCRIPTION_WAIT_MS = 15_000;

/** The photo just taken, waiting for "retake" or "send". */
interface Shot {
  preview: string;
  key: string | null;
  description: string | null;
  describing: boolean;
}

/**
 * One complaint the staff member can take on and close with a proof photo.
 *
 * Every action (claiming, taking over, closing) is done as the signed-in staff
 * member. A claim is not a lock: until a proof photo closes the report, another
 * staff member can take it over, so a complaint nobody finished does not sit
 * claimed forever. Taking over asks once more, so nobody does it by accident.
 */
export default function ComplaintCard({
  report: r,
  staff,
  onChanged,
}: {
  report: Report;
  /** The signed-in staff member, who every action here is done as. */
  staff: StaffOption;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // The "take it over?" question in front of claiming someone else's report.
  const [confirming, setConfirming] = useState(false);
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);
  const [shot, setShot] = useState<Shot | null>(null);

  // The preview's object URL is released when it is replaced or the card goes away.
  useEffect(() => (shot ? () => URL.revokeObjectURL(shot.preview) : undefined), [shot?.preview]); // eslint-disable-line react-hooks/exhaustive-deps

  const mine = r.status === 'in_progress' && r.staff_name === staff.name;
  const heldByOther = r.status === 'in_progress' && !!r.staff_name && !mine;

  async function claim() {
    setClaiming(true);
    setClaimError(null);
    try {
      await api.updateStatus(r.id, 'in_progress');
      setConfirming(false);
      onChanged();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : t('staff.resolve_failed'));
    } finally {
      setClaiming(false);
    }
  }

  async function capture(photo: File) {
    const preview = URL.createObjectURL(photo);
    const update = (next: Partial<Shot>) => setShot((s) => (s?.preview === preview ? { ...s, ...next } : s));
    setFailure(null);
    setShot({ preview, key: null, description: null, describing: true });
    try {
      const { key } = await api.uploadPhoto(photo, 'proof');
      update({ key });
      // Sending is possible from here on: the description only informs, it never holds anything up.
      const answer = await Promise.race([
        api.proofPreview(r.id, key).then((p) => p.description),
        new Promise<null>((resolve) => setTimeout(() => resolve(null), DESCRIPTION_WAIT_MS)),
      ]);
      update({ description: answer, describing: false });
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t('staff.resolve_failed'));
      update({ describing: false });
    }
  }

  async function send() {
    if (!shot?.key) return;
    setFailure(null);
    setBusy(true);
    try {
      await api.updateStatus(r.id, 'resolved', { proof_photo_key: shot.key });
      setDone(true);
      // Leave the success visible for a moment before the card drops off the list.
      setTimeout(onChanged, 2500);
    } catch (err) {
      setFailure(err instanceof Error ? err.message : t('staff.resolve_failed'));
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <article className="card p-4 sm:p-6 text-ink-900">
        <p className="flex items-center gap-1.5 font-bold">
          <CheckGlyph />
          {t('staff.report_resolved')}
        </p>
        <p className="mt-0.5 text-sm">{r.location_name}</p>
      </article>
    );
  }

  return (
    <article className="card p-4 sm:p-6">
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge value={r.priority} />
        <StatusBadge value={r.status} />
        {r.categories.map((c) => (
          <CategoryBadge key={c} value={c} />
        ))}
        <span className="ml-auto text-xs text-ink-600">{relativeTime(r.created_at)}</span>
      </div>

      <p className="mt-2.5 font-bold text-ink-900">{r.location_name}</p>
      <p className="mt-1 text-ink-800">{r.summary ?? r.description}</p>
      {r.summary && (
        <p className="mt-1 text-sm italic text-ink-600">
          {t('dashboard.original_report')}: “{r.description}”
        </p>
      )}
      {r.recommendation && (
        <p className="mt-2.5 rounded-nav bg-mist-100 px-4 py-3 text-body-sm text-ink-700">
          <span className="font-bold">{t('dashboard.action')} </span>
          {r.recommendation}
        </p>
      )}
      {r.photo_url && (
        <ZoomableImage
          src={r.photo_url}
          caption={`${t('photo.report')} · ${r.location_name}`}
          frameClassName="mt-3"
          className="max-h-56"
        />
      )}

      {failure && (
        <p role="alert" className="mt-3 rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800">
          {failure}
        </p>
      )}

      {claimError && !confirming && (
        <p role="alert" className="mt-3 rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800">
          {claimError}
        </p>
      )}

      {confirming && (
        <div className="mt-3 rounded-nav bg-mist-100 p-4">
          <p className="text-body-sm text-ink-800">{t('staff.held_by', { name: r.staff_name ?? '' })}</p>
          {claimError && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-800">
              {claimError}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={claim} disabled={claiming} className="btn-primary !px-3 py-2.5">
              {t('staff.confirm_take_over')}
            </button>
            <button
              type="button"
              onClick={() => setConfirming(false)}
              disabled={claiming}
              className="btn-neutral !px-3 py-2.5"
            >
              {t('account.cancel')}
            </button>
          </div>
        </div>
      )}

      {shot && (
        <div className="mt-3 rounded-nav bg-mist-100 p-4">
          <img src={shot.preview} alt="" className="max-h-72 w-full rounded-xl object-contain" />
          <p className="mt-3 text-body-sm text-ink-800" aria-live="polite">
            {shot.describing ? (
              <span className="italic text-ink-600">{t('staff.proof_describing')}</span>
            ) : shot.description ? (
              <>
                <span className="font-bold">{t('dashboard.proof_description')}: </span>
                {shot.description}
              </>
            ) : (
              <span className="italic text-ink-600">{t('staff.proof_no_description')}</span>
            )}
          </p>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setCamera(true)} disabled={busy} className="btn-neutral !px-3 py-2.5">
              {t('staff.proof_retake')}
            </button>
            <button type="button" onClick={send} disabled={busy || !shot.key} className="btn-primary !px-3 py-2.5">
              {busy || !shot.key ? t('dashboard.uploading') : t('clean.send')}
            </button>
          </div>
        </div>
      )}

      <Camera open={camera} onClose={() => setCamera(false)} onCapture={capture} />
      {/* While asking to take over, or showing the photo just taken, the card offers only those choices. */}
      {!confirming && !shot && (
        <div className="mt-3 flex flex-col gap-2">
          <button
            type="button"
            onClick={() => setCamera(true)}
            disabled={busy || claiming}
            className="btn-primary w-full py-3 text-base"
          >
            {busy ? (
              t('dashboard.uploading')
            ) : (
              <>
                <CameraGlyph className="h-5 w-5" />
                {t('staff.resolve')}
              </>
            )}
          </button>
          {r.status === 'new' && (
            <button type="button" onClick={claim} disabled={busy || claiming} className="btn-neutral w-full py-2.5">
              {t('staff.start_work')}
            </button>
          )}
          {mine && <p className="text-center text-xs font-semibold text-ink-700">{t('staff.working_on_it')}</p>}
          {heldByOther && (
            <>
              <p className="text-center text-xs text-ink-600">
                <span className="font-semibold text-ink-800">{t('staff.held_by', { name: r.staff_name ?? '' })}</span>
                <br />
                {t('staff.held_hint')}
              </p>
              <button
                type="button"
                onClick={() => {
                  setClaimError(null);
                  setConfirming(true);
                }}
                disabled={busy || claiming}
                className="btn-neutral w-full py-2.5"
              >
                {t('staff.take_over')}
              </button>
            </>
          )}
        </div>
      )}
    </article>
  );
}
