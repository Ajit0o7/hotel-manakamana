'use client';

import { useEffect, useRef } from 'react';

const CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';

/* Departure-board letters. The final text is rendered on the server (readable without JS, and for
   screen readers via the hidden copy); when the tiles scroll into view they shuffle through random
   letters and settle one by one, left to right. Static with reduced motion. */
export function SplitFlap({ text, delay = 0 }: { text: string; delay?: number }) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el || window.matchMedia('(prefers-reduced-motion: reduce)').matches || !('IntersectionObserver' in window)) return;
    const tiles = Array.from(el.querySelectorAll<HTMLElement>('.flap:not(.flap--gap)'));
    const finals = tiles.map((t) => t.textContent ?? '');
    let raf = 0;
    let t0 = 0;
    let last = 0;

    const step = (now: number) => {
      let done = true;
      const tick = now - last > 55; // ~18 flips a second, like a real board
      if (tick) last = now;
      tiles.forEach((t, i) => {
        const settleAt = t0 + 420 + i * 75;
        if (now < settleAt) {
          done = false;
          if (tick && now >= t0) {
            t.textContent = CHARS[Math.floor(Math.random() * CHARS.length)];
            t.classList.remove('is-flip');
            void t.offsetWidth; // restart the flip animation
            t.classList.add('is-flip');
          }
        } else if (t.textContent !== finals[i]) {
          t.textContent = finals[i];
          t.classList.remove('is-flip');
        }
      });
      if (!done) raf = requestAnimationFrame(step);
    };

    const io = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        io.disconnect();
        t0 = performance.now() + delay;
        raf = requestAnimationFrame(step);
      },
      { threshold: 0.6 },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      cancelAnimationFrame(raf);
      tiles.forEach((t, i) => {
        t.textContent = finals[i];
        t.classList.remove('is-flip');
      });
    };
  }, [delay]);

  return (
    <span ref={ref} className="flaps">
      <span className="visually-hidden">{text}</span>
      {Array.from(text.toUpperCase()).map((ch, i) =>
        ch === ' ' ? (
          <span key={i} className="flap flap--gap" aria-hidden="true" />
        ) : (
          <span key={i} className="flap" aria-hidden="true">{ch}</span>
        ),
      )}
    </span>
  );
}
