import { lazy, Suspense, useCallback, useEffect, useRef, useState, type PointerEvent } from 'react';
import { createPortal } from 'react-dom';
import { ChatGlyph } from './Marks';
import { useLanguage } from '../lib/i18n';

// The chat itself is fetched the first time the launcher is opened, not with the landing page.
const AskPanel = lazy(() => import('./AskPanel'));

const SIZE = 56; // the launcher, a circle
const MARGIN = 12; // never closer than this to the screen edge
const GAP = 12; // between the launcher and the window
const STORAGE_KEY = 'chat-anchor';

type Side = 'l' | 'r';
interface Point {
  x: number;
  y: number;
}

const clamp = (n: number, lo: number, hi: number) => Math.min(Math.max(n, lo), Math.max(lo, hi));

/**
 * Where the launcher rests. Dragged and let go, it stays exactly there (`x`, `y`);
 * once tapped it docks against the nearer side edge (`side`), and keeps hugging
 * that edge when the window is resized. Survives a reload.
 */
interface Anchor {
  side?: Side;
  x: number;
  y: number;
}

function savedAnchor(): Anchor {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null');
    if (s && typeof s.x === 'number' && typeof s.y === 'number') {
      return { side: s.side === 'l' || s.side === 'r' ? s.side : undefined, x: s.x, y: s.y };
    }
  } catch {
    /* storage blocked or corrupt: use the default */
  }
  return { side: 'r', x: 0, y: Number.MAX_SAFE_INTEGER }; // bottom right, once clamped
}

function saveAnchor(a: Anchor) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(a));
  } catch {
    /* ignore when storage is unavailable */
  }
}

/**
 * The AI chatbot as a floating launcher. Tap it to open a chat window beside it;
 * drag it anywhere and it stays where it is let go; pressing it docks it against
 * the nearer side edge. Mounted once for the whole app (main.tsx), so it is on every page.
 * The window follows the launcher, opens toward the side with more room, and can be
 * dragged by its title bar too. The conversation lives in the window, which
 * stays mounted while closed, so closing it does not lose the thread.
 */
