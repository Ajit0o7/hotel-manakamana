import Image from 'next/image';
import { Suspense } from 'react';
import { EnquiryForm } from '@/components/booking/EnquiryForm';
import { FilterGallery } from '@/components/gallery/FilterGallery';
import { GuideCard } from '@/components/guides/GuideCard';
import { BookingBar } from '@/components/home/BookingBar';
import { FlightBoard } from '@/components/home/FlightBoard';
import { AreaMap } from '@/components/map/AreaMap';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { TLink } from '@/components/ui/TLink';
import type { GalleryItem } from '@/content/gallery';
import { formatNPR } from '@/content/hotel';
import type { Section } from '@/content/sections';
import { heading, Inline, Paragraphs } from '../text';
import { Head, isPhoto, sectionClass, type SectionContext } from './shared';

/* Sections that show data from Hotel settings, Rooms and Posts. */

type Of<L extends Section['layout']> = Extract<Section, { layout: L }>;

export function BookingBarSection() {
  return <BookingBar />;
}

export function RoomsPreviewSection({ s, ctx }: { s: Of<'rooms_preview'>; ctx: SectionContext }) {
  return (
    <section className="section">
      <div className="container">
        <div className="section__head">
          <div>
            <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
            <Paragraphs text={s.text} className="reveal" />
          </div>
          {s.link_label && <TLink href="/rooms" className="link reveal">{s.link_label}</TLink>}
        </div>
        <div className="grid grid--2" data-stagger="">
          {ctx.rooms.map((r) => (
            <article className="card reveal" key={r.slug}>
              <TLink href={`/rooms/${r.slug}`} className="card__media" aria-label={`${r.name} details`}>
                <Image src={r.image.src} alt={r.image.alt} fill sizes="(max-width: 680px) 100vw, 580px" placeholder="blur" />
                <span className="tag">{r.tag}</span>
              </TLink>
              <div className="card__body">
                <h3>{r.name}</h3>
                <p>{r.summary}</p>
                <div className="card__foot">
                  <span className="price">From <strong>{formatNPR(r.price)}</strong> / night</span>
                  <TLink href={`/rooms/${r.slug}`} className="link">Details →</TLink>
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}

export function RoomsListSection({ s, ctx }: { s: Of<'rooms_list'>; ctx: SectionContext }) {
  return (
    <section className="section">
      <div className="container">
        {ctx.rooms.map((r, i) => (
          <article className={`room${i % 2 ? ' room--reverse' : ''}`} id={r.anchor} key={r.slug}>
            <div className="room__media">
              <div className="reveal-img">
                <Image src={r.image.src} alt={r.image.alt} sizes="(max-width: 960px) 100vw, 640px" placeholder="blur" />
              </div>
            </div>
            <div data-stagger="">
              <span className="room__num reveal" aria-hidden="true">{r.num}</span>
              <span className="tag reveal">{r.tag}</span>
              <SplitHeading>{r.name}</SplitHeading>
              <p className="room__price reveal"><strong>{formatNPR(r.price)}</strong> / night <span>· room only</span></p>
              <div className="room__meta reveal">
                <span><Icon name="users" /> Up to {r.maxGuests} guests</span>
                <span><Icon name="bed" /> {r.beds}</span>
                <span><Icon name="shower" /> Private bathroom</span>
              </div>
              <p className="reveal">{r.description}</p>
              <ul className="pill-list reveal">{r.features.map((f) => <li key={f}>{f}</li>)}</ul>
              <div className="hero__ctas reveal" style={{ marginTop: 0 }}>
                <Button href={`/rooms/${r.slug}`} label="Room details" variant="dark" arrow />
                <Button href={`/contact?room=${r.slug}#enquiry`} label="Enquire & book" variant="outline" />
              </div>
            </div>
          </article>
        ))}
        {s.note && <p className="muted reveal" style={{ marginTop: 8 }}><Inline text={s.note} /></p>}
      </div>
    </section>
  );
}

export function AmenitiesSection({ s, ctx }: { s: Of<'amenities'>; ctx: SectionContext }) {
  return (
    <section className={sectionClass(s.background)}>
      <div className="container">
        <div className="section__head">
          <div><Head eyebrow={s.eyebrow} number={s.number} text={s.heading} /></div>
        </div>
        <div className="amenities" data-stagger="">
          {ctx.hotel.amenities.map((a) => (
            <div className="amenity reveal" key={a.label}><Icon name={a.icon as IconName} /> {a.label}</div>
          ))}
        </div>
      </div>
    </section>
  );
}

/** The FAQs from Hotel settings, with their FAQPage structured data. */
export function FaqSection({ s, ctx }: { s: Of<'faq'>; ctx: SectionContext }) {
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: ctx.hotel.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
  return (
    <section className={sectionClass(s.background)}>
      <JsonLd data={faqLd} />
      <div className="container container--narrow">
        <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
        <div data-stagger="">
          {ctx.hotel.faqs.map((f) => (
            <details className="faq reveal" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </div>
    </section>
  );
}

export function NearbySection({ s, ctx }: { s: Of<'nearby'>; ctx: SectionContext }) {
  return (
    <section className={sectionClass(s.background)}>
      <div className="container container--narrow">
        <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
        <ul className="nearby" data-stagger="">
          {ctx.hotel.nearby.map((n) => (
            <li className="reveal" key={n.name}>
              <span><strong>{n.name}</strong> · {n.note}</span>
              <span>{n.time}</span>
            </li>
          ))}
        </ul>
        {s.note && <p className="muted reveal" style={{ marginTop: 18 }}><Inline text={s.note} /></p>}
      </div>
    </section>
  );
}

export function ReviewSection({ ctx }: { ctx: SectionContext }) {
  const { rating, review } = ctx.hotel;
  return (
    <section className="section">
      <div className="container container--narrow center testimonial">
        <div className="rating reveal"><span className="stars">★★★★☆</span> {rating.value} · {rating.count} Google reviews</div>
        <blockquote className="quote reveal">“{review.quote}”</blockquote>
        <p className="quote__by reveal">— {review.author}, {review.source}</p>
      </div>
    </section>
  );
}

export function EnquirySection({ s, ctx }: { s: Of<'enquiry'>; ctx: SectionContext }) {
  const { hotel } = ctx;
  return (
    <section className="section" id={s.anchor || undefined}>
      <div className="container grid grid--2" style={{ gap: 'clamp(32px,5vw,64px)', alignItems: 'start' }} data-stagger="">
        <div className="contact-card reveal">
          {s.form_heading && <h2>{s.form_heading}</h2>}
          {s.form_text && <p className="muted"><Inline text={s.form_text} /></p>}
          <Suspense fallback={<p className="muted">Loading the form…</p>}>
            <EnquiryForm />
          </Suspense>
          <p className="form-note">Prefer to talk? Call <a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a>.</p>
        </div>

        <div className="dark-card reveal">
          {s.side_eyebrow && <Eyebrow>{s.side_eyebrow}</Eyebrow>}
          {s.side_heading && <SplitHeading>{heading(s.side_heading)}</SplitHeading>}
          <ul className="contact-list">
            <li><div className="icon"><Icon name="phone" /></div><div><strong>Phone</strong><a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a></div></li>
            <li><div className="icon"><Icon name="wa" /></div><div><strong>WhatsApp</strong><a href={hotel.whatsappUrl} target="_blank" rel="noopener noreferrer">Chat with us</a></div></li>
            <li><div className="icon"><Icon name="pin" /></div><div><strong>Address</strong><span>{hotel.address}</span></div></li>
            {s.rooms_text && <li><div className="icon"><Icon name="bed" /></div><div><strong>Rooms</strong><span>{s.rooms_text}</span></div></li>}
            <li><div className="icon"><Icon name="star" /></div><div><strong>Guest rating</strong><span>{hotel.rating.value} / 5 from {hotel.rating.count} Google reviews</span></div></li>
          </ul>
          <Button href={hotel.mapsUrl} label="Get directions" variant="gold" arrow />
        </div>
      </div>
    </section>
  );
}

export function GuidesGridSection({ ctx }: { ctx: SectionContext }) {
  return (
    <section className="section">
      <div className="container">
        <div className="grid grid--3" data-stagger="">
          {ctx.guides.map((g) => <GuideCard key={g.slug} guide={g} />)}
        </div>
      </div>
    </section>
  );
}

export function GallerySection({ s }: { s: Of<'gallery'> }) {
  const items: GalleryItem[] = (s.photos ?? [])
    .filter((r) => isPhoto(r.photo))
    .map((r) => ({ ...r.photo!, alt: r.caption || r.photo!.alt, cat: r.category ?? 'hotel' }));
  return (
    <section className="section">
      <div className="container">
        <FilterGallery items={items} />
      </div>
    </section>
  );
}

export function FlightBoardSection({ s, ctx }: { s: Of<'flight_board'>; ctx: SectionContext }) {
  return <FlightBoard guides={ctx.guides} note={s.note} tips={s.tips} guidesEyebrow={s.guides_eyebrow} guidesHeading={s.guides_heading} />;
}

export function AreaMapSection({ s }: { s: Of<'area_map'> }) {
  return (
    <section className={sectionClass(s.background)} id={s.anchor || undefined}>
      <div className="container">
        <div className="section__head">
          <div>
            <Head eyebrow={s.eyebrow} number={s.number} text={s.heading} />
            <Paragraphs text={s.text} className="reveal" />
          </div>
        </div>
        <AreaMap />
      </div>
    </section>
  );
}
