import { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import ImageViewer from './ImageViewer';
import { ZoomGlyph } from './Marks';

const MAP_SRC = '/peta-lokasi-gedung.jpg';

/**
 * The campus map above the location picker on the reporter and staff pages:
 * a glance at where each lettered building is. Tapping opens it full screen.
 */
export default function CampusMap() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <figure className="card mt-6 overflow-hidden">
        <button
          type="button"
          onClick={() => setOpen(true)}
          aria-label={`${t('map.alt')} — ${t('map.enlarge')}`}
          className="group block w-full cursor-zoom-in overflow-hidden"
        >
          <img
            src={MAP_SRC}
            alt=""
            width={1600}
            height={981}
            className="h-auto w-full transition-transform duration-500 group-hover:scale-[1.02]"
            loading="lazy"
            decoding="async"
          />
        </button>
        <figcaption className="flex items-center justify-between gap-3 px-4 py-2.5 text-xs text-ink-600">
          <span>{t('map.caption')}</span>
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="-my-2 flex shrink-0 items-center gap-1.5 py-2 font-bold text-accent-600 hover:text-accent-700"
          >
            <ZoomGlyph className="h-3.5 w-3.5" />
            {t('map.enlarge')}
          </button>
        </figcaption>
      </figure>

      {open && <ImageViewer src={MAP_SRC} alt={t('map.alt')} caption={t('map.caption')} onClose={() => setOpen(false)} />}
    </>
  );
}
