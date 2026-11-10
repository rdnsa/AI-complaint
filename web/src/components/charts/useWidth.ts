import { useEffect, useRef, useState } from 'react';

/**
 * The rendered width of an element, kept current as it resizes. For charts
 * whose sizes are worked out in numbers rather than CSS classes (bubble sizes,
 * treemap proportions), so a phone gets a layout made for its width. 0 until
 * the first measurement.
 */
export function useWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState(0);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setWidth(el.getBoundingClientRect().width);
    if (typeof ResizeObserver !== 'function') return;
    const observer = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width));
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return [ref, width] as const;
}

/** Below this a chart is on a phone, or in a narrow column, and takes its compact form. */
export const NARROW = 480;
