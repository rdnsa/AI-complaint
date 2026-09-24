import { StatusBadge } from './Badges';
import { useLanguage, useRelativeTime } from '../lib/i18n';
import type { Report } from '../lib/api';
import { CheckGlyph } from './Marks';

/**
 * Three-step timeline: received → in progress → resolved.
 *
 * A reporter has no account, so this is their only view of how far the complaint
 * has travelled. Steps not yet reached stay visible rather than hidden, to make
 * clear that there is a further stage still to come.
 */
export default function Tracker({ report }: { report: Report }) {
  const { t } = useLanguage();
  const relativeTime = useRelativeTime();

  const stage = { new: 0, in_progress: 1, resolved: 2 }[report.status];

  const steps = [
    { label: t('tracker.received'), note: relativeTime(report.created_at) },
    {
      label: stage >= 1 ? t('tracker.in_progress') : t('tracker.waiting'),
      note: stage >= 1 && report.staff_name ? t('tracker.by', { name: report.staff_name }) : '',
    },
    {
      label: t('tracker.resolved'),
      note: report.resolved_at ? relativeTime(report.resolved_at) : '',
    },
  ];

  return (
    <div className="card mt-4 p-4">
      <div className="flex items-center justify-between gap-3">
        <h2 className="section-title">{t('tracker.title')}</h2>
        <StatusBadge value={report.status} />
      </div>

      <ol className="mt-4">
        {steps.map((s, i) => {
          const reached = i <= stage;
          const last = i === steps.length - 1;
          return (
            <li key={s.label} className="flex gap-3">
              <div className="flex flex-col items-center">
                <span
                  className={`grid h-6 w-6 shrink-0 place-items-center rounded-full text-xs font-bold ring-2 ${
                    reached
                      ? 'bg-bata-500 text-white ring-bata-200'
                      : 'bg-permukaan text-krem-300 ring-krem-200'
                  }`}
                >
                  {reached ? <CheckGlyph className="h-3.5 w-3.5" /> : i + 1}
                </span>
                {!last && (
                  <span className={`w-0.5 flex-1 ${i < stage ? 'bg-bata-400' : 'bg-krem-200'}`} />
                )}
              </div>
              <div className={`pb-5 ${last ? 'pb-0' : ''}`}>
                <p className={`text-sm font-semibold ${reached ? 'text-maroon-900' : 'text-maroon-600/60'}`}>
                  {s.label}
                </p>
                {s.note && <p className="text-xs text-maroon-600">{s.note}</p>}
              </div>
            </li>
          );
        })}
      </ol>

      <p className="mt-1 text-xs text-maroon-600/70">{t('tracker.auto_refresh')}</p>
    </div>
  );
}
