import { useLanguage } from '../lib/i18n';
import type { Priority, ReportStatus } from '../lib/api';

const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'bg-red-50 text-red-800 ring-red-200',
  medium: 'bg-amber-50 text-amber-800 ring-amber-200',
  low: 'bg-emerald-50 text-emerald-800 ring-emerald-200',
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  new: 'bg-bata-50 text-bata-700 ring-bata-200',
  in_progress: 'bg-toska-500/10 text-toska-600 ring-toska-400/40',
  resolved: 'bg-krem-100 text-maroon-600 ring-krem-300',
};

const base =
  'inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-bold ring-1 ring-inset';

export function PriorityBadge({ value }: { value: Priority | null }) {
  const { t } = useLanguage();
  if (!value) return null;
  return <span className={`${base} ${PRIORITY_COLORS[value]}`}>{t(`priority.${value}`)}</span>;
}

export function StatusBadge({ value }: { value: ReportStatus }) {
  const { t } = useLanguage();
  return <span className={`${base} ${STATUS_COLORS[value]}`}>{t(`status.${value}`)}</span>;
}

export function CategoryBadge({ value }: { value: string }) {
  const { t } = useLanguage();
  // A category outside the standard list is still shown, verbatim.
  const label = t(`category.${value}` as 'category.other');
  return (
    <span className={`${base} bg-krem-100 text-maroon-700 ring-krem-300`}>
      {label.startsWith('category.') ? value : label}
    </span>
  );
}
