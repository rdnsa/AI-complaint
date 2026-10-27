import { useState } from 'react';
import Camera from './Camera';
import { CategoryBadge, PriorityBadge, StatusBadge } from './Badges';
import { api, ApiError, type ProofVerdict, type Report, type StaffOption } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { CameraGlyph, CheckGlyph } from './Marks';
import ZoomableImage from './ZoomableImage';

type Rejection = { verdict: ProofVerdict | null; reason: string | null };

/** The vision verdict carried by a 422, or a plain failure otherwise. */
function rejectionFrom(err: unknown): Rejection {
  if (err instanceof ApiError && err.status === 422) {
    return {
      verdict: (err.data.verdict as ProofVerdict | undefined) ?? 'dirty',
      reason: (err.data.reason as string | undefined) ?? null,
    };
  }
  return { verdict: null, reason: err instanceof Error ? err.message : null };
}

type Stage = 'idle' | 'uploading' | 'checking';

/** One complaint the staff member can take on and close with a proof photo. */
export default function ComplaintCard({
  report: r,
  staff,
  onChanged,
}: {
  report: Report;
  staff: StaffOption;
  onChanged: () => void;
}) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const [camera, setCamera] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [done, setDone] = useState(false);

  async function startWork() {
    await api.updateStatus(r.id, 'in_progress', { staff_id: staff.id }).catch(() => {});
    onChanged();
  }

  async function resolve(photo: File) {
    setRejection(null);
    setStage('uploading');
    try {
      const { key } = await api.uploadPhoto(photo, 'proof');
      setStage('checking');
      await api.updateStatus(r.id, 'resolved', { staff_id: staff.id, proof_photo_key: key });
      setDone(true);
      // Leave the success visible for a moment before the card drops off the list.
      setTimeout(onChanged, 2500);
    } catch (err) {
      setRejection(rejectionFrom(err));
    } finally {
      setStage('idle');
    }
  }

  if (done) {
    return (
      <article className="card p-6 text-ink-900">
        <p className="flex items-center gap-1.5 font-bold">
          <CheckGlyph />
          {t('staff.report_resolved')}
        </p>
        <p className="mt-0.5 text-sm">{r.location_name}</p>
      </article>
    );
  }

  const busy = stage !== 'idle';

  return (
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

      {rejection && <RejectionBox rejection={rejection} />}

      <Camera open={camera} onClose={() => setCamera(false)} onCapture={resolve} />
      <div className="mt-3 flex flex-col gap-2">
        <button
          type="button"
          onClick={() => setCamera(true)}
          disabled={busy}
          className="btn-primary w-full py-3 text-base"
        >
          {stage === 'uploading'
            ? t('dashboard.uploading')
            : stage === 'checking'
              ? t('dashboard.checking')
              : (
                <>
                  <CameraGlyph className="h-5 w-5" />
                  {t('staff.resolve')}
                </>
              )}
        </button>
        {r.status === 'new' && (
          <button type="button" onClick={startWork} disabled={busy} className="btn-neutral w-full py-2.5">
            {t('staff.start_work')}
          </button>
        )}
        {r.status === 'in_progress' && r.staff_name && (
          <p className="text-center text-xs text-ink-600">{t('dashboard.handled_by', { name: r.staff_name })}</p>
        )}
      </div>
    </article>
  );
}

function RejectionBox({ rejection }: { rejection: Rejection }) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="mt-3 rounded-nav bg-red-50 px-4 py-3 text-body-sm text-red-900">
      <p className="font-bold">{rejection.verdict ? t('dashboard.proof_rejected') : t('dashboard.verification_failed')}</p>
      {rejection.verdict && (
        <p className="mt-0.5">
          {rejection.verdict === 'wrong_place'
            ? t('dashboard.proof_rejected_wrong_place')
            : t('dashboard.proof_rejected_dirty')}
        </p>
      )}
      {rejection.reason && (
        <p className="mt-1 text-xs italic text-red-800">
          {rejection.verdict ? `${t('dashboard.ai_reason')}: ` : ''}
          {rejection.reason}
        </p>
      )}
    </div>
  );
}
