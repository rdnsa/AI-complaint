import { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Header from '../components/Header';
import { api, type CleaningArea } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { readStoredStaff } from '../lib/staff';
import { ArrowGlyph, StaffMark } from '../components/Marks';

/**
 * Every cleaning area, for when the QR is missing or damaged. The areas of the
 * staff member remembered on this phone come first.
 */
export default function CleaningAreas() {
  const { t } = useLanguage();
  const [areas, setAreas] = useState<CleaningArea[]>([]);
  const [loading, setLoading] = useState(true);
  const me = readStoredStaff();

  useEffect(() => {
    api
      .cleaningAreas()
      .then((r) => setAreas(r.data))
      .catch(() => setAreas([]))
      .finally(() => setLoading(false));
  }, []);

  const [mine, others] = useMemo(() => {
    const isMine = (a: CleaningArea) => a.staff.some((s) => s.id === me);
    return [areas.filter(isMine), areas.filter((a) => !isMine(a))];
  }, [areas, me]);

  return (
    <div className="min-h-screen pb-16">
      <Header title={t('clean.title')} description={t('clean.areas_description')} compact mark={<StaffMark />} />
      <main className="mx-auto max-w-lg px-4">
        <p className="mt-6 rounded-nav bg-mist-50 px-3.5 py-2.5 text-sm leading-relaxed text-ink-700">
          {t('clean.areas_hint')}
        </p>
        {loading && <p className="mt-4 text-ink-600">{t('common.loading')}</p>}
        {!loading && !areas.length && <p className="card mt-4 p-6 text-center text-ink-700">{t('clean.areas_empty')}</p>}
        {!!mine.length && <AreaList title={t('clean.my_areas')} areas={mine} />}
        {!!others.length && <AreaList title={mine.length ? t('clean.other_areas') : t('clean.all_areas')} areas={others} />}
      </main>
    </div>
  );
}

function AreaList({ title, areas }: { title: string; areas: CleaningArea[] }) {
  const { t } = useLanguage();
  return (
    <section className="mt-6">
      <h2 className="section-title">{title}</h2>
      <div className="mt-2 space-y-2">
        {areas.map((a) => (
          <Link key={a.id} to={`/clean/${a.id}`} className="card group flex items-center gap-3 p-4">
            <div className="min-w-0 flex-1">
              <p className="font-semibold text-ink-900">{a.name}</p>
              <p className="truncate text-sm text-ink-600">
                {a.tasks.map((task) => t(`task.${task}`)).join(' · ')}
              </p>
              {!!a.staff.length && (
                <p className="truncate text-xs text-ink-600">{a.staff.map((s) => s.name).join(', ')}</p>
              )}
            </div>
            <ArrowGlyph className="h-4 w-4 text-accent-600 transition-transform group-hover:translate-x-0.5" />
          </Link>
        ))}
      </div>
    </section>
  );
}
