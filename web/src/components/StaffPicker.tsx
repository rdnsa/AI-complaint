import type { StaffOption } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import { PersonGlyph } from './Marks';

/**
 * "Who are you?" for cleaning staff: one large dropdown instead of a sign-in.
 * Deliberately big and plain, for staff who rarely use apps.
 */
export default function StaffPicker({
  staffList,
  selected,
  onSelect,
}: {
  staffList: StaffOption[];
  selected: StaffOption | null;
  onSelect: (id: string) => void;
}) {
  const { t } = useLanguage();

  return (
    <div
      className={`rounded-card bg-surface p-6 ${selected ? '' : 'ring-2 ring-accent-500'}`}
    >
      <label
        htmlFor="staff-picker"
        className="flex items-center gap-2 font-display text-nav-title font-semibold text-ink-900"
      >
        <PersonGlyph className="h-5 w-5" />
        {t('staff.who_are_you')}
      </label>
      <select
        id="staff-picker"
        className="input mt-2 !py-3 text-base font-semibold"
        value={selected?.id ?? ''}
        onChange={(e) => onSelect(e.target.value)}
      >
        <option value="">{t('staff.pick_name')}</option>
        {staffList.map((p) => (
          <option key={p.id} value={p.id}>
            {p.name}
          </option>
        ))}
      </select>
      {!staffList.length && <p className="mt-2 text-sm text-amber-900">{t('staff.list_empty')}</p>}
    </div>
  );
}
