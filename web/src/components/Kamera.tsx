import { useEffect, useRef, useState } from 'react';
import { useBahasa } from '../lib/i18n';

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

const SISI_MAKS = 1600;
const MUTU_JPEG = 0.85;

type Galat = 'ditolak' | 'tidak_ada' | 'tidak_aman' | 'gagal';

export default function Kamera({
  buka,
  onTutup,
  onAmbil,
}: {
  buka: boolean;
  onTutup: () => void;
  onAmbil: (foto: File) => void;
}) {
  const { t } = useBahasa();
  const video = useRef<HTMLVideoElement>(null);
  const [siap, setSiap] = useState(false);
  const [galat, setGalat] = useState<Galat | null>(null);
  const [mencoba, setMencoba] = useState(0);

  useEffect(() => {
    if (!buka) return;
    setSiap(false);
    setGalat(null);

    // The camera API only exists on HTTPS (and localhost).
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      setGalat('tidak_aman');
      return;
    }

    let aliran: MediaStream | null = null;
    let batal = false;

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
        if (batal) return s.getTracks().forEach((tr) => tr.stop());
        aliran = s;
        if (video.current) {
          video.current.srcObject = s;
          await video.current.play().catch(() => {});
        }
      })
      .catch((err: unknown) => {
        if (batal) return;
        const nama = err instanceof DOMException ? err.name : '';
        setGalat(
          nama === 'NotAllowedError' || nama === 'SecurityError'
            ? 'ditolak'
            : nama === 'NotFoundError' || nama === 'OverconstrainedError'
              ? 'tidak_ada'
              : 'gagal',
        );
      });

    // Releasing the tracks is what turns the camera light off again.
    return () => {
      batal = true;
      aliran?.getTracks().forEach((tr) => tr.stop());
    };
  }, [buka, mencoba]);

  // Closing on Escape, and no page scroll behind the overlay.
  useEffect(() => {
    if (!buka) return;
    const tombol = (e: KeyboardEvent) => e.key === 'Escape' && onTutup();
    const semula = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    window.addEventListener('keydown', tombol);
    return () => {
      document.body.style.overflow = semula;
      window.removeEventListener('keydown', tombol);
    };
  }, [buka, onTutup]);

  function jepret() {
    const v = video.current;
    if (!v || !v.videoWidth) return;
    const skala = Math.min(1, SISI_MAKS / Math.max(v.videoWidth, v.videoHeight));
    const kanvas = document.createElement('canvas');
    kanvas.width = Math.round(v.videoWidth * skala);
    kanvas.height = Math.round(v.videoHeight * skala);
    kanvas.getContext('2d')?.drawImage(v, 0, 0, kanvas.width, kanvas.height);
    kanvas.toBlob(
      (blob) => {
        if (!blob) return setGalat('gagal');
        onAmbil(new File([blob], `foto-${Date.now()}.jpg`, { type: 'image/jpeg' }));
        onTutup();
      },
      'image/jpeg',
      MUTU_JPEG,
    );
  }

  if (!buka) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={t('kamera.judul')}
      className="fixed inset-0 z-[60] flex flex-col bg-black text-white"
    >
      <div className="relative min-h-0 flex-1">
        <video
          ref={video}
          playsInline
          muted
          onLoadedData={() => setSiap(true)}
          className="h-full w-full object-contain"
        />

        {!siap && !galat && (
          <p className="absolute inset-0 grid place-items-center text-sm text-white/80">
            {t('kamera.memulai')}
          </p>
        )}

        {galat && (
          <div className="absolute inset-0 grid place-items-center p-6">
            <div className="max-w-sm text-center">
              <p className="font-bold">{t('kamera.galat_judul')}</p>
              <p className="mt-2 text-sm leading-relaxed text-white/80">{t(`kamera.galat_${galat}`)}</p>
              {galat !== 'tidak_aman' && (
                <button
                  type="button"
                  onClick={() => setMencoba((n) => n + 1)}
                  className="mt-4 rounded-lg bg-white/15 px-4 py-2 text-sm font-bold ring-1 ring-white/30"
                >
                  {t('kamera.coba_lagi')}
                </button>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex items-center justify-between gap-4 px-6 pb-[max(1.25rem,env(safe-area-inset-bottom))] pt-4">
        <button
          type="button"
          onClick={onTutup}
          className="w-20 rounded-lg px-3 py-2 text-sm font-semibold text-white/85 hover:text-white"
        >
          {t('kamera.tutup')}
        </button>
        <button
          type="button"
          onClick={jepret}
          disabled={!siap || !!galat}
          aria-label={t('kamera.jepret')}
          className="grid h-[72px] w-[72px] place-items-center rounded-full ring-4 ring-white/80 transition active:scale-95 disabled:opacity-40"
        >
          <span className="h-14 w-14 rounded-full bg-white" />
        </button>
        <span className="w-20" />
      </div>
    </div>
  );
}
