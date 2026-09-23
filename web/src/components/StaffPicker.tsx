import type { StaffOption } from '../lib/api';
import { useLanguage } from '../lib/i18n';

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
      className={`rounded-2xl p-4 ring-1 ${
        selected ? 'bg-emerald-50 ring-emerald-200' : 'bg-amber-50 ring-amber-300'
      }`}
    >
      {/* The tinted box keeps its light colour in both themes, so its label must
          too; the theme-following maroon ink would vanish on it in dark mode. */}
      <label
        htmlFor="staff-picker"
        className={`block text-base font-bold ${selected ? 'text-emerald-950' : 'text-amber-950'}`}
      >
        👤 {t('staff.who_are_you')}
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
