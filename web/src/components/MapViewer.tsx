import { useCallback, useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react';
import { createPortal } from 'react-dom';
import { useLanguage } from '../lib/i18n';
import { CloseGlyph, MinusGlyph, PlusGlyph } from './Marks';

const MIN_SCALE = 1;
const MAX_SCALE = 5;
/** Where a double tap takes a map that is not zoomed yet. */
const DOUBLE_TAP_SCALE = 2.5;
const DOUBLE_TAP_MS = 300;
/** How far a finger may drift before a tap counts as a drag. */
const TAP_SLOP = 6;

type View = { s: number; x: number; y: number };
type Point = { x: number; y: number };

const START: View = { s: 1, x: 0, y: 0 };

/**
 * The campus map, full screen, on the same page. Pinch, scroll or double-tap to
 * zoom; drag to move around. Opening the JPEG in a new tab lost the page and,
 * on a phone, often the way back to it.
 */
export default function MapViewer({
  src,
  alt,
  caption,
  onClose,
}: {
  src: string;
  alt: string;
  caption: string;
  onClose: () => void;
}) {
  const { t } = useLanguage();
  const stage = useRef<HTMLDivElement>(null);
  const image = useRef<HTMLImageElement>(null);
  const closeButton = useRef<HTMLButtonElement>(null);
  const [view, setView] = useState<View>(START);
  // Animate only the jumps (buttons, double tap); a finger must be followed instantly.
  const [animate, setAnimate] = useState(false);

  const pointers = useRef(new Map<number, Point>());
  const pinch = useRef<{ dist: number; mid: Point } | null>(null);
  const travelled = useRef(0);
  const lastTap = useRef(0);

  /** Keep the scale in range and the map from being dragged off the screen. */
  const clamp = useCallback((v: View): View => {
    const st = stage.current;
    const im = image.current;
    const s = Math.min(MAX_SCALE, Math.max(MIN_SCALE, v.s));
    if (!st || !im) return { ...v, s };
    const maxX = Math.max(0, (im.offsetWidth * s - st.clientWidth) / 2);
    const maxY = Math.max(0, (im.offsetHeight * s - st.clientHeight) / 2);
    return { s, x: Math.min(maxX, Math.max(-maxX, v.x)), y: Math.min(maxY, Math.max(-maxY, v.y)) };
  }, []);

  /** Zoom to scale `s` while the map point under (cx, cy) stays under it. */
  const zoomAt = useCallback(
    (from: View, s: number, cx: number, cy: number): View => {
      const r = stage.current?.getBoundingClientRect();
      if (!r) return from;
      const px = cx - (r.left + r.width / 2);
      const py = cy - (r.top + r.height / 2);
      const next = Math.min(MAX_SCALE, Math.max(MIN_SCALE, s));
      const k = next / from.s;
      return clamp({ s: next, x: px - k * (px - from.x), y: py - k * (py - from.y) });
    },
    [clamp],
  );

  const zoomFromCentre = (factor: number) => {
    const r = stage.current?.getBoundingClientRect();
    if (!r) return;
    setAnimate(true);
    setView((v) => zoomAt(v, v.s * factor, r.left + r.width / 2, r.top + r.height / 2));
  };

  // Lock the page behind, close on Escape, and hand focus back where it came from.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    const overflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    closeButton.current?.focus();

    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === '+' || e.key === '=') zoomFromCentre(1.6);
      if (e.key === '-') zoomFromCentre(1 / 1.6);
    };
    const onResize = () => setView((v) => clamp(v));
    window.addEventListener('keydown', onKey);
    window.addEventListener('resize', onResize);
    return () => {
      document.body.style.overflow = overflow;
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('resize', onResize);
      opener?.focus();
    };
    // Once per opening: everything used inside reads refs or updates state functionally.
  }, []);

  function onPointerDown(e: PointerEvent<HTMLDivElement>) {
    e.currentTarget.setPointerCapture(e.pointerId);
    pointers.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    setAnimate(false);
    if (pointers.current.size === 1) travelled.current = 0;
    if (pointers.current.size === 2) {
      const [a, b] = [...pointers.current.values()];
      pinch.current = { dist: Math.hypot(a.x - b.x, a.y - b.y), mid: { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 } };
      travelled.current = Infinity; // a pinch is never a tap
    }
  }

  function onPointerMove(e: PointerEvent<HTMLDivElement>) {
    const prev = pointers.current.get(e.pointerId);
    if (!prev) return;
    const now = { x: e.clientX, y: e.clientY };
    pointers.current.set(e.pointerId, now);

    if (pointers.current.size >= 2 && pinch.current) {
      const [a, b] = [...pointers.current.values()];
      const dist = Math.hypot(a.x - b.x, a.y - b.y);
      const mid = { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 };
      const p = pinch.current;
      setView((v) => {
        const z = zoomAt(v, (v.s * dist) / p.dist, mid.x, mid.y);
        return clamp({ ...z, x: z.x + mid.x - p.mid.x, y: z.y + mid.y - p.mid.y });
      });
      pinch.current = { dist, mid };
      return;
    }

    const dx = now.x - prev.x;
    const dy = now.y - prev.y;
    travelled.current += Math.abs(dx) + Math.abs(dy);
    setView((v) => clamp({ ...v, x: v.x + dx, y: v.y + dy }));
  }

  function onPointerUp(e: PointerEvent<HTMLDivElement>) {
    if (!pointers.current.delete(e.pointerId)) return;
    if (pointers.current.size < 2) pinch.current = null;
    if (pointers.current.size > 0 || travelled.current > TAP_SLOP) return;

    // A tap. Two in quick succession zoom in on that spot, or back out.
    const at = Date.now();
    if (at - lastTap.current < DOUBLE_TAP_MS) {
      lastTap.current = 0;
      setAnimate(true);
      setView((v) => (v.s > MIN_SCALE ? START : zoomAt(v, DOUBLE_TAP_SCALE, e.clientX, e.clientY)));
    } else {
      lastTap.current = at;
    }
  }

  function onWheel(e: WheelEvent<HTMLDivElement>) {
    setAnimate(false);
    const factor = Math.exp(-e.deltaY * 0.0015);
    setView((v) => zoomAt(v, v.s * factor, e.clientX, e.clientY));
  }

  const zoomed = view.s > MIN_SCALE;

  return createPortal(
    <div role="dialog" aria-modal="true" aria-label={alt} className="fixed inset-0 z-[60] flex flex-col bg-[#1a0f0c]">
      <div className="flex items-center gap-3 px-4 py-3">
        <p className="min-w-0 flex-1 truncate text-sm font-semibold text-tetap-krem">{caption}</p>
        <button
          ref={closeButton}
          type="button"
          onClick={onClose}
          aria-label={t('home.map_close')}
          title={t('home.map_close')}
          className="grid h-10 w-10 shrink-0 place-items-center rounded-full bg-white/10 text-white ring-1 ring-white/20 transition hover:bg-white/20"
        >
          <CloseGlyph className="h-5 w-5" />
        </button>
      </div>

      <div
        ref={stage}
        className={`relative flex flex-1 touch-none select-none items-center justify-center overflow-hidden ${
          zoomed ? 'cursor-grab active:cursor-grabbing' : 'cursor-zoom-in'
        }`}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onWheel={onWheel}
      >
        <img
          ref={image}
          src={src}
          alt={alt}
          draggable={false}
          className="max-h-full max-w-full"
          style={{
            transform: `translate3d(${view.x}px, ${view.y}px, 0) scale(${view.s})`,
            transition: animate ? 'transform 220ms cubic-bezier(.2,.8,.2,1)' : 'none',
          }}
        />
      </div>

      <div className="flex flex-col items-center gap-2 px-4 pb-[max(1rem,env(safe-area-inset-bottom))] pt-3">
        <div className="flex items-center gap-1 rounded-full bg-white/10 p-1 text-white ring-1 ring-white/20">
          <button
            type="button"
            onClick={() => zoomFromCentre(1 / 1.6)}
            disabled={!zoomed}
            aria-label={t('home.map_zoom_out')}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-35"
          >
            <MinusGlyph />
          </button>
          <span className="w-12 text-center text-xs font-bold tabular-nums" aria-live="polite">
            {Math.round(view.s * 100)}%
          </span>
          <button
            type="button"
            onClick={() => zoomFromCentre(1.6)}
            disabled={view.s >= MAX_SCALE}
            aria-label={t('home.map_zoom_in')}
            className="grid h-9 w-9 place-items-center rounded-full transition hover:bg-white/15 disabled:opacity-35"
          >
            <PlusGlyph />
          </button>
        </div>
        <p className="text-center text-xs text-white/60">{t('home.map_hint')}</p>
      </div>
    </div>,
    document.body,
  );
}
