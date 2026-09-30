'use client';

import Image from 'next/image';
import { useEffect, useRef, useState, type ReactNode } from 'react';
import type { Photo } from '@/content/images';

export type StoryStep = Photo & { step: string; title: string; text: string };

/* "Your stay, step by step": on desktop the section pins while the cards slide sideways with the scroll;
   on phones (and with reduced motion) it's a swipeable row. */
export function StayStory({ steps, head }: { steps: StoryStep[]; head: ReactNode }) {
  const sectionRef = useRef<HTMLElement>(null);
  const trackRef = useRef<HTMLDivElement>(null);
  const barRef = useRef<HTMLSpanElement>(null);
  const [pinned, setPinned] = useState(false);

  useEffect(() => {
    const section = sectionRef.current;
    const track = trackRef.current;
    if (!section || !track) return;
    const mq = window.matchMedia('(min-width: 961px) and (prefers-reduced-motion: no-preference)');
    let shift = 0;
    let ticking = false;

    const measure = () => {
      if (!mq.matches) {
        section.style.height = '';
        track.style.transform = '';
        setPinned(false);
        return;
      }
      setPinned(true);
      shift = Math.max(0, track.scrollWidth - window.innerWidth);
      section.style.height = `${window.innerHeight + shift}px`; // scroll distance = sideways travel
      update();
    };
    const update = () => {
      ticking = false;
      if (!mq.matches) return;
      const top = section.getBoundingClientRect().top;
      const p = Math.min(1, Math.max(0, -top / Math.max(1, shift)));
      track.style.transform = `translate3d(${(-p * shift).toFixed(1)}px, 0, 0)`;
      barRef.current?.style.setProperty('--sp', p.toFixed(4));
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(update);
      }
    };
    const onScrollNative = () => {
      if (mq.matches) onScroll();
      else if (barRef.current) {
        const max = track.scrollWidth - track.clientWidth;
        barRef.current.style.setProperty('--sp', max > 0 ? (track.scrollLeft / max).toFixed(4) : '0');
      }
    };

    measure();
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', measure);
    mq.addEventListener('change', measure);
    track.addEventListener('scroll', onScrollNative, { passive: true });
    const imgs = track.querySelectorAll('img');
    imgs.forEach((img) => img.addEventListener('load', measure, { once: true }));
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', measure);
      mq.removeEventListener('change', measure);
      track.removeEventListener('scroll', onScrollNative);
      section.style.height = '';
    };
  }, []);

  return (
    <section ref={sectionRef} className={`story${pinned ? ' is-pinned' : ''}`} aria-label="Your stay, step by step">
      <div className="story__pin">
        <div className="container story__head">{head}</div>
        <div ref={trackRef} className="story__track" tabIndex={0} aria-label="Scroll sideways through the steps of your stay">
          {steps.map((s) => (
            <article key={s.step} className="story__card">
              <div className="story__media">
                <Image src={s.src} alt={s.alt} fill sizes="(max-width: 960px) 80vw, 420px" placeholder="blur" />
              </div>
              <div className="story__body">
                <span className="story__step">{s.step}</span>
                <h3>{s.title}</h3>
                <p>{s.text}</p>
              </div>
            </article>
          ))}
        </div>
        <div className="container">
          <div className="story__bar" aria-hidden="true"><span ref={barRef} /></div>
        </div>
      </div>
    </section>
  );
}
