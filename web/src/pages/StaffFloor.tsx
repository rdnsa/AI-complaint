import { useCallback, useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import Camera from '../components/Camera';
import Header from '../components/Header';
import { CategoryBadge, PriorityBadge, StatusBadge } from '../components/Badges';
import StaffPicker from '../components/StaffPicker';
import RoleSwitch from '../components/RoleSwitch';
import {
  api,
  ApiError,
  type Floor,
  type ProofVerdict,
  type Report,
  type StaffOption,
  type ToiletType,
} from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { useSelectedStaff } from '../lib/staff';
import { CameraGlyph, CheckGlyph, DoneMark, ReportsMark, StaffMark, ToiletTypeGlyph } from '../components/Marks';
import ZoomableImage from '../components/ZoomableImage';


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

/**
 * The staff side of a floor QR: no sign-in, just "who are you?" and then the
 * two jobs a cleaner has on this floor — finish the student reports waiting
 * here, and record the toilets cleaned on the regular round. Every photo comes
 * from the live camera and is judged by the vision model before it counts.
 */
export default function StaffFloor() {
  const { floorId = '' } = useParams();
  const { t } = useLanguage();
  const { staffList, selected, select, loading: loadingStaff } = useSelectedStaff();

  const [floor, setFloor] = useState<Floor | null>(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState<Report[]>([]);
  const [tab, setTab] = useState<'reports' | 'work' | null>(null);

  const loadOpen = useCallback(async (f: Floor) => {
    const r = await api
      .openReports({ building: f.building_code, floor: f.floor })
      .catch(() => ({ data: [] as Report[] }));
    setOpen(r.data);
    return r.data;
  }, []);

  useEffect(() => {
    api
      .floor(floorId)
      .then(async (f) => {
        setFloor(f);
        // Open on the student reports when some are waiting here; otherwise on the round.
        const data = await loadOpen(f);
        setTab((current) => current ?? (data.length ? 'reports' : 'work'));
      })
      .catch(() => setFloor(null))
      .finally(() => setLoading(false));
  }, [floorId, loadOpen]);

  if (loading || loadingStaff) {
    return (
      <div className="min-h-screen">
        <Header title={t('staff.title')} compact />
        <p className="p-10 text-center text-maroon-600">{t('common.loading')}</p>
      </div>
    );
  }

  if (!floor) {
    return (
      <div className="min-h-screen">
        <Header title={t('report.unknown_location')} compact />
        <div className="mx-auto max-w-lg px-4 py-14 text-center">
          <p className="text-maroon-700">{t('report.unknown_location_body')}</p>
          <p className="mt-2">
            <code className="rounded-lg bg-krem-200 px-2 py-1 text-sm text-maroon-800">{floorId}</code>
          </p>
          <Link to="/staff" className="btn-primary mt-6">
            {t('report.choose_manually')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <Header
        title={t('common.building', { code: floor.building_code })}
        description={floor.building_name}
        compact
      />

      <main className="mx-auto max-w-lg px-4">
        <RoleSwitch floorId={floorId} active="staff" />

        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-maroon-900">
          {t('common.floor', { n: floor.floor })}
        </h2>

        <div className="mt-4">
          <StaffPicker staffList={staffList} selected={selected} onSelect={select} />
        </div>

        {selected && (
          <>
            <nav className="mt-5 grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setTab('reports')}
                aria-pressed={tab === 'reports'}
                className={tab === 'reports' ? 'choice-on !py-3' : 'choice-off !py-3'}
              >
                <ReportsMark size="h-8 w-8 rounded-lg" />
                <span>
                  {t('staff.tab_reports')}
                  {!!open.length && (
                    <span className="ml-1.5 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                      {open.length}
                    </span>
                  )}
                </span>
              </button>
              <button
                type="button"
                onClick={() => setTab('work')}
                aria-pressed={tab === 'work'}
                className={tab === 'work' ? 'choice-on !py-3' : 'choice-off !py-3'}
              >
                <StaffMark size="h-8 w-8 rounded-lg" />
                {t('staff.tab_work')}
              </button>
            </nav>

            {tab === 'reports' && (
              <section className="mt-4 space-y-3">
                {!open.length && (
                  <p className="card p-8 text-center text-maroon-700">{t('staff.no_reports')}</p>
                )}
                {open.map((r) => (
                  <TaskCard
                    key={r.id}
                    report={r}
                    staff={selected}
                    onChanged={() => loadOpen(floor)}
                  />
                ))}
              </section>
            )}

            {tab === 'work' && <WorkLogForm floor={floor} staff={selected} />}
          </>
        )}
      </main>
    </div>
  );
}

/** One student report the staff member can take on and close with a proof photo. */
function TaskCard({
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

  const edge =
    r.priority === 'high'
      ? 'border-l-4 border-l-red-500'
      : r.priority === 'medium'
        ? 'border-l-4 border-l-amber-400'
        : 'border-l-4 border-l-emerald-400';

  if (done) {
    return (
      <article className="card border-l-4 border-l-emerald-500 bg-emerald-50 p-4 text-emerald-900">
        <p className="flex items-center gap-1.5 font-bold">
          <CheckGlyph />
          {t('staff.report_resolved')}
        </p>
        <p className="mt-0.5 text-sm">{r.toilet_name}</p>
      </article>
    );
  }

  const busy = stage !== 'idle';

  return (
    <article className={`card p-4 ${edge}`}>
      <div className="flex flex-wrap items-center gap-2">
        <PriorityBadge value={r.priority} />
        <StatusBadge value={r.status} />
        {r.categories.map((c) => (
          <CategoryBadge key={c} value={c} />
        ))}
        <span className="ml-auto text-xs text-maroon-600">{relativeTime(r.created_at)}</span>
      </div>

      <p className="mt-2.5 font-bold text-maroon-900">{r.toilet_name}</p>
      <p className="mt-1 text-maroon-800">{r.summary ?? r.description}</p>
      {r.summary && (
        <p className="mt-1 text-sm italic text-maroon-600">
          {t('dashboard.original_report')}: “{r.description}”
        </p>
      )}
      {r.recommendation && (
        <p className="mt-2.5 rounded-xl border-l-4 border-bata-400 bg-krem-50 p-3 text-sm text-maroon-700">
          <span className="font-bold">{t('dashboard.action')} </span>
          {r.recommendation}
        </p>
      )}
      {r.photo_url && (
        <ZoomableImage
          src={r.photo_url}
          caption={`${t('photo.report')} · ${r.toilet_name}`}
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
          <p className="text-center text-xs text-maroon-600">{t('dashboard.handled_by', { name: r.staff_name })}</p>
        )}
      </div>
    </article>
  );
}

function RejectionBox({ rejection }: { rejection: Rejection }) {
  const { t } = useLanguage();
  return (
    <div role="alert" className="mt-3 rounded-xl border-l-4 border-red-400 bg-red-50/70 p-3 text-sm text-red-900">
      <p className="font-bold">{rejection.verdict ? t('dashboard.proof_rejected') : t('dashboard.verification_failed')}</p>
      {rejection.verdict && (
        <p className="mt-0.5">
          {rejection.verdict === 'not_toilet'
            ? t('dashboard.proof_rejected_not_toilet')
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

/** The regular round: "I cleaned this toilet", with a photo of the result. */
function WorkLogForm({ floor, staff }: { floor: Floor; staff: StaffOption }) {
  const { t } = useLanguage();
  const [toiletId, setToiletId] = useState(floor.toilets.length === 1 ? floor.toilets[0].id : '');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);
  const [stage, setStage] = useState<Stage>('idle');
  const [error, setError] = useState<string | null>(null);
  const [rejection, setRejection] = useState<Rejection | null>(null);
  const [submitted, setSubmitted] = useState<{ toilet: string; reason: string | null } | null>(null);

  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) return setError(t('work.error_too_short'));
    if (!photo) return setError(t('work.photo_reason'));

    setError(null);
    setRejection(null);
    setStage('uploading');
    try {
      const photo_key = (await api.uploadPhoto(photo, 'work')).key;
      setStage('checking');
      const result = await api.createWorkLog({
        staff_id: staff.id,
        toilet_id: toiletId,
        description: description.trim(),
        photo_key,
      });
      setSubmitted({ toilet: result.toilet, reason: result.verification?.reason ?? null });
    } catch (err) {
      // A rejected or unchecked photo has already been deleted server-side; take a new one.
      if (err instanceof ApiError && (err.status === 422 || err.status >= 500)) setPhoto(null);
      if (err instanceof ApiError && err.status === 422) setRejection(rejectionFrom(err));
      else setError(err instanceof Error ? err.message : t('work.error_submit'));
    } finally {
      setStage('idle');
    }
  }

  function reset() {
    setSubmitted(null);
    setDescription('');
    setPhoto(null);
    if (floor.toilets.length > 1) setToiletId('');
  }

  if (submitted) {
    return (
      <section className="card mt-4 p-6 text-center">
        <DoneMark className="mx-auto" />
        <h3 className="mt-3 text-xl font-extrabold tracking-tight text-maroon-900">{t('work.submitted')}</h3>
        <p className="mt-1 text-maroon-700">{submitted.toilet}</p>
        {submitted.reason && (
          <p className="mt-2 text-sm italic text-maroon-600">
            {t('dashboard.ai_reason')}: {submitted.reason}
          </p>
        )}
        <button type="button" onClick={reset} className="btn-primary mt-6 w-full py-3">
          {t('work.report_another')}
        </button>
      </section>
    );
  }

  const busy = stage !== 'idle';

  return (
    <form onSubmit={submit} className="mt-4 space-y-5">
      <div>
        <span className="label">{t('work.choose_toilet')}</span>
        <div className="flex gap-2">
          {floor.toilets.map((wc) => (
            <button
              key={wc.id}
              type="button"
              onClick={() => setToiletId(wc.id)}
              aria-pressed={toiletId === wc.id}
              className={toiletId === wc.id ? 'choice-on' : 'choice-off'}
            >
              <ToiletTypeGlyph type={wc.type} />
              {t(`toilet_type.${wc.type}`)}
            </button>
          ))}
        </div>
      </div>

      <div>
        <label htmlFor="description" className="label">
          {t('work.description_label')}
        </label>
        <textarea
          id="description"
          className="input min-h-[110px] resize-y"
          placeholder={t('work.placeholder')}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          maxLength={1000}
        />
        {/* Ready-made sentences: a tap is easier than typing for most staff. */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          {([t('work.example1'), t('work.example2'), t('work.example3')] as const).map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setDescription(c)}
              className="rounded-full border border-krem-200 bg-permukaan px-3 py-1.5 text-sm text-maroon-700 transition hover:border-bata-300 hover:text-bata-700"
            >
              {c}
            </button>
          ))}
        </div>
      </div>

      <div>
        <span className="label">{t('work.photo')}</span>
        <p className="-mt-1 mb-2 text-xs leading-relaxed text-maroon-600">{t('work.photo_reason')}</p>
        <Camera
          open={camera}
          onClose={() => setCamera(false)}
          onCapture={(f) => {
            setError(null);
            setRejection(null);
            setPhoto(f);
          }}
        />
        {preview ? (
          <div className="relative overflow-hidden rounded-xl">
            <img src={preview} alt="" className="w-full" />
            <button
              type="button"
              onClick={() => setPhoto(null)}
              disabled={busy}
              className="absolute right-2 top-2 rounded-lg bg-tetap-maroon/75 px-3 py-1.5 text-sm font-semibold text-white"
            >
              {t('report.remove_photo')}
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setCamera(true)}
            className="btn-neutral w-full border-dashed py-3.5"
          >
            <CameraGlyph className="h-5 w-5" />
            {t('report.take_photo')}
          </button>
        )}
      </div>

      {rejection && <RejectionBox rejection={rejection} />}
      {error && (
        <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800" role="alert">
          {error}
        </p>
      )}

      <button
        type="submit"
        disabled={busy || !toiletId || !photo}
        className="btn-primary w-full py-3.5 text-base"
      >
        {stage === 'uploading'
          ? t('dashboard.uploading')
          : stage === 'checking'
            ? t('dashboard.checking')
            : t('work.submit')}
      </button>
    </form>
  );
}
