import { Link } from 'react-router-dom';

export type BottomNavItem = {
  key: string;
  label: string;
  icon: (p: { className?: string }) => JSX.Element;
  active?: boolean;
  /** A link when set; otherwise a button that calls `onSelect`. */
  to?: string;
  onSelect?: () => void;
  /** A count in a red dot on the icon. */
  badge?: number;
  /** The raised round button in the middle of the bar. */
  primary?: boolean;
};

/**
 * On a phone, a floating glass bar along the bottom, in reach of the thumb.
 * Hidden on a wide screen, where the header carries the same sections.
 */
export default function BottomNav({ items, label }: { items: BottomNavItem[]; label: string }) {
  return (
    <nav
      className="fixed inset-x-3 bottom-[calc(0.75rem+env(safe-area-inset-bottom))] z-50 rounded-[28px] border border-white/60 bg-surface/55 shadow-[0_12px_32px_-12px_rgb(0_0_0/0.3),inset_0_1px_0_rgb(255_255_255/0.5)] backdrop-blur-2xl backdrop-saturate-[1.8] dark:border-white/15 dark:shadow-[0_12px_32px_-12px_rgb(0_0_0/0.6),inset_0_1px_0_rgb(255_255_255/0.08)] md:hidden print:hidden"
      aria-label={label}
    >
      <div className="grid" style={{ gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }}>
        {items.map((item) => {
          const Icon = item.icon;
          const className = `flex min-w-0 flex-col items-center gap-1 pb-2 pt-2.5 text-[11px] font-semibold transition ${
            item.active ? 'text-accent-600' : 'text-ink-600 active:text-ink-900'
          }`;
          const body = item.primary ? (
            <>
              <span className="-mt-7 grid h-14 w-14 place-items-center rounded-full bg-accent-500 text-white shadow-[0_8px_20px_-6px_rgb(0_0_0/0.35)] ring-4 ring-white/50 transition active:scale-95 dark:ring-white/10">
                <Icon className="h-6 w-6" />
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </>
          ) : (
            <>
              <span className={`relative grid h-7 w-14 place-items-center rounded-full transition ${item.active ? 'bg-accent-500/15' : ''}`}>
                <Icon className="h-5 w-5" />
                {!!item.badge && (
                  <span className="absolute -top-1 right-1.5 grid min-w-[18px] place-content-center rounded-full bg-red-600 px-1 py-0.5 text-[10px] leading-none text-white ring-2 ring-surface">
                    {item.badge}
                  </span>
                )}
              </span>
              <span className="max-w-full truncate px-1">{item.label}</span>
            </>
          );

          return item.to ? (
            <Link key={item.key} to={item.to} aria-current={item.active ? 'page' : undefined} className={className}>
              {body}
            </Link>
          ) : (
            <button key={item.key} type="button" aria-pressed={item.active} onClick={item.onSelect} className={className}>
              {body}
            </button>
          );
        })}
      </div>
    </nav>
  );
}
