import Image from 'next/image';
import type { CSSProperties } from 'react';
import { PhotoGrid } from '@/components/gallery/PhotoGrid';
import { GuideHtml } from '@/components/guides/GuideHtml';
import { StayStory } from '@/components/home/StayStory';
import { CtaBand } from '@/components/sections/CtaBand';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { TLink } from '@/components/ui/TLink';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import type { Section } from '@/content/sections';
import { heading, Inline, Paragraphs } from '../text';
import { Buttons, gridFor, Head, isPhoto, sectionClass, type SectionContext } from './shared';

type Of<L extends Section['layout']> = Extract<Section, { layout: L }>;

/** A photo (or the map) beside text. On the right, the photo is wider. */
export function SplitSection({ s, ctx }: { s: Of<'split'>; ctx: SectionContext }) {
  const right = s.photo_side === 'right';
  const details = s.show_policies
    ? ctx.hotel.policies.map((p) => ({ term: p.term, detail: p.detail }))
    : (s.details ?? []).filter((d) => d.term || d.detail);
  const checks = (s.checks ?? []).filter(Boolean);
  return (
    <section className={sectionClass(s.background)} id={s.anchor || undefined}>
      <div className={`container split${right ? ' split--reverse' : ''}`}>
        {s.media === 'map' ? (
          <iframe className="map reveal" title="Map showing Hotel Manakamana Airport View" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={ctx.hotel.mapEmbed} />
        ) : (
          isPhoto(s.photo) && (
            <div className={`split__media${right ? ' split__media--wide' : ''}`}>
              <div className="reveal-img">
                <Image src={s.photo.src} alt={s.photo.alt} sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
              </div>
              {(s.badge_value || s.badge_text) && (
                <div className="split__badge reveal" style={{ '--d': '.7s' } as CSSProperties}>
                  <strong>{s.badge_value}</strong><span>{s.badge_text}</span>
                </div>
              )}
            </div>
          )
        )}
        <div data-stagger="">
          <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
          <Paragraphs text={s.lead} className="lead reveal" />
          <Paragraphs text={s.text} className="reveal" />
          {details.length > 0 && (
            <dl className="info reveal">
              {details.map((d, i) => [<dt key={`t${i}`}>{d.term}</dt>, <dd key={`d${i}`}><Inline text={d.detail} /></dd>])}
            </dl>
          )}
          {checks.length > 0 && <ul className="checks reveal">{checks.map((c) => <li key={c}><Inline text={c} /></li>)}</ul>}
          {s.show_weather && <ManthaliNow tone={s.background === 'pine' ? 'dark' : 'light'} />}
          {s.note && <p className="muted reveal" style={{ marginTop: 20 }}><Inline text={s.note} /></p>}
          <Buttons buttons={s.buttons} alone rowStyle={{ marginTop: 0 }} />
        </div>
      </div>
    </section>
  );
}

