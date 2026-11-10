import { useEffect, useState } from 'react';
import { api, CLEANING_TASKS, type CleaningArea, type StaffDuties, type StaffOption } from '../lib/api';
import { useLanguage } from '../lib/i18n';

/**
 * Once a staff member has said who they are: the areas that are theirs, as
 * buttons that open that area's round, and the tasks those areas take: the same
 * tasks the round below reports and the dashboard counts, so what they read here
 * is what they are measured on. A hint, never a gate: the location picker below
 * still takes any area, and all of it counts the same.
 */
export default function MyDuties({
  staff,
  areas,
  currentAreaId,
  onPick,
}: {
  staff: StaffOption;
  /** Every QR area, to name the ones that are theirs. */
  areas: CleaningArea[];
  /** The area the round is on now, so its button reads as chosen. */
  currentAreaId: string | null;
  onPick: (area: CleaningArea) => void;
}) {
  const { t } = useLanguage();
  const [letter, setLetter] = useState<StaffDuties | null>(null);

  useEffect(() => {
    setLetter(null);
    api
      .myDuties(staff.id)
      .then(setLetter)
      .catch(() => setLetter(null));
  }, [staff.id]);

  // No letter yet for this person: nothing to show, and the round works as before.
  if (!letter) return null;
  const mine = letter.areas.flatMap((id) => areas.filter((a) => a.id === id));
  if (!mine.length) return null;
  // The system's tasks across their areas, in the round's order.
  const tasks = CLEANING_TASKS.filter((task) => mine.some((a) => a.tasks.includes(task)));

  return (
    <section className="card mt-3 p-4" aria-label={t('mine.title')}>
      <p className="text-nav font-semibold uppercase tracking-wide text-ink-600">{t('mine.title')}</p>

      <p className="mt-1 text-sm text-ink-700">{t('mine.areas_lead')}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {mine.map((a) => {
          const here = a.id === currentAreaId;
          return (
            <button
              key={a.id}
              type="button"
              onClick={() => onPick(a)}
              aria-pressed={here}
              className={`min-h-11 rounded-2xl px-3.5 py-2 text-left text-sm font-semibold ring-1 transition ${
                here ? 'bg-accent-500 text-white ring-accent-500' : 'bg-glass text-ink-900 ring-mist-300 hover:bg-mist-100'
              }`}
            >
              {a.name}
            </button>
          );
        })}
      </div>

      {!!tasks.length && (
        <>
          <p className="mt-3 text-xs font-semibold text-ink-600">{t('mine.tasks_lead')}</p>
          <ul className="mt-1.5 flex flex-wrap gap-1.5">
            {tasks.map((task) => (
              <li key={task} className="rounded-full bg-mist-100 px-2.5 py-1 text-xs font-semibold text-ink-700">
                {t(`task.${task}`)}
              </li>
            ))}
          </ul>
        </>
      )}

      {/* Said plainly, so nobody holds back work because it is not on their list. */}
      <p className="mt-3 rounded-nav bg-mist-100 px-3 py-2 text-xs text-ink-700">{t('mine.note')}</p>
    </section>
  );
}
