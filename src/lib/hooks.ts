'use client';

import { useSyncExternalStore } from 'react';
import { todayISO } from './dates';

/* Browser-only values read through useSyncExternalStore: the server (and hydration) sees the
   server snapshot, then React switches to the real value — no hydration mismatch, no setState-in-effect. */

const noop = () => () => {};

/** Today's date (YYYY-MM-DD, visitor's local time); '' during server render / hydration. */
export function useToday(): string {
  return useSyncExternalStore(noop, todayISO, () => '');
}

/** true once running in the browser (e.g. for portals). */
export function useIsClient(): boolean {
  return useSyncExternalStore(noop, () => true, () => false);
}

/** Live media-query match; `fallback` on the server. */
export function useMediaQuery(query: string, fallback = false): boolean {
  return useSyncExternalStore(
    (cb) => {
      const mq = window.matchMedia(query);
      mq.addEventListener('change', cb);
      return () => mq.removeEventListener('change', cb);
    },
    () => window.matchMedia(query).matches,
    () => fallback,
  );
}

/** true after the window 'load' event (all images of the first view are in). */
export function usePageLoaded(): boolean {
  return useSyncExternalStore(
    (cb) => {
      window.addEventListener('load', cb);
      return () => window.removeEventListener('load', cb);
    },
    () => document.readyState === 'complete',
    () => false,
  );
}
