import { useEffect, useRef, type CSSProperties, type ReactNode, type RefObject } from 'react';

/**
 * Scroll-driven motion, modelled on radenissa.pages.dev.
 *
 * Everything here only toggles attributes or CSS variables; the movement itself
 * lives in index.css (`.reveal`, `.anim-*`), so it can be turned
 * off in one place for people who ask for reduced motion.
 */

/* ------------------------------------------------------------ shared observer */

type Callback = (entry: IntersectionObserverEntry) => void;
const observers = new Map<string, { observer: IntersectionObserver; callbacks: Map<Element, Callback> }>();

/** One IntersectionObserver per root margin, shared by every element that uses it. */
function observe(el: Element, cb: Callback, rootMargin = '0px') {
  let entry = observers.get(rootMargin);
  if (!entry) {
    const callbacks = new Map<Element, Callback>();
    const observer = new IntersectionObserver((items) => items.forEach((i) => callbacks.get(i.target)?.(i)), {
      rootMargin,
    });
    entry = { observer, callbacks };
    observers.set(rootMargin, entry);
  }
  entry.callbacks.set(el, cb);
  entry.observer.observe(el);
  const { observer, callbacks } = entry;
  return () => {
    observer.unobserve(el);
    callbacks.delete(el);
  };
}

/* ------------------------------------------------------------------- Reveal */

/**
 * Fades its content up into place when it scrolls into view, and out again
 * when it leaves, so scrolling back up replays it from the right side.
 * With `stagger`, each direct child arrives 70 ms after the one before.
 */
export function Reveal({
  children,
  className = '',
  delay = 0,
  stagger = false,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  /** Extra wait before the reveal starts, in milliseconds. */
  delay?: number;
  stagger?: boolean;
  as?: 'div' | 'section' | 'ul' | 'ol';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (stagger) {
      const kids = [...el.children] as HTMLElement[];
      el.style.setProperty('--n', String(kids.length));
      kids.forEach((k, i) => k.style.setProperty('--i', String(i)));
    }
    return observe(
      el,
      (entry) => {
        const from = entry.boundingClientRect.top < 0 ? 'above' : 'below';
        if (!entry.isIntersecting) {
          delete el.dataset.visible;
          el.dataset.from = from;
          return;
        }
        // Entering from the other side than last time: jump to that side
        // without a transition first, so the element does not fly across.
        if ((el.dataset.from ?? 'below') !== from) {
          el.dataset.snap = '';
          el.dataset.from = from;
          void el.offsetWidth;
          delete el.dataset.snap;
        }
        el.dataset.visible = '';
      },
      '0px 0px -8% 0px',
    );
  }, [stagger]);

  const style = delay ? ({ '--reveal-delay': `${delay}ms` } as CSSProperties) : undefined;
  const Component = Tag as 'div';
  return (
    <Component ref={ref as RefObject<HTMLDivElement>} className={`${stagger ? 'reveal-stagger' : 'reveal'} ${className}`} style={style}>
      {children}
    </Component>
  );
}

/** Inline style that delays a one-shot entrance animation (`.anim-*`). */
export const delay = (ms: number): CSSProperties => ({ animationDelay: `${ms}ms` });

/* ----------------------------------------------------------- scroll progress */

const listeners = new Set<() => void>();
let frame = 0;
const tick = () => {
  frame = 0;
  listeners.forEach((l) => l());
};
const schedule = () => {
  frame ||= requestAnimationFrame(tick);
};

function onScrollFrame(fn: () => void) {
  if (listeners.size === 0) {
    window.addEventListener('scroll', schedule, { passive: true });
    window.addEventListener('resize', schedule);
  }
  listeners.add(fn);
  fn();
  return () => {
    listeners.delete(fn);
    if (listeners.size === 0) {
      window.removeEventListener('scroll', schedule);
      window.removeEventListener('resize', schedule);
      cancelAnimationFrame(frame);
      frame = 0;
    }
  };
}

const clamp01 = (n: number) => Math.min(1, Math.max(0, n));

/**
 * Writes a 0–1 progress value into a CSS variable on the element on every
 * animation frame while scrolling. `measure` turns the element's box into
 * that value; CSS does the rest.
 */
export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  measure: (rect: DOMRect, viewport: number) => number,
  variable = '--p',
) {
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    let last = -1;
    return onScrollFrame(() => {
      const p = Math.round(clamp01(measure(el.getBoundingClientRect(), window.innerHeight)) * 1000) / 1000;
      if (p !== last) {
        el.style.setProperty(variable, String(p));
        last = p;
      }
    });
  }, [ref, measure, variable]);
}

/** Progress of the whole page, 0 at the top and 1 at the bottom. */
export const pageProgress = () =>
  window.scrollY / Math.max(1, document.documentElement.scrollHeight - window.innerHeight);
