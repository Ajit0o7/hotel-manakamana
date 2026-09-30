import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnquiryForm } from '@/components/booking/EnquiryForm';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { FAQS, HOTEL, WHATSAPP_URL } from '@/content/hotel';
import { IMG } from '@/content/images';

export const metadata: Metadata = {
  title: 'Contact & Book',
  description: `Book your room at ${HOTEL.name}, Manthali. Call or WhatsApp ${HOTEL.phoneDisplay}. Rooms from NPR 2,000 a night.`,
  alternates: { canonical: '/contact' },
};

const faqLd = {
  '@context': 'https://schema.org',
  '@type': 'FAQPage',
  mainEntity: FAQS.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
};

export default function ContactPage() {
  return (
    <>
      <JsonLd data={faqLd} />
      <PageHero
        photo={{ src: IMG.exterior, alt: 'Hotel Manakamana building' }}
        eyebrow="Contact"
        title={<>Book your <em className="accent">stay</em></>}
        text="Send us your dates and we'll confirm on WhatsApp, or just give us a call."
        crumbs={[{ label: 'Contact' }]}
      />

      <section className="section" id="enquiry">
        <div className="container grid grid--2" style={{ gap: 'clamp(32px,5vw,64px)', alignItems: 'start' }} data-stagger="">
          <div className="contact-card reveal">
            <h2>Booking enquiry</h2>
            <p className="muted">Fill this in and it will open WhatsApp with your message ready to send.</p>
            <Suspense fallback={<p className="muted">Loading the form…</p>}>
              <EnquiryForm />
            </Suspense>
            <p className="form-note">Prefer to talk? Call <a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a>.</p>
          </div>

          <div className="dark-card reveal">
            <Eyebrow>Reach us directly</Eyebrow>
            <SplitHeading>We&apos;re happy <em className="accent">to help</em></SplitHeading>
            <ul className="contact-list">
              <li><div className="icon"><Icon name="phone" /></div><div><strong>Phone</strong><a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a></div></li>
              <li><div className="icon"><Icon name="wa" /></div><div><strong>WhatsApp</strong><a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">Chat with us</a></div></li>
              <li><div className="icon"><Icon name="pin" /></div><div><strong>Address</strong><span>{HOTEL.address}</span></div></li>
              <li><div className="icon"><Icon name="bed" /></div><div><strong>Rooms</strong><span>From NPR 2,000 a night, room only</span></div></li>
              <li><div className="icon"><Icon name="star" /></div><div><strong>Guest rating</strong><span>{HOTEL.rating.value} / 5 from {HOTEL.rating.count} Google reviews</span></div></li>
            </ul>
            <Button href={HOTEL.mapsUrl} label="Get directions" variant="gold" arrow />
          </div>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container container--narrow">
          <Eyebrow>FAQ</Eyebrow>
          <SplitHeading>Common <em className="accent">questions</em></SplitHeading>
          <div data-stagger="">
            {FAQS.map((f) => (
              <details className="faq reveal" key={f.q}>
                <summary>{f.q}</summary>
                <p>{f.a}</p>
              </details>
            ))}
          </div>
        </div>
      </section>
    </>
  );
}
