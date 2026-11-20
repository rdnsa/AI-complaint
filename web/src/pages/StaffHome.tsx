import { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate, useParams } from 'react-router-dom';
import CampusMap from '../components/CampusMap';
import Header from '../components/Header';
import ComplaintCard from '../components/ComplaintCard';
import DailyTasks from '../components/DailyTasks';
import LocationSelect from '../components/LocationSelect';
import RoleSwitch from '../components/RoleSwitch';
import MyDuties from '../components/MyDuties';
import { api, type Campus, type CleaningArea, type Report, type StaffOption } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { areaAt, buildPlaces, locate, partOf, placeKeyOf, reportIsAt } from '../lib/places';
import { useSession } from '../lib/session';
import { PersonGlyph, ReportsMark, StaffMark } from '../components/Marks';
import { Reveal } from '../lib/motion';

type Tab = 'complaints' | 'daily';

/**
 * The one page for cleaning staff, signed in with their own account (first
 * name at upi.edu): first "Keluhan" (every complaint waiting, with building and
 * floor as an optional filter) or "Tugas harian" (the six daily tasks, each
 * photographed and sent on its own, for a location).
 *
 * Without a staff session the page sends the visitor to sign in, and back here
 * afterwards, so a QR scanned before signing in still lands on its location.
 * Both QR codes land here with the location already picked: the location QR
 * (/staff/C-2, after the reporter/staff switch) and the staff sticker
 * (/clean/C-2), which opens straight on the daily tasks.
 */
