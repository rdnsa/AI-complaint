import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Camera from '../components/Camera';
import Header from '../components/Header';
import RoleSwitch from '../components/RoleSwitch';
import { api, type Floor, type ToiletType } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { readStoredStaff } from '../lib/staff';
import { useSession } from '../lib/session';

const ICONS: Record<ToiletType, string> = { men: '♂', women: '♀', accessible: '♿' };

export default function ReportForm() {
  const { floorId = '' } = useParams();
  const [search] = useSearchParams();
  // A phone that has picked a staff name belongs to a cleaner: the door QR
  // opens their page directly. `?as=student` (the switch) opts out.
  if (search.get('as') !== 'student' && readStoredStaff()) {
    return <Navigate to={`/staff/${floorId}`} replace />;
  }
  return <StudentForm floorId={floorId} />;
}

function StudentForm({ floorId }: { floorId: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useSession();

  const [floor, setFloor] = useState<Floor | null>(null);
  const [loading, setLoading] = useState(true);
  const [toiletId, setToiletId] = useState<string>('');
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    api
      .floor(floorId)
      .then((f) => {
        setFloor(f);
        // When a floor has only one toilet, there is nothing to choose.
        if (f.toilets.length === 1) setToiletId(f.toilets[0].id);
      })
      .catch(() => setFloor(null))
      .finally(() => setLoading(false));
  }, [floorId]);

  // The preview is an object URL; released when the photo changes so memory is not leaked.
  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (description.trim().length < 5) return setError(t('report.error_too_short'));
    if (!photo) return setError(t('report.photo_reason'));

    setSubmitting(true);
    setError(null);
    try {
  // The photo is uploaded first, so the report is stored with a reference that already exists.
      const photo_key = (await api.uploadPhoto(photo)).key;
      const result = await api.submitReport({ toilet_id: toiletId, description: description.trim(), photo_key });
      navigate(`/reports/${result.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('report.error_submit'));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title={t('app.title')} compact />
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
            <code className="rounded-lg bg-krem-200 px-2 py-1 text-sm text-maroon-800">
              {floorId}
            </code>
          </p>
          <Link to="/student" className="btn-primary mt-6">
            {t('report.choose_manually')}
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      <Header
        title={t('common.building', { code: floor.building_code })}
        description={floor.building_name}
        compact
      />

      <main className="mx-auto max-w-lg px-4">
        <RoleSwitch floorId={floorId} active="student" />

        <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-maroon-900">
          {t('common.floor', { n: floor.floor })}
        </h2>

        <div className="mt-4">
          <span className="label">{t('report.choose_toilet')}</span>
          <div className="flex gap-2">
            {floor.toilets.map((wc) => (
              <button
                key={wc.id}
                type="button"
                onClick={() => setToiletId(wc.id)}
                aria-pressed={toiletId === wc.id}
                className={toiletId === wc.id ? 'choice-on' : 'choice-off'}
              >
                <span aria-hidden className="text-xl leading-none">
                  {ICONS[wc.type]}
                </span>
                {t(`toilet_type.${wc.type}`)}
              </button>
            ))}
          </div>
        </div>

        {/* Reporting without an account is still allowed; this note only explains
            what that means for the leaderboard. */}
        <p className="mt-5 rounded-xl bg-krem-50 px-3.5 py-2.5 text-sm text-maroon-700 ring-1 ring-krem-200">
          {session?.role === 'reporter' ? (
            t('session.reporting_as', { name: session.name })
          ) : (
            <>
              {t('session.anonymous_info')}{' '}
              <Link to="/login" className="font-semibold text-bata-600 underline underline-offset-2">
                {t('session.login')}
              </Link>
            </>
          )}
        </p>

        <p className="mt-4 leading-relaxed text-maroon-700">{t('report.prompt')}</p>

        <form onSubmit={submit} className="mt-5 space-y-5">
          <div>
            <label htmlFor="description" className="label">
              {t('report.description_label')}
            </label>
            <textarea
              id="description"
              className="input min-h-[140px] resize-y"
              placeholder={t('report.placeholder')}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              maxLength={1000}
            />
            <div className="mt-2 flex flex-wrap gap-1.5">
              {([t('report.example1'), t('report.example2'), t('report.example3')] as const).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setDescription(c)}
                  className="rounded-full border border-krem-200 bg-permukaan px-3 py-1 text-xs text-maroon-600 transition hover:border-bata-300 hover:text-bata-700"
                >
                  {c.length > 36 ? `${c.slice(0, 36)}…` : c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">{t('report.photo')}</span>
            <p className="-mt-1 mb-2 text-xs leading-relaxed text-maroon-600">
              {t('report.photo_reason')}
            </p>
            {/* The live camera, not a file picker: a photo from the gallery cannot be used. */}
            <Camera
              open={camera}
              onClose={() => setCamera(false)}
              onCapture={(f) => {
                setError(null);
                setPhoto(f);
              }}
            />
            {preview ? (
              <div className="relative overflow-hidden rounded-xl">
                <img src={preview} alt="" className="w-full" />
                <button
                  type="button"
                  onClick={() => setPhoto(null)}
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
                📷 {t('report.take_photo')}
              </button>
            )}
          </div>

          {error && (
            <p className="rounded-xl bg-red-50 px-3.5 py-2.5 text-sm font-medium text-red-800" role="alert">
              {error}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-0 border-t border-krem-200 bg-permukaan/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-lg">
              <button
                type="submit"
                disabled={submitting || !toiletId || !photo}
                className="btn-primary w-full py-3.5 text-base"
              >
                {submitting ? t('report.submitting') : t('report.submit')}
              </button>
            </div>
          </div>
        </form>
      </main>
    </div>
  );
}
