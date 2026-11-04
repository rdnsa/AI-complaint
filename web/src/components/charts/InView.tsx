import { useEffect, useRef, useState, type ReactNode } from 'react';
import { observe } from '../../lib/motion';
import { ChartGate } from './motion';

/**
 * Holds the charts inside it at their starting point until they are on screen,
 * so a chart far down the page plays when it arrives instead of unseen at load.
 * Leaving the screen rewinds it, the same way the tiles' own reveal replays.
 */
export default function InView({ children, className }: { children: ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    return observe(ref.current, (entry) => setVisible(entry.isIntersecting), '0px 0px -8% 0px');
  }, []);

  return (
    <div ref={ref} className={className}>
      <ChartGate.Provider value={visible}>{children}</ChartGate.Provider>
    </div>
  );
}
