import { useEffect, useId, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';
import type { ExportFormat } from '../lib/export-dashboard';

const FORMATS: Array<{ format: ExportFormat; ext: string }> = [
  { format: 'xlsx', ext: '.xlsx' },
  { format: 'csv', ext: '.csv' },
  { format: 'pdf', ext: '.pdf' },
];

/**
 * The export button: asks which file first (Excel, CSV or PDF), then hands the
 * choice on. Closes on a pick, a click outside or Escape.
 */
export default function ExportMenu({
  busy,
  disabled,
  onPick,
  className = '',
}: {
  busy: boolean;
  disabled: boolean;
  onPick: (format: ExportFormat) => void;
  className?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const box = useRef<HTMLDivElement>(null);
  const menuId = useId();

  useEffect(() => {
    if (!open) return;
    const away = (e: PointerEvent) => {
      if (!box.current?.contains(e.target as Node)) setOpen(false);
    };
    const escape = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('pointerdown', away);
    document.addEventListener('keydown', escape);
    return () => {
      document.removeEventListener('pointerdown', away);
      document.removeEventListener('keydown', escape);
    };
  }, [open]);

  return (
    <div ref={box} className={`relative ${className}`}>
      <button
        type="button"
        className="btn-neutral !px-3 !py-1.5 text-xs max-sm:w-full"
        disabled={busy || disabled}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((o) => !o)}
      >
        {busy ? t('ov.exporting') : t('ov.export')}
        <svg aria-hidden viewBox="0 0 12 12" className={`h-3 w-3 transition-transform ${open ? 'rotate-180' : ''}`}>
          <path d="M2.5 4.5 6 8l3.5-3.5" fill="none" stroke="currentColor" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      {open && (
        <div
          id={menuId}
          role="menu"
          aria-label={t('ov.export_as')}
          className="absolute right-0 top-full z-40 mt-2 w-64 rounded-2xl bg-surface p-1.5 shadow-xl ring-1 ring-mist-200 max-sm:left-0 max-sm:w-auto"
        >
          <p className="px-2.5 pb-1 pt-1.5 text-[11px] font-semibold uppercase tracking-wide text-ink-600">{t('ov.export_as')}</p>
          {FORMATS.map(({ format, ext }) => (
            <button
              key={format}
              type="button"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                onPick(format);
              }}
              className="flex w-full items-start gap-3 rounded-xl px-2.5 py-2 text-left transition-colors hover:bg-mist-100 focus-visible:bg-mist-100 focus-visible:outline-none"
            >
              <span className="mt-0.5 w-11 shrink-0 rounded-md bg-mist-100 py-0.5 text-center text-[10px] font-bold uppercase text-ink-700">
                {ext}
              </span>
              <span className="min-w-0">
                <span className="block text-sm font-semibold text-ink-900">{t(`ov.export_${format}`)}</span>
                <span className="block text-xs text-ink-600">{t(`ov.export_${format}_hint`)}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
