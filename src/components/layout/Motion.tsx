'use client';

import { usePathname } from 'next/navigation';
import { useEffect } from 'react';
import Lenis from 'lenis';

/* Scroll-driven motion for every page, ported from the static site's script.js.
   Works on class names in the server-rendered markup:
   .reveal / .reveal-img / [data-split]  → fade, image wipe, word-by-word heading
   [data-stagger]                        → sets --d on children
   [data-count]                          → count-up numbers
   [data-parallax]                       → parallax layers (+ the gold progress bar)
   [data-magnetic]                       → a 3px lean toward the cursor */

export function Motion() {
  const pathname = usePathname();

  // Lenis smooth scrolling: desktop mouse/trackpad only, never with reduced motion
  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    if (reduce || !fine) return;
    const lenis = new Lenis({ autoRaf: true, lerp: 0.11, anchors: { offset: -96 }, allowNestedScroll: true });
    window.__lenis = lenis as unknown as Window['__lenis'];
    return () => {
      lenis.destroy();
      delete window.__lenis;
    };
  }, []);

  useEffect(() => {
    const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)').matches;
    const cleanups: Array<() => void> = [];

    // ---- stagger
    document.querySelectorAll<HTMLElement>('[data-stagger]').forEach((group) => {
      Array.from(group.children).forEach((child, i) => (child as HTMLElement).style.setProperty('--d', `${i * 0.12}s`));
    });

    // ---- reveal on scroll
    const targets = document.querySelectorAll<HTMLElement>('.reveal, .reveal-img, [data-split]');
    const isHeroTitle = (el: Element) => el.matches('.hero h1, .page-hero h1');
    const markDone = (el: HTMLElement) => {
      const onEnd = (e: TransitionEvent) => {
        if (e.target !== el || e.propertyName !== 'opacity') return;
        el.classList.add('is-done');
        el.removeEventListener('transitionend', onEnd);
      };
      el.addEventListener('transitionend', onEnd);
    };
    if (reduce || !('IntersectionObserver' in window)) {
      targets.forEach((el) => el.classList.add('is-visible', 'is-done', 'is-split-in'));
    } else {
      const io = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            if (!entry.isIntersecting) return;
            const el = entry.target as HTMLElement;
            if (el.hasAttribute('data-split')) el.classList.add('is-split-in');
            if (el.classList.contains('reveal')) markDone(el);
            el.classList.add('is-visible');
            io.unobserve(el);
          });
        },
        { threshold: 0.15, rootMargin: '0px 0px -6% 0px' },
      );
      targets.forEach((el) => {
        if (!isHeroTitle(el)) io.observe(el); // hero titles reveal when the curtain lifts
      });
      cleanups.push(() => io.disconnect());
    }
    // hero titles on a page reached without the curtain (reduced motion, back button)
    if (document.documentElement.classList.contains('is-loaded')) {
      document.querySelectorAll('.hero h1, .page-hero h1').forEach((h) => h.classList.add('is-split-in'));
    }

    // ---- count-up numbers
    const counters = document.querySelectorAll<HTMLElement>('[data-count]');
    if (counters.length && !reduce && 'IntersectionObserver' in window) {
      const run = (el: HTMLElement) => {
        const target = parseFloat(el.dataset.count || '0');
        const decimals = parseInt(el.dataset.decimals || '0', 10);
        const t0 = performance.now();
        const step = (now: number) => {
          const p = Math.min(1, (now - t0) / 1800);
          el.textContent = (target * (1 - Math.pow(1 - p, 4))).toFixed(decimals);
          if (p < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      };
      counters.forEach((el) => {
        if (!el.dataset.counted) el.textContent = (0).toFixed(parseInt(el.dataset.decimals || '0', 10));
      });
      const cio = new IntersectionObserver(
        (entries) => {
          entries.forEach((entry) => {
            const el = entry.target as HTMLElement;
            if (!entry.isIntersecting || el.dataset.counted) return;
            el.dataset.counted = '1';
            run(el);
            cio.unobserve(el);
          });
        },
        { threshold: 0.6 },
      );
      counters.forEach((el) => cio.observe(el));
      cleanups.push(() => cio.disconnect());
    }

    // ---- parallax + scroll progress
    const layers = reduce ? [] : Array.from(document.querySelectorAll<HTMLElement>('[data-parallax]'));
    const progress = document.querySelector<HTMLElement>('.progress');
    let ticking = false;
    const frame = () => {
      ticking = false;
      const vh = window.innerHeight;
      if (progress) {
        const max = document.documentElement.scrollHeight - vh;
        progress.style.setProperty('--p', max > 0 ? (window.scrollY / max).toFixed(4) : '0');
      }
      layers.forEach((el) => {
        const r = el.parentElement!.getBoundingClientRect();
        if (r.bottom < -200 || r.top > vh + 200) return;
        const speed = parseFloat(el.dataset.parallax || '0.12');
        el.style.transform = `translate3d(0, ${((r.top + r.height / 2 - vh / 2) * -speed).toFixed(1)}px, 0)`;
      });
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    frame();
    cleanups.push(() => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    });

    // ---- magnetic buttons (mouse only): a subtle lean, capped at 3px / 2px
    if (finePointer && !reduce) {
      document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
        let dx = 0;
        let dy = 0;
        const move = (e: PointerEvent) => {
          const r = el.getBoundingClientRect();
          const cx = r.left - dx + r.width / 2; // measure from the resting position
          const cy = r.top - dy + r.height / 2;
          dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (r.width / 2))) * 3;
          dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (r.height / 2))) * 2;
          el.style.transform = `translate(${dx.toFixed(1)}px, ${dy.toFixed(1)}px)`;
        };
        const leave = () => {
          dx = 0;
          dy = 0;
          el.style.transform = '';
        };
        el.addEventListener('pointermove', move);
        el.addEventListener('pointerleave', leave);
        cleanups.push(() => {
          el.removeEventListener('pointermove', move);
          el.removeEventListener('pointerleave', leave);
        });
      });
    }

    return () => cleanups.forEach((fn) => fn());
  }, [pathname]);

  return null;
}
