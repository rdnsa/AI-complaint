import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Gedung } from '../lib/api';
import { useBahasa } from '../lib/i18n';

/**
 * The campus map and the building/floor picker, for when there is no QR at
 * hand. Students and staff each reach it from their own page, so `tujuan`
 * decides where a floor leads (the complaint form or the staff floor page).
 */
export default function PilihLokasi({ tujuan }: { tujuan: (kode: string, lantai: number) => string }) {
  const { t } = useBahasa();
  const [gedung, setGedung] = useState<Gedung[]>([]);
  const [memuat, setMemuat] = useState(true);

  useEffect(() => {
    api
      .daftarGedung()
      .then((r) => setGedung(r.data))
      .catch(() => setGedung([]))
      .finally(() => setMemuat(false));
  }, []);

  return (
    <>
      <p className="mt-6 leading-relaxed text-maroon-700">{t('beranda.petunjuk')}</p>

      {/* Full width on a phone; capped on desktop so the map does not push the picker off-screen. */}
      <figure className="kartu mx-auto mt-4 max-w-3xl overflow-hidden">
        <a href="/peta-lokasi-gedung.jpg" target="_blank" rel="noreferrer" className="block">
          <img
            src="/peta-lokasi-gedung.jpg"
            alt={t('beranda.peta_alt')}
            className="w-full"
            loading="lazy"
          />
        </a>
        <figcaption className="flex items-center justify-between gap-3 border-t border-krem-200 bg-krem-50 px-4 py-2.5 text-xs text-maroon-600">
          <span>{t('beranda.peta_keterangan')}</span>
          <span className="shrink-0 font-bold text-bata-600">{t('beranda.peta_perbesar')}</span>
        </figcaption>
      </figure>

      <h2 className="judul-bagian mt-8">{t('beranda.pilih')}</h2>

      {memuat ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="kartu h-28 animate-pulse bg-krem-50" />
          ))}
        </div>
      ) : !gedung.length ? (
        <p className="kartu mt-3 p-8 text-center text-maroon-600">{t('beranda.kosong')}</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {gedung.map((g) => (
            <section key={g.kode} className="kartu p-4 transition hover:shadow-naik">
              <div className="flex items-center gap-3">
                {/* Lingkaran kode gedung meniru penanda pada poster peta kampus. */}
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-maroon-800 bg-bata-500 text-base font-extrabold text-white">
                  {g.kode}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-bata-600">
                    {t('umum.gedung', { kode: g.kode })}
                  </p>
                  <p className="truncate font-bold text-maroon-900">{g.nama}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {g.lantai.map((n) => (
                  <Link
                    key={n}
                    to={tujuan(g.kode, n)}
                    className="rounded-lg border border-krem-300 bg-krem-50 px-3.5 py-2 text-sm font-semibold text-maroon-700 transition hover:border-bata-400 hover:bg-bata-50 hover:text-bata-700"
                  >
                    {t('umum.lantai', { n })}
                  </Link>
                ))}
              </div>
            </section>
          ))}
        </div>
      )}
    </>
  );
}