export default function FloatingChat() {
  const { t } = useLanguage();
  const [open, setOpen] = useState(false);
  const [everOpened, setEverOpened] = useState(false);
  const [anchor, setAnchor] = useState(savedAnchor);
  const [drag, setDrag] = useState<Point | null>(null);
  const [, resized] = useState(0);

  const dragRef = useRef<Point | null>(null);
  const origin = useRef<{ px: number; py: number; x: number; y: number; slop: number; moved: boolean } | null>(null);

  useEffect(() => {
    const on = () => resized((n) => n + 1);
    window.addEventListener('resize', on);
    return () => window.removeEventListener('resize', on);
  }, []);

  useEffect(() => {
    if (!open) return;
    const key = (e: KeyboardEvent) => e.key === 'Escape' && setOpen(false);
    document.addEventListener('keydown', key);
    return () => document.removeEventListener('keydown', key);
  }, [open]);

  const W = window.innerWidth;
  const H = window.innerHeight;
  const rest: Point = {
    x:
      anchor.side === 'r'
        ? W - SIZE - MARGIN
        : anchor.side === 'l'
          ? MARGIN
          : clamp(anchor.x, MARGIN, W - SIZE - MARGIN),
    y: clamp(anchor.y, MARGIN, H - SIZE - MARGIN),
  };
  const pos = drag ?? rest;

  const press = useCallback(
    (e: PointerEvent<HTMLElement>) => {
      if ((e.target as HTMLElement).closest('button[data-nodrag]')) return;
      // A fingertip wobbles more than a mouse: a bigger dead zone keeps a tap a tap.
      origin.current = { px: e.clientX, py: e.clientY, x: pos.x, y: pos.y, slop: e.pointerType === 'touch' ? 10 : 5, moved: false };
      e.currentTarget.setPointerCapture(e.pointerId);
    },
    [pos.x, pos.y],
  );

  const move = useCallback((e: PointerEvent<HTMLElement>) => {
    const o = origin.current;
    if (!o) return;
    const dx = e.clientX - o.px;
    const dy = e.clientY - o.py;
    // A small wobble is still a tap.
    if (!o.moved && Math.hypot(dx, dy) < o.slop) return;
    o.moved = true;
    const next = {
      x: clamp(o.x + dx, MARGIN, window.innerWidth - SIZE - MARGIN),
      y: clamp(o.y + dy, MARGIN, window.innerHeight - SIZE - MARGIN),
    };
    dragRef.current = next;
    setDrag(next);
  }, []);

  /**
   * The finger or button comes up. A press that never became a drag is a tap on
   * the launcher, handled right here: a `click` event is not reliable after a
   * touch that moved a little, and a flag waiting to swallow one would swallow
   * the next real tap instead (the "needs two taps" bug).
   */
  function release(isLauncher: boolean) {
    const o = origin.current;
    origin.current = null;
    const p = dragRef.current;
    dragRef.current = null;
    if (!o) return;
    if (!o.moved || !p) {
      if (isLauncher) toggle();
      return;
    }
    // Let go anywhere: it stays there.
    const next: Anchor = { x: p.x, y: p.y };
    setAnchor(next);
    setDrag(null);
    saveAnchor(next);
  }

  function cancel() {
    origin.current = null;
    dragRef.current = null;
    setDrag(null);
  }

  function toggle() {
    // Pressing it is what docks it: against whichever side edge is nearer.
    const side: Side = pos.x + SIZE / 2 < W / 2 ? 'l' : 'r';
    const docked: Anchor = { side, x: pos.x, y: pos.y };
    setAnchor(docked);
    saveAnchor(docked);
    setEverOpened(true);
    setOpen((o) => !o);
  }

  // The window sits beside the launcher, toward whichever side has more room.
  const width = Math.min(390, W - MARGIN * 2);
  const above = pos.y - MARGIN - GAP;
  const below = H - (pos.y + SIZE) - MARGIN - GAP;
  const placeAbove = above >= below;
  const height = Math.min(580, Math.max(placeAbove ? above : below, 320), H - MARGIN * 2);
  const top = clamp(placeAbove ? pos.y - GAP - height : pos.y + SIZE + GAP, MARGIN, H - height - MARGIN);
  const onRight = pos.x + SIZE / 2 >= W / 2;
  const left = clamp(onRight ? pos.x + SIZE - width : pos.x, MARGIN, W - width - MARGIN);

  const settle = drag ? undefined : 'left .3s cubic-bezier(0.22, 1, 0.36, 1), top .3s cubic-bezier(0.22, 1, 0.36, 1)';

  return createPortal(
    <>
      <section
        role="dialog"
        aria-label={t('ask.title')}
        aria-hidden={!open}
        className="glass fixed z-50 flex flex-col overflow-hidden rounded-card print:hidden"
        style={{
          position: 'fixed',
          left,
          top,
          width,
          height,
          opacity: open ? 1 : 0,
          visibility: open ? 'visible' : 'hidden',
          pointerEvents: open ? 'auto' : 'none',
          transform: open ? 'none' : 'translateY(10px) scale(0.96)',
          transformOrigin: `${onRight ? 'right' : 'left'} ${placeAbove ? 'bottom' : 'top'}`,
          transition: `opacity .2s, transform .25s cubic-bezier(0.22, 1, 0.36, 1), visibility .25s, ${settle ?? 'none'}`,
        }}
      >
        {/* The title bar moves the whole thing, launcher and window together. */}
        <header
          className="flex cursor-grab touch-none select-none items-center gap-2 border-b border-white/40 px-4 py-3 active:cursor-grabbing dark:border-white/10"
          onPointerDown={press}
          onPointerMove={move}
          onPointerUp={() => release(false)}
          onPointerCancel={cancel}
        >
          <ChatGlyph className="h-5 w-5" />
          <h2 className="section-title">{t('ask.title')}</h2>
          <button
            type="button"
            data-nodrag
            onClick={() => setOpen(false)}
            aria-label={t('ask.close')}
            className="ml-auto grid h-8 w-8 place-content-center rounded-full text-ink-600 transition hover:bg-mist-100 hover:text-ink-900"
          >
            <svg viewBox="0 0 20 20" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round">
              <path d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </header>
        <div className="min-h-0 flex-1">
          {everOpened && (
            <Suspense fallback={<p className="p-4 text-sm text-ink-600">{t('common.loading')}</p>}>
              <AskPanel />
            </Suspense>
          )}
        </div>
      </section>

      <button
        type="button"
        aria-label={open ? t('ask.close') : t('ask.open')}
        aria-expanded={open}
        // Pointer taps are handled on pointer-up; a click with no pointer behind it
        // (detail 0) is the keyboard: Enter or Space.
        onClick={(e) => e.detail === 0 && toggle()}
        onPointerDown={press}
        onPointerMove={move}
        onPointerUp={() => release(true)}
        onPointerCancel={cancel}
        // Liquid glass like every other surface (design.md): the page blurs behind it and
        // the specular rim catches the light; the only colour is the accent chat bubbles.
        className="glass fixed z-50 grid touch-none print:hidden select-none place-content-center rounded-full outline-none transition-transform [@media(hover:hover)]:hover:scale-105 focus-visible:ring-2 focus-visible:ring-accent-500 active:scale-95"
        style={{
          position: 'fixed',
          left: pos.x,
          top: pos.y,
          width: SIZE,
          height: SIZE,
          cursor: drag ? 'grabbing' : 'grab',
          transition: settle,
        }}
      >
        {open ? (
          <svg viewBox="0 0 20 20" className="h-5 w-5 text-ink-900" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M5 5l10 10M15 5L5 15" />
          </svg>
        ) : (
          <ChatGlyph className="h-8 w-8 drop-shadow-[0_2px_6px_rgb(var(--accent-500)/0.45)]" />
        )}
      </button>
    </>,
    document.body,
  );
}
