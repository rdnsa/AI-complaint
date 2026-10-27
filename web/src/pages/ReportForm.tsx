import { useEffect, useMemo, useState } from 'react';
import { Link, Navigate, useNavigate, useParams, useSearchParams } from 'react-router-dom';
import Camera from '../components/Camera';
import CampusMap from '../components/CampusMap';
import Header from '../components/Header';
import LocationSelect from '../components/LocationSelect';
import RoleSwitch from '../components/RoleSwitch';
import { api, type CleaningArea } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { areaAt, buildPlaces, locate } from '../lib/places';
import { readStoredStaff } from '../lib/staff';
import { useSession } from '../lib/session';
import { CameraGlyph, StudentMark } from '../components/Marks';

/**
 * The reporter's page: pick the location (building, then floor or yard),
 * describe the problem, add a photo. Without a QR it opens empty (/student);
 * a location QR (/report/C-2) opens it with the location already picked.
 */
export default function ReportForm() {
  const { locationId = '' } = useParams();
  const [search] = useSearchParams();
  // A phone that has picked a staff name belongs to a cleaner: the location
  // QR opens their page directly. `?as=student` (the switch) opts out.
  if (locationId && search.get('as') !== 'student' && readStoredStaff()) {
    return <Navigate to={`/staff/${locationId}`} replace />;
  }
  return <ReporterForm locationId={locationId} />;
}

function ReporterForm({ locationId }: { locationId: string }) {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { session } = useSession();

  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeKey, setPlaceKey] = useState('');
  const [part, setPart] = useState('');
  const [unknownQr, setUnknownQr] = useState(false);
  const [description, setDescription] = useState('');
  const [photo, setPhoto] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [camera, setCamera] = useState(false);

  useEffect(() => {
    api
      .cleaningAreas()
      .then((r) => {
        setAreas(r.data);
        const target = locationId ? locate(locationId, r.data, buildPlaces(r.data)) : null;
        setUnknownQr(Boolean(locationId) && !target);
        setPlaceKey(target?.key ?? '');
        setPart(target?.part ?? '');
      })
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, [locationId]);

  const places = useMemo(() => buildPlaces(areas), [areas]);
  const area = areaAt(areas, places.find((p) => p.key === placeKey) ?? null, part);

  // The preview is an object URL; released when the photo changes so memory is not leaked.
  useEffect(() => {
    if (!photo) return setPreview(null);
    const url = URL.createObjectURL(photo);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [photo]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!area) return setError(t('report.pick_location'));
    if (description.trim().length < 5) return setError(t('report.error_too_short'));
    if (!photo) return setError(t('report.photo_reason'));

    setSubmitting(true);
    setError(null);
    try {
      // The photo is uploaded first, so the report is stored with a reference that already exists.
      const photo_key = (await api.uploadPhoto(photo)).key;
      const result = await api.submitReport({ area_id: area.id, description: description.trim(), photo_key });
      navigate(`/reports/${result.id}`, { replace: true });
    } catch (err) {
      setError(err instanceof Error ? err.message : t('report.error_submit'));
      setSubmitting(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title={t('role.student')} compact />
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-36">
      <Header title={t('role.student')} description={t('role.student_body')} compact mark={<StudentMark />} />

      <main className="mx-auto max-w-lg px-4">
        {locationId && <RoleSwitch locationId={locationId} active="student" />}

        {unknownQr && (
          <p className="mt-5 rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">{t('location.unknown_qr')}</p>
        )}

        <CampusMap />

        <div className="mt-6">
          <LocationSelect
            places={places}
            placeKey={placeKey}
            part={part}
            onChange={(key, next) => {
              setPlaceKey(key);
              setPart(next);
              setUnknownQr(false);
              setError(null);
            }}
          />
        </div>

        {/* Reporting without an account is still allowed; this note only explains
            what that means for the leaderboard. */}
        <p className="mt-5 rounded-nav bg-mist-50 px-3.5 py-2.5 text-sm text-ink-700">
          {session?.role === 'reporter' ? (
            t('session.reporting_as', { name: session.name })
          ) : (
            <>
              {t('session.anonymous_info')}{' '}
              <Link to="/login" className="font-semibold text-accent-600 underline underline-offset-2">
                {t('session.login')}
              </Link>
            </>
          )}
        </p>

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
                  className="rounded-full border border-mist-200 bg-glass px-3 py-1.5 text-xs text-ink-600 transition hover:border-accent-300 hover:text-accent-700"
                >
                  {c.length > 36 ? `${c.slice(0, 36)}…` : c}
                </button>
              ))}
            </div>
          </div>

          <div>
            <span className="label">{t('report.photo')}</span>
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
                  className="absolute right-2 top-2 rounded-lg bg-tetap-ink/75 px-3 py-1.5 text-sm font-semibold text-white"
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

          {error && (
            <p className="rounded-nav bg-red-50 px-4 py-3 text-body-sm font-medium text-red-800" role="alert">
              {error}
            </p>
          )}

          <div className="fixed inset-x-0 bottom-0 border-t border-mist-200 bg-glass/95 p-4 backdrop-blur">
            <div className="mx-auto max-w-lg">
              <button
                type="submit"
                disabled={submitting || !area || !photo}
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
