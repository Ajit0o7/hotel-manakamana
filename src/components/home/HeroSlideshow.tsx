'use client';

import Image from 'next/image';
import { useCallback, useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { Icon } from '@/components/ui/Icon';
import type { Photo } from '@/content/images';
import { useMediaQuery, usePageLoaded } from '@/lib/hooks';

export type Slide = Photo & { caption: string; tall?: boolean };

const FADE_MS = 1900;

/* Home hero: crossfading photos with a slow zoom. The active progress bar's fill animation is the
   timer (its animationend moves to the next photo), so pausing it pauses the slideshow. */
export function HeroSlideshow({ slides, children }: { slides: Slide[]; children: ReactNode }) {
  const [current, setCurrent] = useState(0);
  const [prev, setPrev] = useState<number | null>(null);
  const [cycle, setCycle] = useState(0);
  const [userPaused, setUserPaused] = useState(false);
  const [offscreen, setOffscreen] = useState(false);
  const [requested, setRequested] = useState<number[]>([]);
  const reduce = useMediaQuery('(prefers-reduced-motion: reduce)');
  const pageLoaded = usePageLoaded(); // the other photos are fetched once the page itself has loaded
  const paused = userPaused || reduce; // no auto-advance when the visitor prefers less motion
  const mounted = slides.map((_, i) => i === 0 || pageLoaded || requested.includes(i));
  const loaded = useRef<boolean[]>(slides.map(() => false));
  const waiting = useRef<number | null>(null);
  const heroRef = useRef<HTMLElement>(null);

  const show = useCallback(
    (target: number) => {
      const next = (target + slides.length) % slides.length;
      if (next === current) return;
      if (!loaded.current[next]) {
        waiting.current = next; // switch as soon as it has loaded
        setRequested((r) => (r.includes(next) ? r : [...r, next]));
        return;
      }
      waiting.current = null;
      setPrev(current);
      setCurrent(next);
      setCycle((c) => c + 1);
    },
    [current, slides.length],
  );

  // drop the outgoing slide once the new one has faded in over it
  useEffect(() => {
    if (prev === null) return;
    const t = window.setTimeout(() => setPrev(null), FADE_MS);
    return () => clearTimeout(t);
  }, [prev, cycle]);

  // pause while scrolled away; keep the floating contact buttons out of the way while the hero fills the screen
  useEffect(() => {
    const el = heroRef.current;
    if (!el || !('IntersectionObserver' in window)) return;
    document.body.classList.add('hero-in-view');
    const io = new IntersectionObserver(
      ([entry]) => {
        setOffscreen(!entry.isIntersecting);
        document.body.classList.toggle('hero-in-view', entry.intersectionRatio > 0.35);
      },
      { threshold: [0, 0.35] },
    );
    io.observe(el);
    return () => {
      io.disconnect();
      document.body.classList.remove('hero-in-view');
    };
  }, []);

  const onLoad = (i: number) => {
    loaded.current[i] = true;
    if (waiting.current === i) show(i);
  };

  const cls = ['hero', paused && 'is-paused', offscreen && 'is-offscreen'].filter(Boolean).join(' ');

  return (
    <section ref={heroRef} className={cls} aria-roledescription="carousel" aria-label="Hotel highlights">
      <div className="hero__media" data-parallax="0.25">
        <div className="hero__slides">
          {slides.map((s, i) =>
            mounted[i] ? (
              <Image
                key={s.caption}
                src={s.src}
                alt={s.alt}
                fill
                sizes="100vw"
                preload={i === 0}
                quality={75}
                aria-hidden={i === current ? undefined : true}
                className={['hero__slide', s.tall && 'hero__slide--tall', i === current && 'is-active', i === prev && 'is-prev'].filter(Boolean).join(' ')}
                onLoad={() => onLoad(i)}
              />
            ) : null,
          )}
        </div>
      </div>
      <div className="container hero__content">
        <div className="hero__text">{children}</div>
        <div className="hero__slider" data-hero="" style={{ '--h': 6 } as CSSProperties}>
          <p className="hero__caption" aria-live="polite">
            <span className="hero__num">{String(current + 1).padStart(2, '0')}</span>
            <span className="hero__caption-text is-changing" key={cycle}>{slides[current].caption}</span>
          </p>
          <div className="hero__bars">
            {slides.map((s, i) => (
              <button
                key={s.caption}
                type="button"
                className={`hero__bar${i === current ? ' is-active' : ''}`}
                aria-label={`Photo ${i + 1}: ${s.caption}`}
                aria-current={i === current ? 'true' : undefined}
                onClick={() => show(i)}
              >
                <span
                  key={i === current ? `run-${cycle}` : 'idle'}
                  onAnimationEnd={() => {
                    if (i === current && !paused) show(current + 1);
                  }}
                />
              </button>
            ))}
            {!reduce && (
              <button
                type="button"
                className="hero__pause"
                aria-label={paused ? 'Play slideshow' : 'Pause slideshow'}
                onClick={() => setUserPaused((p) => !p)}
              >
                <Icon name={paused ? 'play' : 'pause'} />
              </button>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
