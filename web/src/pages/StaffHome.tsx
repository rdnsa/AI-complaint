import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { PriorityBadge, StatusBadge } from '../components/Badges';
import LocationPicker from '../components/LocationPicker';
import StaffPicker from '../components/StaffPicker';
import { api, type Report } from '../lib/api';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import { useSelectedStaff } from '../lib/staff';
import { ArrowGlyph, StaffMark } from '../components/Marks';

/**
 * The staff starting point when no QR is at hand: every report still waiting,
 * across campus, and a way to open any floor. The actual work happens on the
 * floor page, where the staff member is standing.
 */
export default function StaffHome() {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();
  const { staffList, selected, select } = useSelectedStaff();
  const [open, setOpen] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api
      .openReports()
      .then((r) => setOpen(r.data))
      .catch(() => setOpen([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('staff.title')} description={t('staff.description')} compact mark={<StaffMark />} />

      {/* Phone: one column. Desktop: "who are you" beside the waiting list,
          then the full-width location picker, matching the student page. */}
      <main className="mx-auto max-w-5xl px-4">
        <div className="lg:grid lg:grid-cols-[minmax(0,2fr)_minmax(0,3fr)] lg:gap-6">
        <div>
          <div className="mt-6">
            <StaffPicker staffList={staffList} selected={selected} onSelect={select} />
          </div>

          <p className="mt-4 rounded-xl bg-krem-50 px-3.5 py-2.5 text-sm leading-relaxed text-maroon-700 ring-1 ring-krem-200">
            {t('staff.qr_hint')}
          </p>
        </div>

        <div>
        <h2 className="section-title mt-6">
          {t('staff.waiting')} {!loading && `(${open.length})`}
        </h2>
        <div className="mt-2 space-y-2">
          {loading && <p className="text-maroon-600">{t('common.loading')}</p>}
          {!loading && !open.length && (
            <p className="card p-6 text-center text-maroon-700">{t('staff.all_done')}</p>
          )}
          {open.map((r) => (
            <Link
              key={r.id}
              to={`/staff/${r.building_code}-${r.floor}`}
              className="card group flex items-center gap-3 p-3 hover:shadow-naik"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-1.5">
                  <PriorityBadge value={r.priority} />
                  <StatusBadge value={r.status} />
                  <span className="text-xs text-maroon-600">{relativeTime(r.created_at)}</span>
                </div>
                <p className="mt-1 truncate text-sm font-semibold text-maroon-900">{r.toilet_name}</p>
                <p className="truncate text-sm text-maroon-700">{r.summary ?? r.description}</p>
              </div>
              <span className="flex shrink-0 items-center gap-1 text-sm font-bold text-bata-600">
                {t('staff.open')}
                <ArrowGlyph className="h-4 w-4 transition-transform group-hover:translate-x-0.5" />
              </span>
            </Link>
          ))}
        </div>
        </div>
        </div>

        <LocationPicker target={(code, floor) => `/staff/${code}-${floor}`} />
      </main>
    </div>
  );
}
