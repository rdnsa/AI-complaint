import { useEffect, useRef, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage, type Language } from '../lib/i18n';
import { useTheme } from '../lib/theme';
import { ArrowGlyph } from './Marks';
import { delay, pageProgress, useScrollProgress } from '../lib/motion';

const OPTIONS: Array<{ code: Language; label: string }> = [
  { code: 'id', label: 'ID' },
  { code: 'en', label: 'EN' },
];

export function LanguageButton({ small = false }: { small?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div
      className="flex shrink-0 rounded-full bg-mist-100 p-0.5"
      role="group"
      aria-label={t('language.label')}
    >
      {OPTIONS.map((p) => (
        <button
          key={p.code}
          onClick={() => setLanguage(p.code)}
          aria-pressed={language === p.code}
          className={`rounded-full text-nav font-semibold transition ${small ? 'px-2 py-1' : 'min-h-7 px-3'} ${
            language === p.code ? 'bg-surface text-ink-900 shadow-subtle' : 'text-ink-600 hover:text-ink-900'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Light/dark toggle switch: the knob slides from the sun to the moon. */
export function ThemeButton({ small = false }: { small?: boolean }) {
  const { dark, setDark } = useTheme();
  const { t } = useLanguage();
  const size = small ? 'h-6 w-11' : 'h-8 w-14';
  const knob = small ? 'h-5 w-5' : 'h-7 w-7';
  const shift = small ? 'translate-x-5' : 'translate-x-6';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setDark(!dark)}
      aria-label={dark ? t('theme.to_light') : t('theme.to_dark')}
      title={dark ? t('theme.to_light') : t('theme.to_dark')}
      className={`relative shrink-0 rounded-full bg-mist-100 p-0.5 transition ${size}`}
    >
      <span
        aria-hidden
        className={`grid place-items-center rounded-full bg-surface text-ink-900 shadow-subtle transition-transform duration-200 ${knob} ${
          dark ? shift : 'translate-x-0'
        }`}
      >
        {/* Drawn rather than emoji, so the knob looks the same on every phone. */}
        <svg viewBox="0 0 20 20" className="h-[62%] w-[62%]">
          {dark ? (
            <path d="M16.5 12.4A7 7 0 1 1 7.6 3.5a5.6 5.6 0 0 0 8.9 8.9Z" fill="currentColor" />
          ) : (
            <>
              <circle cx="10" cy="10" r="3.8" fill="currentColor" />
              {[0, 45, 90, 135, 180, 225, 270, 315].map((a) => (
                <line
                  key={a}
                  x1="10"
                  y1="2.2"
                  x2="10"
                  y2="3.8"
                  stroke="currentColor"
                  strokeWidth="1.6"
                  strokeLinecap="round"
                  transform={`rotate(${a} 10 10)`}
                />
              ))}
            </>
          )}
        </svg>
      </span>
    </button>
  );
}

function BackButton({ round = false }: { round?: boolean }) {
  const navigate = useNavigate();
  const { t } = useLanguage();

  // Go back when there is history to go back to; a visitor who landed straight
  // from a QR code has none, so the landing page is the safe destination.
  const goBack = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (round) {
    return (
      <button
        onClick={goBack}
        aria-label={t('nav.back')}
        className="grid h-8 w-8 shrink-0 place-items-center rounded-full text-ink-900 transition hover:bg-mist-100"
      >
        <ArrowGlyph className="h-4 w-4 rotate-180" />
      </button>
    );
  }

  return (
    <button
      onClick={goBack}
      className="inline-flex min-h-9 items-center gap-1 text-body-sm text-accent-600 hover:underline"
    >
      <ArrowGlyph className="h-4 w-4 rotate-180" />
      {t('nav.back')}
    </button>
  );
}

/**
 * Page header, in the product-page pattern of design.md.
 *
 * A thin white navigation bar stays pinned to the top (campus on the left,
 * language and theme on the right); once the page scrolls past the title, the
 * campus line gives way to the app's short name, Kato. Below it the
 * page opens on a white stage with the title set large, and the content that
 * follows sits on the Studio Mist ground.
 */
export default function Header({
  title,
  description,
  compact = false,
  right,
  mark,
  hero = false,
  kicker,
  children,
}: {
  title: string;
  description?: string;
  compact?: boolean;
  right?: React.ReactNode;
  /** The page's brand mark (see Marks.tsx), set above the title. */
  mark?: React.ReactNode;
  /** The landing stage: centred, with the title at display size. */
  hero?: boolean;
  /** Small product label above a hero title. */
  kicker?: string;
  /** Actions under the description (pills, links). */
  children?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [scrolled, setScrolled] = useState(false);
  const bar = useRef<HTMLElement>(null);
  useScrollProgress(bar, pageProgress);

  const onHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 140);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <nav ref={bar} className="sticky top-0 z-50 border-b border-mist-200 bg-surface/80 backdrop-blur-xl backdrop-saturate-150 print:hidden">
        <div className="mx-auto flex h-12 max-w-5xl items-center justify-between gap-3 px-4">
          <div className="flex min-w-0 items-center gap-2">
            {!onHome && scrolled && <BackButton round />}
            <Link to="/" aria-label={t('nav.home')} className="flex min-w-0 items-center gap-2">
              {/* The emblem's lower half is black, so it keeps its own white disc in dark mode too. */}
              <span className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white p-0.5 ring-1 ring-black/5">
                <img src="/logo-upi.svg" alt="" className="h-full w-full" />
              </span>
              {scrolled ? (
                <span key="brand" className="anim-fade-up truncate font-display text-nav-title font-semibold text-ink-900">
                  {t('app.brand')}
                </span>
              ) : (
                /* With an extra button on the right (e.g. sign out), a narrow phone
                   has no room for the name as well; the emblem alone carries it. */
                <span key="campus" className={`anim-fade-in truncate text-nav text-ink-600 ${right ? 'hidden min-[440px]:inline' : ''}`}>
                  {t('header.university')} · {t('header.campus')}
                </span>
              )}
            </Link>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {right}
            <LanguageButton small />
            <ThemeButton small />
          </div>
        </div>
        {/* Reading progress along the bar's bottom edge. */}
        <span
          aria-hidden
          className="absolute inset-x-0 -bottom-px h-[2px] origin-left bg-accent-500"
          style={{ transform: 'scaleX(var(--p, 0))' }}
        />
      </nav>

      <header className="bg-surface">
        {hero ? (
          // The landing stage enters in sequence: label, title, line, actions.
          <div className="mx-auto max-w-5xl px-4 pb-16 pt-14 text-center sm:pb-24 sm:pt-20">
            {kicker && (
              <p className="anim-fade-up font-display text-kicker font-semibold text-ink-900" style={delay(100)}>
                {kicker}
              </p>
            )}
            <h1
              className="anim-rise-in mx-auto mt-3 max-w-4xl font-display text-[48px] font-semibold leading-[1.05] tracking-[-0.72px] text-ink-900 sm:text-hero"
              style={delay(200)}
            >
              {title}
            </h1>
            {description && (
              <p
                className="anim-fade-up mx-auto mt-5 max-w-2xl text-body text-ink-600 sm:text-[21px] sm:leading-[1.38]"
                style={delay(450)}
              >
                {description}
              </p>
            )}
            <div aria-hidden className="anim-line mx-auto mt-8 h-px max-w-xs bg-mist-300" style={delay(650)} />
            {children && (
              <div className="anim-fade-up mt-8" style={delay(800)}>
                {children}
              </div>
            )}
          </div>
        ) : (
          <div className={`mx-auto max-w-5xl px-4 ${compact ? 'pb-8 pt-5' : 'pb-12 pt-8 sm:pb-16'}`}>
            {!onHome && (
              <div className="mb-4">
                <BackButton />
              </div>
            )}
            {mark && (
              <div className="anim-fade-up mb-4" style={delay(60)}>
                {mark}
              </div>
            )}
            <h1
              className={`anim-fade-up font-display font-semibold text-ink-900 ${
                compact ? 'text-feature-sm' : 'text-feature-sm sm:text-feature'
              }`}
            >
              {title}
            </h1>
            {description && (
              <p className="anim-fade-up mt-3 max-w-2xl text-body text-ink-600" style={delay(120)}>
                {description}
              </p>
            )}
            {children && <div className="mt-6">{children}</div>}
          </div>
        )}
      </header>
    </>
  );
}
