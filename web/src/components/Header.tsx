import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useLanguage, type Language } from '../lib/i18n';
import { useTheme } from '../lib/theme';

const OPTIONS: Array<{ code: Language; label: string }> = [
  { code: 'id', label: 'ID' },
  { code: 'en', label: 'EN' },
];

function LanguageButton({ small = false }: { small?: boolean }) {
  const { language, setLanguage, t } = useLanguage();
  return (
    <div
      className="flex shrink-0 rounded-full bg-white/15 p-0.5 ring-1 ring-white/25"
      role="group"
      aria-label={t('language.label')}
    >
      {OPTIONS.map((p) => (
        <button
          key={p.code}
          onClick={() => setLanguage(p.code)}
          aria-pressed={language === p.code}
          className={`rounded-full font-bold transition ${small ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${
            language === p.code ? 'bg-white text-tetap-maroon' : 'text-white/80 hover:text-white'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/** Light/dark toggle switch: the knob slides from the sun to the moon. */
function ThemeButton({ small = false }: { small?: boolean }) {
  const { dark, setDark } = useTheme();
  const { t } = useLanguage();
  const size = small ? 'h-6 w-11' : 'h-8 w-14';
  const knob = small ? 'h-5 w-5 text-[11px]' : 'h-7 w-7 text-sm';
  const shift = small ? 'translate-x-5' : 'translate-x-6';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={dark}
      onClick={() => setDark(!dark)}
      aria-label={dark ? t('theme.to_light') : t('theme.to_dark')}
      title={dark ? t('theme.to_light') : t('theme.to_dark')}
      className={`relative shrink-0 rounded-full p-0.5 ring-1 ring-white/25 transition ${size} ${
        dark ? 'bg-white/30' : 'bg-white/15'
      }`}
    >
      <span
        aria-hidden
        className={`grid place-items-center rounded-full bg-white text-tetap-maroon shadow transition-transform duration-200 ${knob} ${
          dark ? shift : 'translate-x-0'
        }`}
      >
        {dark ? '🌙' : '☀️'}
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
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-sm text-white ring-1 ring-white/25 transition hover:bg-white/25"
      >
        ←
      </button>
    );
  }

  return (
    <button
      onClick={goBack}
      className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-tetap-krem transition hover:bg-white/10 hover:text-white"
    >
      <span aria-hidden>←</span>
      {t('nav.back')}
    </button>
  );
}

/**
 * Page header in the visual identity of UPI Tasikmalaya Campus.
 *
 * Once the page scrolls past it, a condensed version reappears as a floating
 * pill, so the back button and the language switch stay within reach without
 * scrolling back to the top.
 */
export default function Header({
  title,
  description,
  compact = false,
  right,
}: {
  title: string;
  description?: string;
  compact?: boolean;
  right?: React.ReactNode;
}) {
  const { t } = useLanguage();
  const { pathname } = useLocation();
  const [floating, setFloating] = useState(false);

  const onHome = pathname === '/';

  useEffect(() => {
    const onScroll = () => setFloating(window.scrollY > 110);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <>
      <header className="bg-maroon-lembut text-white">
        <div className={`mx-auto max-w-5xl px-4 ${compact ? 'py-4' : 'py-7'}`}>
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/95 text-base font-extrabold tracking-tight text-tetap-maroon">
                UPI
              </span>
              {/* With an extra button on the right (e.g. sign out), a narrow phone
                  has no room for the name as well; the UPI badge alone carries it. */}
              <span
                className={`text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-tetap-krem sm:text-[11px] ${
                  right ? 'hidden min-[440px]:inline' : ''
                }`}
              >
                {t('header.university')}
                <br />
                <span className="text-white/70">{t('header.campus')}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {right}
              <LanguageButton />
              <ThemeButton />
            </div>
          </div>

          {!onHome && (
            <div className="mt-3">
              <BackButton />
            </div>
          )}

          <h1
            className={`font-extrabold tracking-tight ${onHome ? 'mt-4' : 'mt-1.5'} ${
              compact ? 'text-xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            {title}
          </h1>
          {description && (
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-tetap-krem">{description}</p>
          )}
        </div>
        {/* Orange-to-teal accent line, quoting the colours of the campus map poster. */}
        <div className="h-1 bg-gradient-to-r from-bata-500 via-bata-400 to-toska-500" />
      </header>

      <div
        className={`fixed inset-x-0 top-3 z-50 flex justify-center px-4 transition-all duration-300 ${
          floating ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-6 opacity-0'
        }`}
      >
        <div className="flex max-w-full items-center gap-2 rounded-full bg-tetap-maroon/95 py-1.5 pl-1.5 pr-2 text-white shadow-naik ring-1 ring-white/15 backdrop-blur">
          {!onHome && <BackButton round />}
          <Link
            to="/"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[10px] font-extrabold text-tetap-maroon"
          >
            UPI
          </Link>
          <span className="truncate px-1 text-sm font-bold">{title}</span>
          <LanguageButton small />
          <ThemeButton small />
        </div>
      </div>
    </>
  );
}
