import { useEffect, useRef, useState } from 'react';
import { useLanguage } from '../lib/i18n';

/**
 * A live camera shown inside the page, for every photo the app accepts.
 *
 * A plain `<input type="file" capture>` is only a hint: many Android browsers,
 * every desktop browser, and some in-app WebViews still offer the gallery, so
 * an old or downloaded photo could be passed off as a fresh one. Taking the
 * frame straight from `getUserMedia` leaves no gallery to pick from. There is
 * deliberately no file-picker fallback: without a camera, no photo.
 *
 * The frame is scaled down and encoded as JPEG here, which also keeps every
 * upload well under the 5 MB server limit.
 */

const MAX_SIDE = 1600;
const JPEG_QUALITY = 0.85;

type CameraError = 'denied' | 'not_found' | 'insecure' | 'failed';

export default function Camera({
  open,
  onClose,
  onCapture,
}: {
  open: boolean;
  onClose: () => void;
  onCapture: (photo: File) => void;
}) {
  const { t } = useLanguage();
  const video = useRef<HTMLVideoElement>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<CameraError | null>(null);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!open) return;
    setReady(false);
    setError(null);

    // The camera API only exists on HTTPS (and localhost).
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setError('insecure');
      return;
    }

    let stream: MediaStream | null = null;
    let cancelled = false;

    navigator.mediaDevices
      .getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
        audio: false,
      })
      .then(async (s) => {
        if (cancelled) return s.getTracks().forEach((tr) => tr.stop());
        stream = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (cancelled) return;
        const name = err instanceof DOMException ? err.name : '';
        setError(
          name === 'NotAllowedError' || name === 'SecurityError'
            ? 'denied'
            : name === 'NotFoundError' || name === 'OverconstrainedError'
              ? 'not_found'
              : 'failed',
        );
      });

    // Releasing the tracks is what turns the camera light off again.
    return () => {
      cancelled = true;
      stream?.getTracks().forEach((tr) => tr.stop());
    };
  }, [open, attempt]);

  // Closing on Escape, and no page scroll behind the overlay.
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', onKey);
    return () => {
      document.body.style.overflow = previous;
      window.removeEventListener('keydown', onKey);
    };
  }, [open, onClose]);

  function capture() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const scale = Math.min(1, MAX_SIDE / Math.max(v.videoWidth, v.videoHeight));
    const canvas = document.createElement('canvas');
    canvas.width = Math.round(v.videoWidth * scale);
    canvas.height = Math.round(v.videoHeight * scale);
    canvas.getContext('2d')?.drawImage(v, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) return setError('failed');
        onCapture(new File([blob], `photo-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onClose();
      },
      'image/jpeg',
      JPEG_QUALITY,
    );
  }

  if (!open) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('camera.title')}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
    >
      <div className="relative min-h-0 flex-1">
        <video
          ref={video}
          playsInline
          muted
          onLoadedData={() => setReady(true)}
          className="h-full w-full object-contain"
        />

        {!ready && !error && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/80">
            {t('camera.starting')}
          </p>
        )}

        {error && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-sm text-center">
              <p className="font-bold">{t('camera.error_title')}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{t(`camera.error_${error}`)}</p>
              {error !== 'insecure' && (
                <button
                  type="button"
                  onClick={() => setAttempt((n) => n + 1)}
                  className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/30"
                >
                  {t('camera.retry')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={onClose}
          className="w-20 rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:text-white"
        >
          {t('camera.close')}
        </button>
        <button
          type="button"
          onClick={capture}
          disabled={!ready || !!error}
          aria-label={t('camera.capture')}
          className="grid h-[72px] w-[72px] place-items-center rounded-full ring-4 ring-white/80 transition active:scale-95 disabled:opacity-40"
        >
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
        <span className="w-20" />
      </div>
    </div>
  );
}
