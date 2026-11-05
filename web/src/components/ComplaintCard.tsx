import { useState } from 'react';
import Camera from './Camera';
import { CategoryBadge, PriorityBadge, StatusBadge } from './Badges';
import { api, type Report, type StaffOption } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { CameraGlyph, CheckGlyph } from './Marks';
import ZoomableImage from './ZoomableImage';
import Select from './Select';

type Step = 'claim' | 'resolve';

/**
 * One complaint the staff member can take on and close with a proof photo.
 *
 * There is no name to pick on the page: every action (claiming, taking over,
 * closing) asks who is doing it, with the phone's last name pre-filled, because
 * a phone is shared. And a claim is not a lock. Until a proof photo closes the
 * report, another staff member can take it over, so a complaint nobody finished
 * does not sit claimed forever.
 */
export default function ComplaintCard({
  report: r,
  staff,
  staffList,
  onSelectStaff,
  onChanged,
}: {
  report: Report;
  /** The name remembered on this phone, offered as the default answer. */
  staff: StaffOption | null;
  staffList: StaffOption[];
  onSelectStaff: (id: string) => void;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [camera, setCamera] = useState(false);
  const [busy, setBusy] = useState(false);
  const [failure, setFailure] = useState<string | null>(null);
  const [done, setDone] = useState(false);
  // The "who is doing this?" step in front of an action.
  const [step, setStep] = useState<Step | null>(null);
  const [who, setWho] = useState('');
  const [claiming, setClaiming] = useState(false);
  const [claimError, setClaimError] = useState<string | null>(null);

  const mine = r.status === 'in_progress' && !!staff && r.staff_name === staff.name;
  const heldByOther = r.status === 'in_progress' && !!r.staff_name && !mine;

  function openChooser(next: Step) {
    // Closing a claimed report is most often done by whoever claimed it.
    const holder = staffList.find((p) => p.name === r.staff_name)?.id;
    setWho((next === 'resolve' ? holder : undefined) ?? staff?.id ?? '');
    setClaimError(null);
    setStep(next);
  }

  async function claim() {
    setClaiming(true);
    setClaimError(null);
    try {
      await api.updateStatus(r.id, 'in_progress', { staff_id: who });
      // The name picked here is who is using this phone now.
      onSelectStaff(who);
      setStep(null);
      onChanged();
    } catch (err) {
      setClaimError(err instanceof Error ? err.message : null);
    } finally {
      setClaiming(false);
    }
  }

  function continueToPhoto() {
    onSelectStaff(who);
    setStep(null);
    setCamera(true);
  }

  async function resolve(photo: File) {
    setFailure(null);
    setBusy(true);
    try {
      const { key } = await api.uploadPhoto(photo, 'proof');
      await api.updateStatus(r.id, 'resolved', { staff_id: who, proof_photo_key: key });
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

      {step && (
        <div className="mt-3 rounded-nav bg-mist-100 p-4">
          <label htmlFor={`who-${r.id}`} className="text-body-sm font-semibold text-ink-900">
            {step === 'resolve' ? t('staff.resolve_who') : t('staff.claim_who')}
          </label>
          <Select
            id={`who-${r.id}`}
            className="input mt-2 !py-2.5 font-semibold"
            value={who}
            onChange={setWho}
          >
            <option value="">{t('staff.pick_name')}</option>
            {staffList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
          {claimError && (
            <p role="alert" className="mt-2 text-xs font-medium text-red-800">
              {claimError}
            </p>
          )}
          <div className="mt-3 grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={step === 'resolve' ? continueToPhoto : claim}
              disabled={claiming || !who}
              className="btn-primary !px-3 py-2.5"
            >
              {step === 'resolve'
                ? t('staff.confirm_resolve')
                : heldByOther
                  ? t('staff.confirm_take_over')
                  : t('staff.confirm_claim')}
            </button>
            <button type="button" onClick={() => setStep(null)} disabled={claiming} className="btn-neutral !px-3 py-2.5">
              {t('account.cancel')}
            </button>
          </div>
        </div>
      )}

      <Camera open={camera} onClose={() => setCamera(false)} onCapture={resolve} />
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => openChooser('resolve')}
          disabled={busy}
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
        {r.status === 'new' && !step && (
          <button type="button" onClick={() => openChooser('claim')} disabled={busy} className="btn-neutral w-full py-2.5">
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
            {!step && (
              <button type="button" onClick={() => openChooser('claim')} disabled={busy} className="btn-neutral w-full py-2.5">
                {t('staff.take_over')}
              </button>
            )}
          </>
        )}

      </div>
    </article>
  );
}
