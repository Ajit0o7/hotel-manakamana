import type { Metadata } from 'next';
import { GuideCard } from '@/components/guides/GuideCard';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL } from '@/content/hotel';
import { IMG } from '@/content/images';
import { getGuides, pageMetadata } from '@/lib/cms/site';

const FALLBACK: Metadata = {
  title: 'Travel Guides: Manthali, Ramechhap Airport & Lukla Flights',
  description:
    'Practical guides for trekkers: Manthali (Ramechhap) to Lukla flights, getting from Kathmandu to Manthali, and what to do if your Lukla flight is delayed or cancelled.',
  alternates: { canonical: '/guides' },
};

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('guides', '/guides', FALLBACK);
}

const breadcrumbLd = {
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: [
    { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
    { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
  ],
};

export default async function GuidesPage() {
  const guides = await getGuides();
  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <PageHero
        photo={{ src: IMG.ramechhapAirportAerial, alt: 'Ramechhap Airport runway beside the Tamakoshi River in Manthali' }}
        eyebrow="Travel guides"
        title={<>Plan your <em className="accent">flight</em></>}
        text="Practical guides for trekkers flying from Manthali (Ramechhap) to Lukla, written by the hotel 500 m from the airport."
        crumbs={[{ label: 'Guides' }]}
      />
      <section className="section">
        <div className="container">
          <div className="grid grid--3" data-stagger="">
            {guides.map((g) => <GuideCard key={g.slug} guide={g} />)}
          </div>
        </div>
      </section>
      <CtaBand />
    </>
  );
}
