import type { Metadata } from 'next';
import { Suspense } from 'react';
import { EnquiryForm } from '@/components/booking/EnquiryForm';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { HOTEL, formatNPR } from '@/content/hotel';
import { IMG } from '@/content/images';
import { getHotel, getPriceFrom, pageMetadata } from '@/lib/cms/site';

export async function generateMetadata(): Promise<Metadata> {
  const [hotel, priceFrom] = await Promise.all([getHotel(), getPriceFrom()]);
  return pageMetadata('contact', '/contact', {
    title: 'Contact & Book',
    description: `Book your room at ${HOTEL.name}, Manthali. Call or WhatsApp ${hotel.phoneDisplay}. Rooms from ${formatNPR(priceFrom)} a night.`,
    alternates: { canonical: '/contact' },
  });
}

export default async function ContactPage() {
  const hotel = await getHotel();
  const faqLd = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: hotel.faqs.map((f) => ({ '@type': 'Question', name: f.q, acceptedAnswer: { '@type': 'Answer', text: f.a } })),
  };
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
            <p className="form-note">Prefer to talk? Call <a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a>.</p>
          </div>

          <div className="dark-card reveal">
            <Eyebrow>Reach us directly</Eyebrow>
            <SplitHeading>We&apos;re happy <em className="accent">to help</em></SplitHeading>
            <ul className="contact-list">
              <li><div className="icon"><Icon name="phone" /></div><div><strong>Phone</strong><a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a></div></li>
              <li><div className="icon"><Icon name="wa" /></div><div><strong>WhatsApp</strong><a href={hotel.whatsappUrl} target="_blank" rel="noopener noreferrer">Chat with us</a></div></li>
              <li><div className="icon"><Icon name="pin" /></div><div><strong>Address</strong><span>{hotel.address}</span></div></li>
              <li><div className="icon"><Icon name="bed" /></div><div><strong>Rooms</strong><span>From NPR 2,000 a night, room only</span></div></li>
              <li><div className="icon"><Icon name="star" /></div><div><strong>Guest rating</strong><span>{hotel.rating.value} / 5 from {hotel.rating.count} Google reviews</span></div></li>
            </ul>
            <Button href={hotel.mapsUrl} label="Get directions" variant="gold" arrow />
          </div>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container container--narrow">
          <Eyebrow>FAQ</Eyebrow>
          <SplitHeading>Common <em className="accent">questions</em></SplitHeading>
          <div data-stagger="">
            {hotel.faqs.map((f) => (
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
