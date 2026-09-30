'use client';

import { usePathname, useRouter } from 'next/navigation';
import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from 'react';

/* The emblem curtain:
   - first visit: <head> script adds html.mk-intro and the emblem draws itself (CSS), then the curtain lifts
   - page change: the curtain drops, we navigate, and it lifts once the new route has committed */

type Phase = 'cover' | 'out' | 'leaving';
const CurtainContext = createContext<{ navigate: (href: string) => boolean }>({ navigate: () => false });
export const useCurtain = () => useContext(CurtainContext);

const LEAVE_MS = 650;

function revealPage() {
  document.documentElement.classList.add('is-loaded');
  document.querySelectorAll('.hero h1, .page-hero h1').forEach((h) => h.classList.add('is-split-in'));
  window.dispatchEvent(new Event('mk:revealed'));
}

export function CurtainProvider({ emblem, children }: { emblem: ReactNode; children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const [phase, setPhase] = useState<Phase>('cover');
  const pending = useRef<string | null>(null);
  const timers = useRef<number[]>([]);

  const later = (fn: () => void, ms: number) => {
    timers.current.push(window.setTimeout(fn, ms));
  };

  // ---- first load: lift after the intro (first visit) or as soon as the page is ready
  useEffect(() => {
    window.__mkReady = true;
    const root = document.documentElement;
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (reduce || !root.classList.contains('js')) {
      const id = window.setTimeout(() => {
        setPhase('out');
        revealPage();
      }, 0);
      return () => clearTimeout(id);
    }
    const first = root.classList.contains('mk-intro');
    // measured from the start of navigation, not from hydration
    const minWait = first ? 2000 : 320;
    const maxWait = first ? 3400 : 1600;
    let lifted = false;
    const ids: number[] = [];
    const lift = () => {
      if (lifted) return;
      lifted = true;
      ids.push(window.setTimeout(() => {
        setPhase('out');
        ids.push(window.setTimeout(revealPage, 200));
      }, Math.max(0, minWait - performance.now())));
    };
    if (document.readyState === 'complete') lift();
    else window.addEventListener('load', lift, { once: true });
    ids.push(window.setTimeout(lift, Math.max(0, maxWait - performance.now())));
    return () => {
      ids.forEach(clearTimeout);
      window.removeEventListener('load', lift);
    };
  }, []);

  // ---- page change: called by <TLink>; returns true when it takes over the navigation
  const navigate = useCallback(
    (href: string) => {
      const url = new URL(href, window.location.href);
      if (url.origin !== window.location.origin) return false;
      if (url.pathname === window.location.pathname) return false; // same page: let the hash/search change happen
      if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return false;
      if (pending.current) return true; // already on the way
      const root = document.documentElement;
      root.classList.remove('mk-intro'); // later covers show the finished emblem, not the draw-in
      pending.current = url.pathname;
      setPhase('leaving');
      later(() => {
        root.classList.remove('is-loaded'); // so the next page's hero plays its intro
        router.push(url.pathname + url.search + url.hash);
      }, LEAVE_MS);
      // failsafe: never leave the visitor stuck behind the curtain
      later(() => {
        if (!pending.current) return;
        pending.current = null;
        setPhase('out');
        revealPage();
      }, 6000);
      return true;
    },
    [router],
  );

  // ---- arrival: the new route has committed
  useEffect(() => {
    if (!pending.current || pathname !== pending.current) return;
    pending.current = null;
    const t1 = window.setTimeout(() => {
      setPhase('out');
      window.setTimeout(revealPage, 200);
    }, 350);
    return () => clearTimeout(t1);
  }, [pathname]);

  useEffect(() => () => timers.current.forEach(clearTimeout), []);

  const cls = `curtain${phase === 'out' ? ' is-out' : ''}${phase === 'leaving' ? ' is-leaving' : ''}`;

  return (
    <CurtainContext.Provider value={{ navigate }}>
      <div className={cls} aria-hidden="true">
        <div className="curtain__inner">
          {emblem}
          <div className="curtain__meta">
            <span className="curtain__tag">Airport View · Manthali</span>
            <span className="curtain__line" />
          </div>
        </div>
      </div>
      {children}
    </CurtainContext.Provider>
  );
}
