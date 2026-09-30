/** Page scroll lock shared by the mobile menu and the photo viewer.
 *  Locks <html> (body overflow doesn't reach the viewport while html has overflow-x: clip)
 *  and pauses Lenis smooth scrolling when it is running. Counted, so two locks don't fight. */

type LenisLike = { stop: () => void; start: () => void };
declare global {
  interface Window {
    __lenis?: LenisLike & { scrollTo: (target: number | string | HTMLElement, opts?: Record<string, unknown>) => void };
    __mkReady?: boolean;
  }
}

let locks = 0;

export function lockScroll(on: boolean) {
  locks = Math.max(0, locks + (on ? 1 : -1));
  const locked = locks > 0;
  document.documentElement.style.overflow = locked ? 'hidden' : '';
  if (locked) window.__lenis?.stop();
  else window.__lenis?.start();
}

export function scrollToTop() {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (window.__lenis) window.__lenis.scrollTo(0, { duration: 1.4 });
  else window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' });
}
