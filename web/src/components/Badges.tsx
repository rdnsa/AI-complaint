import { useLanguage } from '../lib/i18n';
import type { Priority, ReportStatus } from '../lib/api';

/*
 * Status and priority are bare 12px/600 labels, never coloured pills (design.md:
 * "use bare #b64400 12px text" for launch-style status). A small dot keeps the
 * priority readable at a glance without adding chrome.
 */
const PRIORITY_COLORS: Record<Priority, string> = {
  high: 'text-red-700 dark:text-red-400',
  medium: 'text-amber-700 dark:text-amber-400',
  low: 'text-emerald-700 dark:text-emerald-400',
};

const STATUS_COLORS: Record<ReportStatus, string> = {
  new: 'text-launch',
  in_progress: 'text-accent-600',
  resolved: 'text-ink-600',
};

const base = 'inline-flex items-center gap-1.5 text-nav font-semibold';
const dot = 'h-1.5 w-1.5 rounded-full bg-current';

export function PriorityBadge({ value }: { value: Priority | null }) {
  const { t } = useLanguage();
  if (!value) return null;
  return (
    <span className={`${base} ${PRIORITY_COLORS[value]}`}>
      <span aria-hidden className={dot} />
      {t(`priority.${value}`)}
    </span>
  );
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
    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-nav text-ink-700 ring-1 ring-inset ring-ink-600/40">
      {label.startsWith('category.') ? value : label}
    </span>
  );
}
