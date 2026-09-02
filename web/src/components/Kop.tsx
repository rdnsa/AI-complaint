import { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useBahasa, type Bahasa } from '../lib/i18n';

const PILIHAN: Array<{ kode: Bahasa; label: string }> = [
  { kode: 'id', label: 'ID' },
  { kode: 'en', label: 'EN' },
];

function TombolBahasa({ kecil = false }: { kecil?: boolean }) {
  const { bahasa, ubah, t } = useBahasa();
  return (
    <div
      className="flex shrink-0 rounded-full bg-white/15 p-0.5 ring-1 ring-white/25"
      role="group"
      aria-label={t('bahasa.label')}
    >
      {PILIHAN.map((p) => (
        <button
          key={p.kode}
          onClick={() => ubah(p.kode)}
          aria-pressed={bahasa === p.kode}
          className={`rounded-full font-bold transition ${kecil ? 'px-2 py-0.5 text-[10px]' : 'px-2.5 py-1 text-xs'} ${
            bahasa === p.kode ? 'bg-white text-maroon-800' : 'text-white/80 hover:text-white'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

function TombolKembali({ bulat = false }: { bulat?: boolean }) {
  const navigate = useNavigate();
  const { t } = useBahasa();

  // Go back when there is history to go back to; a visitor who landed straight
  // from a QR code has none, so the landing page is the safe destination.
  const kembali = () => (window.history.length > 1 ? navigate(-1) : navigate('/'));

  if (bulat) {
    return (
      <button
        onClick={kembali}
        aria-label={t('nav.kembali')}
        className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/15 text-sm text-white ring-1 ring-white/25 transition hover:bg-white/25"
      >
        ←
      </button>
    );
  }

  return (
    <button
      onClick={kembali}
      className="-ml-1 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-semibold text-krem-200 transition hover:bg-white/10 hover:text-white"
    >
      <span aria-hidden>←</span>
      {t('nav.kembali')}
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
export default function Kop({
  judul,
  keterangan,
  ramping = false,
  kanan,
}: {
  judul: string;
  keterangan?: string;
  ramping?: boolean;
  kanan?: React.ReactNode;
}) {
  const { t } = useBahasa();
  const { pathname } = useLocation();
  const [melayang, setMelayang] = useState(false);

  const diBeranda = pathname === '/';

  useEffect(() => {
    const saatGulir = () => setMelayang(window.scrollY > 110);
    saatGulir();
    window.addEventListener('scroll', saatGulir, { passive: true });
    return () => window.removeEventListener('scroll', saatGulir);
  }, []);

  return (
    <>
      <header className="bg-maroon-lembut text-white">
        <div className={`mx-auto max-w-5xl px-4 ${ramping ? 'py-4' : 'py-7'}`}>
          <div className="flex items-center justify-between gap-3">
            <Link to="/" className="flex items-center gap-2.5">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-white/95 text-base font-extrabold tracking-tight text-maroon-800">
                UPI
              </span>
              <span className="text-[10px] font-semibold uppercase leading-tight tracking-[0.1em] text-krem-200 sm:text-[11px]">
                {t('kop.universitas')}
                <br />
                <span className="text-white/70">{t('kop.kampus')}</span>
              </span>
            </Link>
            <div className="flex items-center gap-2">
              {kanan}
              <TombolBahasa />
            </div>
          </div>

          {!diBeranda && (
            <div className="mt-3">
              <TombolKembali />
            </div>
          )}

          <h1
            className={`font-extrabold tracking-tight ${diBeranda ? 'mt-4' : 'mt-1.5'} ${
              ramping ? 'text-xl' : 'text-2xl sm:text-3xl'
            }`}
          >
            {judul}
          </h1>
          {keterangan && (
            <p className="mt-1.5 max-w-xl text-sm leading-relaxed text-krem-200">{keterangan}</p>
          )}
        </div>
        {/* Garis aksen oranye-toska, mengutip warna pada poster peta kampus. */}
        <div className="h-1 bg-gradient-to-r from-bata-500 via-bata-400 to-toska-500" />
      </header>

      <div
        className={`fixed inset-x-0 top-3 z-50 flex justify-center px-4 transition-all duration-300 ${
          melayang ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-6 opacity-0'
        }`}
      >
        <div className="flex max-w-full items-center gap-2 rounded-full bg-maroon-800/95 py-1.5 pl-1.5 pr-2 text-white shadow-naik ring-1 ring-white/15 backdrop-blur">
          {!diBeranda && <TombolKembali bulat />}
          <Link
            to="/"
            className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white text-[10px] font-extrabold text-maroon-800"
          >
            UPI
          </Link>
          <span className="truncate px-1 text-sm font-bold">{judul}</span>
          <TombolBahasa kecil />
        </div>
      </div>
    </>
  );
}