export default function StaffHome() {
  const { t } = useLanguage();
  const { session, loading, logout } = useSession();
  const navigate = useNavigate();
  const { pathname } = useLocation();
  const staff: StaffOption | null = session?.role === 'staff' ? { id: session.id, name: session.name } : null;

  useEffect(() => {
    if (!loading && !staff) navigate(`/login?next=${encodeURIComponent(pathname)}`, { replace: true });
  }, [loading, staff, pathname, navigate]);

  if (loading || !staff) {
    return (
      <div className="min-h-screen">
        <Header title={t('staff.title')} compact />
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <Round
      staff={staff}
      onLogout={async () => {
        await logout();
        navigate('/login?next=/staff', { replace: true });
      }}
    />
  );
}

/** The page itself, for a signed-in staff member. */
function Round({ staff, onLogout }: { staff: StaffOption; onLogout: () => void }) {
  const { locationId, areaId } = useParams();
  const { t } = useLanguage();
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [campus, setCampus] = useState<Campus | null>(null);
  const [open, setOpen] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [placeKey, setPlaceKey] = useState('');
  const [part, setPart] = useState('');
  const [tab, setTab] = useState<Tab>('complaints');
  const [unknownQr, setUnknownQr] = useState(false);

  const loadOpen = useCallback(async () => {
    const r = await api.openReports().catch(() => ({ data: [] as Report[] }));
    setOpen(r.data);
  }, []);

  useEffect(() => {
    Promise.all([
      api.cleaningAreas().catch(() => null),
      api.openReports().catch(() => ({ data: [] as Report[] })),
    ])
      .then(([cleaning, reports]) => {
        const areaList = cleaning?.data ?? [];
        setAreas(areaList);
        setCampus(cleaning?.campus ?? null);
        setOpen(reports.data);

        // Pick the location the QR stands for.
        const id = areaId ?? locationId;
        const allPlaces = buildPlaces(areaList);
        const target = id ? locate(id, areaList, allPlaces) : null;
        setUnknownQr(Boolean(id) && !target);
        setPlaceKey(target?.key ?? '');
        setPart(target?.part ?? '');

        // The staff sticker is for the daily round; the location QR opens on complaints when some wait there.
        const targetPlace = allPlaces.find((p) => p.key === target?.key);
        const waitingHere =
          targetPlace && reports.data.some((r) => reportIsAt(r, areaList, targetPlace, target!.part));
        setTab(areaId || (locationId && !waitingHere) ? 'daily' : 'complaints');
      })
      .finally(() => setLoading(false));
  }, [locationId, areaId]);

  const places = useMemo(() => buildPlaces(areas), [areas]);
  const place = places.find((p) => p.key === placeKey) ?? null;
  const area = areaAt(areas, place, part);

  // No place: everything waiting on campus.
  const complaints = place ? open.filter((r) => reportIsAt(r, areas, place, part)) : open;

  if (loading) {
    return (
      <div className="min-h-screen">
        <Header title={t('staff.title')} compact />
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  const identity = (
    <div className="card flex items-center gap-3 p-4">
      <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-accent-500/15 text-accent-600">
        <PersonGlyph className="h-5 w-5" />
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-xs text-ink-600">{t('staff.signed_in_as')}</p>
        <p className="truncate font-display text-nav-title font-semibold text-ink-900">{staff.name}</p>
      </div>
      <button type="button" onClick={onLogout} className="btn-neutral shrink-0 !px-4 !py-2 text-body-sm">
        {t('session.logout')}
      </button>
    </div>
  );

  const tabs = (
    <nav className="grid grid-cols-2 gap-2">
      <button
        type="button"
        onClick={() => setTab('complaints')}
        aria-pressed={tab === 'complaints'}
        className={tab === 'complaints' ? 'choice-on !py-3' : 'choice-off !py-3'}
      >
        <ReportsMark size="h-8 w-8 rounded-lg" />
        <span>
          {t('staff.tab_complaints')}
          {!!complaints.length && (
            <span className="ml-1.5 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">{complaints.length}</span>
          )}
        </span>
      </button>
      <button
        type="button"
        onClick={() => setTab('daily')}
        aria-pressed={tab === 'daily'}
        className={tab === 'daily' ? 'choice-on !py-3' : 'choice-off !py-3'}
      >
        <StaffMark size="h-8 w-8 rounded-lg" />
        {t('staff.tab_daily')}
      </button>
    </nav>
  );

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('staff.title')} description={t('staff.description')} compact mark={<StaffMark />} />

      {/* One column on a phone. On a wide screen the controls (who, what, where) sit in a
          column on the left, the campus map under them, while the work fills the right. */}
      <main className="mx-auto max-w-lg px-4 lg:grid lg:max-w-5xl lg:grid-cols-[minmax(0,22rem)_minmax(0,1fr)] lg:items-start lg:gap-8">
        {/* On a wide screen the column rides along while the work on the right scrolls. Never
            taller than the screen: a long column (the daily round's own areas) scrolls by
            itself, so the location picker at its foot stays in reach. The padding leaves room
            for the cards' shadows and focus rings, which the scroll box would otherwise clip. */}
        <aside className="flex flex-col lg:sticky lg:top-14 lg:-mx-3 lg:max-h-[calc(100vh-3.5rem)] lg:overflow-y-auto lg:overscroll-contain lg:px-3 lg:pb-6 lg:[scrollbar-width:thin]">
          {locationId && <RoleSwitch locationId={locationId} active="staff" />}

          {unknownQr && (
            <p className="mt-5 rounded-nav bg-amber-50 px-4 py-3 text-body-sm text-amber-900">{t('location.unknown_qr')}</p>
          )}

          <div className="mt-5">{identity}</div>

          <div className="lg:order-last">
            <CampusMap />
          </div>

          <div className="mt-6">{tabs}</div>

          {/* Their areas as a hint, one tap from the round; the picker below still takes any area. */}
          {tab === 'daily' && (
            <MyDuties
              staff={staff}
              areas={areas}
              currentAreaId={area?.id ?? null}
              onPick={(a) => {
                setPlaceKey(placeKeyOf(a));
                setPart(partOf(a));
                setUnknownQr(false);
              }}
            />
          )}

          <div className="mt-4">
            <LocationSelect
              places={places}
              placeKey={placeKey}
              part={part}
              // Complaints: the place only narrows the list. Daily tasks: it says where the round is.
              filter={tab === 'complaints'}
              onChange={(key, next) => {
                setPlaceKey(key);
                setPart(next);
                setUnknownQr(false);
              }}
            />
          </div>
        </aside>

        <div className="mt-4 lg:mt-5">
          {tab === 'complaints' && (
            <section className="space-y-3">
              {!complaints.length && (
                <p className="card p-8 text-center text-ink-700">
                  {place ? t('staff.no_complaints_here') : t('staff.all_done')}
                </p>
              )}
              {complaints.map((r) => (
                <Reveal key={r.id}>
                  <ComplaintCard report={r} staff={staff} onChanged={loadOpen} />
                </Reveal>
              ))}
            </section>
          )}

          {tab === 'daily' &&
            (area && campus ? (
              // Keyed by area, so a new location starts clean.
              <DailyTasks key={area.id} area={area} campus={campus} staff={staff} />
            ) : (
              <p className="card p-8 text-center text-ink-700">
                {!part ? t('staff.pick_location') : t('staff.no_area')}
              </p>
            ))}
        </div>
      </main>
    </div>
  );
}
