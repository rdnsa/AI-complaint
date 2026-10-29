import { useEffect } from 'react';

/**
 * Runs `fn` now and then every `ms`, but only while the page is on screen: a
 * dashboard left in a background tab asks the server for nothing, and refreshes
 * the moment it is looked at again. `fn` should be stable (useCallback); a new
 * one starts the cycle over with an immediate run, which is how a changed filter
 * reloads. Pass `enabled: false` for a view that is not showing.
 */
export function usePolling(fn: () => unknown, ms: number, enabled = true): void {
  useEffect(() => {
    if (!enabled) return;
    const tick = () => {
      if (!document.hidden) void fn();
    };
    tick();
    const timer = window.setInterval(tick, ms);
    document.addEventListener('visibilitychange', tick);
    return () => {
      window.clearInterval(timer);
      document.removeEventListener('visibilitychange', tick);
    };
  }, [fn, ms, enabled]);
}
