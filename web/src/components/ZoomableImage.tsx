import { useState } from 'react';
import { useLanguage } from '../lib/i18n';
import ImageViewer from './ImageViewer';
import { ZoomGlyph } from './Marks';

/**
 * A photo thumbnail that opens full screen in the zoom viewer, on the same
 * page. The magnifier badge is always visible: a phone has no hover to hint
 * that the picture can be opened.
 *
 * `frameClassName` styles the tappable frame (margins, rings — a ring on the
 * image itself would be clipped by the frame's rounded corners); `className`
 * sizes the image.
 */
export default function ZoomableImage({
  src,
  alt = '',
  caption,
  className = '',
  frameClassName = '',
}: {
  src: string;
  alt?: string;
  caption: string;
  className?: string;
  frameClassName?: string;
}) {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-label={`${caption} — ${t('viewer.open')}`}
        className={`group relative block w-fit max-w-full cursor-zoom-in overflow-hidden rounded-xl ${frameClassName}`}
      >
        <img
          src={src}
          alt={alt}
          loading="lazy"
          className={`block transition-transform duration-300 group-hover:scale-[1.02] ${className}`}
        />
        <span
          aria-hidden
          className="absolute bottom-2 right-2 grid h-8 w-8 place-items-center rounded-full bg-black/55 text-white ring-1 ring-white/20 backdrop-blur-sm transition group-hover:bg-black/70"
        >
          <ZoomGlyph className="h-4 w-4" />
        </span>
      </button>
      {open && <ImageViewer src={src} alt={alt || caption} caption={caption} onClose={() => setOpen(false)} />}
    </>
  );
}
