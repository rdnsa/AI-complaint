import { useCallback, useEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import CampusMap from '../components/CampusMap';
import Header from '../components/Header';
import ComplaintCard from '../components/ComplaintCard';
import DailyTasks from '../components/DailyTasks';
import LocationSelect from '../components/LocationSelect';
import RoleSwitch from '../components/RoleSwitch';
import StaffPicker from '../components/StaffPicker';
import { api, type Campus, type CleaningArea, type Report } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { areaAt, buildPlaces, locate, reportIsAt } from '../lib/places';
import { useSelectedStaff } from '../lib/staff';
import { ReportsMark, StaffMark } from '../components/Marks';
import { Reveal } from '../lib/motion';

type Tab = 'complaints' | 'daily';

/**
 * The one page for cleaning staff, without sign-in: the location (building,
 * then floor or yard), then "Keluhan" (complaints waiting there) or "Tugas
 * harian" (the six daily tasks, each photographed and sent on its own), and
 * the staff member's name.
 *
 * Both QR codes land here with the location already picked: the location QR
 * (/staff/C-2, after the reporter/staff switch) and the staff sticker
 * (/clean/C-2), which opens straight on the daily tasks.
 */
export default function StaffHome() {
  const { locationId, areaId } = useParams();
  const { t } = useLanguage();
  const { staffList, selected, select, loading: loadingStaff } = useSelectedStaff();
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

  if (loading || loadingStaff) {
    return (
      <div className="min-h-screen">
        <Header title={t('staff.title')} compact />
        <p className="p-10 text-center text-ink-600">{t('common.loading')}</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('staff.title')} description={t('staff.description')} compact mark={<StaffMark />} />

      <main className="mx-auto max-w-lg px-4">
        {locationId && <RoleSwitch locationId={locationId} active="staff" />}

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
            }}
          />
        </div>

        <nav className="mt-4 grid grid-cols-2 gap-2">
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
                <span className="ml-1.5 rounded-full bg-red-600 px-2 py-0.5 text-xs text-white">
                  {complaints.length}
                </span>
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

        <div className="mt-4">
          <StaffPicker staffList={staffList} selected={selected} onSelect={select} />
        </div>

        {selected && tab === 'complaints' && (
          <section className="mt-4 space-y-3">
            {!complaints.length && (
              <p className="card p-8 text-center text-ink-700">
                {place ? t('staff.no_complaints_here') : t('staff.all_done')}
              </p>
            )}
            {complaints.map((r) => (
              <Reveal key={r.id}>
                <ComplaintCard report={r} staff={selected} onChanged={loadOpen} />
              </Reveal>
            ))}
          </section>
        )}

        {selected && tab === 'daily' && (
          area && campus ? (
            // Keyed by area and person, so a new location or a new name on a shared phone starts clean.
            <DailyTasks key={`${area.id}:${selected.id}`} area={area} campus={campus} staff={selected} />
          ) : (
            <p className="card mt-4 p-8 text-center text-ink-700">
              {!part ? t('staff.pick_location') : t('staff.no_area')}
            </p>
          )
        )}
      </main>
    </div>
  );
}
