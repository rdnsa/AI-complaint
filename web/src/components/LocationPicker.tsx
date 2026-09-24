import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api, type Building } from '../lib/api';
import { useLanguage } from '../lib/i18n';
import MapViewer from './MapViewer';
import { ZoomGlyph } from './Marks';

const MAP_SRC = '/peta-lokasi-gedung.jpg';

/**
 * The campus map and the building/floor picker, for when there is no QR at
 * hand. Students and staff each reach it from their own page, so `target`
 * decides where a floor leads (the complaint form or the staff floor page).
 */
export default function LocationPicker({ target }: { target: (code: string, floor: number) => string }) {
  const { t } = useLanguage();
  const [buildings, setBuildings] = useState<Building[]>([]);
  const [loading, setLoading] = useState(true);
  const [mapOpen, setMapOpen] = useState(false);

  useEffect(() => {
    api
      .locations()
      .then((r) => setBuildings(r.data))
      .catch(() => setBuildings([]))
      .finally(() => setLoading(false));
  }, []);

  return (
    <>
      <p className="mt-6 leading-relaxed text-maroon-700">{t('home.hint')}</p>

      {/* Full width on a phone; capped on desktop so the map does not push the picker off-screen. */}
      <figure className="card mx-auto mt-4 max-w-3xl overflow-hidden">
        <button
          type="button"
          onClick={() => setMapOpen(true)}
          aria-label={`${t('home.map_alt')} — ${t('home.map_enlarge')}`}
          className="group block w-full cursor-zoom-in overflow-hidden"
        >
          <img
            src={MAP_SRC}
            alt=""
            className="w-full transition-transform duration-300 group-hover:scale-[1.015]"
            loading="lazy"
          />
        </button>
        <figcaption className="flex items-center justify-between gap-3 border-t border-krem-200 bg-krem-50 px-4 py-2.5 text-xs text-maroon-600">
          <span>{t('home.map_caption')}</span>
          <button
            type="button"
            onClick={() => setMapOpen(true)}
            className="-my-2 flex shrink-0 items-center gap-1.5 py-2 font-bold text-bata-600 hover:text-bata-700"
          >
            <ZoomGlyph className="h-3.5 w-3.5" />
            {t('home.map_enlarge')}
          </button>
        </figcaption>
      </figure>

      {mapOpen && (
        <MapViewer
          src={MAP_SRC}
          alt={t('home.map_alt')}
          caption={t('home.map_caption')}
          onClose={() => setMapOpen(false)}
        />
      )}

      <h2 className="section-title mt-8">{t('home.choose_location')}</h2>

      {loading ? (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {[0, 1, 2, 3].map((i) => (
            <div key={i} className="card h-28 animate-pulse bg-krem-50" />
          ))}
        </div>
      ) : !buildings.length ? (
        <p className="card mt-3 p-8 text-center text-maroon-600">{t('home.empty')}</p>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {buildings.map((b) => (
            <section key={b.code} className="card p-4 transition hover:shadow-naik">
              <div className="flex items-center gap-3">
                {/* The building-code circle mimics the markers on the campus map poster. */}
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-full border-2 border-maroon-800 bg-bata-500 text-base font-extrabold text-white">
                  {b.code}
                </span>
                <div className="min-w-0">
                  <p className="text-[11px] font-bold uppercase tracking-wider text-bata-600">
                    {t('common.building', { code: b.code })}
                  </p>
                  <p className="truncate font-bold text-maroon-900">{b.name}</p>
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {b.floors.map((n) => (
                  <Link
                    key={n}
                    to={target(b.code, n)}
                    className="rounded-lg border border-krem-300 bg-krem-50 px-3.5 py-2 text-sm font-semibold text-maroon-700 transition hover:border-bata-400 hover:bg-bata-50 hover:text-bata-700"
                  >
                    {t('common.floor', { n })}
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