/** Numbered cards with an icon, a title and a text. */
export function FeaturesSection({ s }: { s: Of<'features'> }) {
  const items = (s.items ?? []).filter((f) => f.title || f.text);
  return (
    <section className={sectionClass(s.background)} id={s.anchor || undefined}>
      <div className="container">
        <div className="section__head">
          <div><Head eyebrow={s.eyebrow} number={s.number} text={s.heading} /></div>
        </div>
        <div className={gridFor(items.length)} data-stagger="">
          {items.map((f, i) => (
            <div className="feature reveal" key={i}>
              <span className="feature__num">{String(i + 1).padStart(2, '0')}</span>
              {f.icon && <div className="feature__icon"><Icon name={f.icon as IconName} /></div>}
              <h3>{f.title}</h3>
              <p><Inline text={f.text} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** A wide parallax photo with text and buttons over it. */
export function BannerSection({ s }: { s: Of<'banner'> }) {
  return (
    <section className="banner" id={s.anchor || undefined}>
      {isPhoto(s.photo) && (
        <div className="banner__media" data-parallax="0.12">
          <Image src={s.photo.src} alt={s.photo.alt} fill sizes="100vw" placeholder="blur" />
        </div>
      )}
      <div className="container">
        <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
        <Paragraphs text={s.text} className="reveal" />
        <Buttons buttons={s.buttons} magnetic />
        {s.show_weather && <ManthaliNow />}
      </div>
    </section>
  );
}

export function RoutesSection({ s }: { s: Of<'routes'> }) {
  const items = (s.items ?? []).filter((r) => r.title || r.text);
  return (
    <section className={sectionClass(s.background)} id={s.anchor || undefined}>
      <div className="container">
        <div className="section__head">
          <div><Head eyebrow={s.eyebrow} number={s.number} text={s.heading} /></div>
        </div>
        <div className={gridFor(items.length)} data-stagger="">
          {items.map((r, i) => (
            <div className="route reveal" key={i}>
              <div className="route__time">{r.time}</div>
              <h3>{r.title}</h3>
              <p><Inline text={r.text} /></p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** Free text written in the editor, styled like the guides. */
export function TextSection({ s, ctx }: { s: Of<'text'>; ctx: SectionContext }) {
  return (
    <section className={sectionClass(s.background)} id={s.anchor || undefined}>
      <div className="container container--narrow">
        <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
        {s.content && <GuideHtml html={s.content} hotel={ctx.hotel} />}
      </div>
    </section>
  );
}

/** Big numbers that count up when they scroll into view. */
export function FactsSection({ s }: { s: Of<'facts'> }) {
  return (
    <div className="container">
      <div className="facts" data-stagger="">
        {(s.items ?? []).filter((f) => f.value || f.label).map((f, i) => {
          const value = f.value ?? '';
          const numeric = /^\d+(\.\d+)?$/.test(value);
          const decimals = value.split('.')[1]?.length ?? 0;
          return (
            <div className="fact reveal" key={i}>
              <span className="fact__num">
                <span {...(numeric ? { 'data-count': value } : {})} {...(numeric && decimals ? { 'data-decimals': String(decimals) } : {})}>{value}</span>
                {f.suffix && <small>{f.suffix}</small>}
              </span>
              <span className="fact__label">{f.label}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MarqueeSection({ s }: { s: Of<'marquee'> }) {
  const words = (s.words ?? []).filter(Boolean);
  if (!words.length) return null;
  const run = (r: string) => words.flatMap((w, i) => [<span key={`${r}-${i}`}>{w}</span>, <span key={`${r}-${i}-sep`} className="sep">✦</span>]);
  return (
    <div className="marquee" aria-hidden="true">
      <div className="marquee__track">{run('a')}{run('b')}</div>
    </div>
  );
}

export function StayStorySection({ s }: { s: Of<'stay_story'> }) {
  const steps = (s.steps ?? [])
    .filter((x) => isPhoto(x.photo))
    .map((x) => ({ ...x.photo!, step: x.step ?? '', title: x.title ?? '', text: x.text ?? '' }));
  return (
    <StayStory
      steps={steps}
      head={
        <>
          <div>
            {s.eyebrow && <Eyebrow num={s.number || undefined}>{s.eyebrow}</Eyebrow>}
            {s.heading && <SplitHeading>{heading(s.heading)}</SplitHeading>}
          </div>
          <Paragraphs text={s.text} className="reveal" />
        </>
      }
    />
  );
}

export function PhotoMosaicSection({ s }: { s: Of<'photo_mosaic'> }) {
  const photos = (s.photos ?? []).filter(isPhoto);
  return (
    <section className={sectionClass(s.background)}>
      <div className="container">
        <div className="section__head">
          <div><Head eyebrow={s.eyebrow} number={s.number} text={s.heading} /></div>
          {s.link && s.link_label && <TLink href={s.link} className="link reveal">{s.link_label}</TLink>}
        </div>
        <PhotoGrid variant="mosaic" shapes={['big', '', '', 'wide']} items={photos} />
      </div>
    </section>
  );
}

export function MenuCardsSection({ s }: { s: Of<'menu_cards'> }) {
  const items = (s.items ?? []).filter((m) => m.title || isPhoto(m.photo));
  return (
    <section className={sectionClass(s.background)}>
      <div className="container">
        <div className="section__head">
          <div><Head eyebrow={s.eyebrow} number={s.number} text={s.heading} /></div>
        </div>
        <div className="grid grid--2" data-stagger="">
          {items.map((m, i) => (
            <article className="menu-card reveal" key={i}>
              {isPhoto(m.photo) && (
                <div className="menu-card__media">
                  <Image src={m.photo.src} alt={m.photo.alt} sizes="(max-width: 680px) 100vw, 200px" placeholder="blur" />
                </div>
              )}
              <div className="menu-card__body">
                {m.tag && <span className="tag">{m.tag}</span>}
                <h3>{m.title}</h3>
                <p><Inline text={m.text} /></p>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function CtaSection({ s }: { s: Of<'cta_band'> }) {
  return <CtaBand eyebrow={s.eyebrow} heading={s.heading} text={s.text} />;
}
