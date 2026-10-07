import type { CSSProperties } from 'react';
import { HeroSlideshow, type Slide } from '@/components/home/HeroSlideshow';
import { PageHero } from '@/components/sections/PageHero';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { IMG } from '@/content/images';
import type { Section } from '@/content/sections';
import { heading, Inline } from '../text';
import { Buttons, isPhoto, type SectionContext } from './shared';

type Of<L extends Section['layout']> = Extract<Section, { layout: L }>;

export function HeroSlideshowSection({ s, ctx }: { s: Of<'hero_slideshow'>; ctx: SectionContext }) {
  const slides: Slide[] = (s.slides ?? [])
    .filter((x) => isPhoto(x.photo))
    .map((x) => ({ ...x.photo!, caption: x.caption ?? '', tall: x.tall || undefined }));
  if (!slides.length) slides.push({ src: IMG.heroValleyView, alt: '', caption: '' });
  const { hotel } = ctx;
  return (
    <HeroSlideshow slides={slides}>
      {s.eyebrow && <Eyebrow hero={0}>{s.eyebrow}</Eyebrow>}
      <SplitHeading as="h1">{heading(s.heading || ctx.pageTitle)}</SplitHeading>
      {s.text && <p className="lead" data-hero="" style={{ '--h': 3 } as CSSProperties}><Inline text={s.text} /></p>}
      <Buttons buttons={s.buttons} magnetic rowClass="hero__ctas" hero={4} />
      {s.show_rating && (
        <p className="hero__rating" data-hero="" style={{ '--h': 5 } as CSSProperties}>
          <span className="stars" aria-hidden="true">★★★★☆</span> <strong>{hotel.rating.value}</strong>{' '}
          <span>· {hotel.rating.count} Google reviews</span>
        </p>
      )}
    </HeroSlideshow>
  );
}

export function PageHeroSection({ s, ctx }: { s: Of<'page_hero'>; ctx: SectionContext }) {
  return (
    <PageHero
      photo={isPhoto(s.photo) ? s.photo : { src: IMG.heroValleyView, alt: '' }}
      eyebrow={s.eyebrow ?? ''}
      title={heading(s.heading || ctx.pageTitle)}
      text={<Inline text={s.text} />}
      crumbs={[{ label: s.crumb || ctx.pageTitle }]}
    />
  );
}
