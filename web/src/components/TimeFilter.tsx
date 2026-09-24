import { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import { ClockGlyph } from './Marks';

/** The query values the report and work-report lists understand. WIB, inclusive. */
export interface TimeRange {
  from: string;
  to: string;
  hour_from: string;
  hour_to: string;
}

export const EMPTY_TIME_RANGE: TimeRange = { from: '', to: '', hour_from: '', hour_to: '' };

type Preset = 'all' | 'today' | 'yesterday' | '7_days' | '30_days' | 'custom';

/** Today's date on the campus clock, 'YYYY-MM-DD', whatever zone the device is in. */
function todayWIB(daysBack = 0): string {
  const wib = new Date(Date.now() + 7 * 60 * 60 * 1000 - daysBack * 24 * 60 * 60 * 1000);
  return wib.toISOString().slice(0, 10);
}

function presetRange(p: Preset): Pick<TimeRange, 'from' | 'to'> {
  switch (p) {
    case 'today':
      return { from: todayWIB(), to: todayWIB() };
    case 'yesterday':
      return { from: todayWIB(1), to: todayWIB(1) };
    case '7_days':
      return { from: todayWIB(6), to: todayWIB() };
    case '30_days':
      return { from: todayWIB(29), to: todayWIB() };
    default:
      return { from: '', to: '' };
  }
}

const HOURS = Array.from({ length: 24 }, (_, h) => h);

/**
 * "When" for the supervisor: quick ranges for the everyday questions (today,
 * this week), exact dates when needed, and an hour window for shift checks
 * such as "what came in between 07:00 and 12:00".
 */
export default function TimeFilter({
  value,
  onChange,
}: {
  value: TimeRange;
  onChange: (next: TimeRange) => void;
}) {
  const { t } = useLanguage();
  const [preset, setPreset] = useState<Preset>('all');

  const choosePreset = (p: Preset) => {
    setPreset(p);
    if (p !== 'custom') onChange({ ...value, ...presetRange(p) });
  };

  const active = value.from || value.to || value.hour_from || value.hour_to;

  return (
    <div className="card mt-4 space-y-3 p-3">
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="mr-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wider text-maroon-600">
          <ClockGlyph className="h-3.5 w-3.5" />
          {t('time.filter')}
        </span>
        {(['all', 'today', 'yesterday', '7_days', '30_days', 'custom'] as const).map((p) => (
          <button
            key={p}
            type="button"
            onClick={() => choosePreset(p)}
            aria-pressed={preset === p}
            className={`rounded-full px-3 py-1.5 text-xs font-semibold ring-1 transition ${
              preset === p
                ? 'bg-maroon-800 text-permukaan ring-maroon-800'
                : 'bg-permukaan text-maroon-700 ring-krem-300 hover:bg-krem-50'
            }`}
          >
            {t(`time.${p}`)}
          </button>
        ))}
        {active && (
          <button
            type="button"
            onClick={() => {
              setPreset('all');
              onChange(EMPTY_TIME_RANGE);
            }}
            className="ml-auto text-xs font-semibold text-bata-600 underline underline-offset-2"
          >
            {t('time.reset')}
          </button>
        )}
      </div>

      <div className="flex flex-wrap items-end gap-3">
        {preset === 'custom' && (
          <>
            <label className="text-xs text-maroon-700">
              <span className="mb-1 block font-semibold">{t('time.from_date')}</span>
              <input
                type="date"
                className="input !w-auto !py-1.5"
                value={value.from}
                max={value.to || undefined}
                onChange={(e) => onChange({ ...value, from: e.target.value })}
              />
            </label>
            <label className="text-xs text-maroon-700">
              <span className="mb-1 block font-semibold">{t('time.to_date')}</span>
              <input
                type="date"
                className="input !w-auto !py-1.5"
                value={value.to}
                min={value.from || undefined}
                onChange={(e) => onChange({ ...value, to: e.target.value })}
              />
            </label>
          </>
        )}
        <label className="text-xs text-maroon-700">
          <span className="mb-1 block font-semibold">{t('time.from_hour')}</span>
          <select
            className="input !w-auto !py-1.5"
            value={value.hour_from}
            onChange={(e) => onChange({ ...value, hour_from: e.target.value })}
          >
            <option value="">—</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}.00
              </option>
            ))}
          </select>
        </label>
        <label className="text-xs text-maroon-700">
          <span className="mb-1 block font-semibold">{t('time.to_hour')}</span>
          <select
            className="input !w-auto !py-1.5"
            value={value.hour_to}
            onChange={(e) => onChange({ ...value, hour_to: e.target.value })}
          >
            <option value="">—</option>
            {HOURS.map((h) => (
              <option key={h} value={h}>
                {String(h).padStart(2, '0')}.59
              </option>
            ))}
          </select>
        </label>
        <span className="pb-2 text-xs text-maroon-600">WIB</span>
      </div>
    </div>
  );
}
