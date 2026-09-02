import { Link } from 'react-router-dom';
import { useBahasa, type Bahasa } from '../lib/i18n';

const PILIHAN: Array<{ kode: Bahasa; label: string }> = [
  { kode: 'id', label: 'ID' },
  { kode: 'en', label: 'EN' },
];

function TombolBahasa() {
  const { bahasa, ubah, t } = useBahasa();
  return (
    <div
      className="flex shrink-0 rounded-lg bg-white/15 p-0.5 ring-1 ring-white/25"
      role="group"
      aria-label={t('bahasa.label')}
    >
      {PILIHAN.map((p) => (
        <button
          key={p.kode}
          onClick={() => ubah(p.kode)}
          aria-pressed={bahasa === p.kode}
          className={`rounded-[7px] px-2.5 py-1 text-xs font-bold transition ${
            bahasa === p.kode ? 'bg-white text-maroon-800' : 'text-white/80 hover:text-white'
          }`}
        >
          {p.label}
        </button>
      ))}
    </div>
  );
}

/**
 * Kepala halaman bergaya identitas UPI Kampus Tasikmalaya.
 * `ramping` dipakai pada halaman lanjutan yang isinya lebih penting daripada judul.
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

  return (
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

        <h1
          className={`mt-4 font-extrabold tracking-tight ${ramping ? 'text-xl' : 'text-2xl sm:text-3xl'}`}
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
  );
}
