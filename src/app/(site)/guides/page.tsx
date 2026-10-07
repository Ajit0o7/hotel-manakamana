import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { JsonLd } from '@/components/seo/JsonLd';
import { SITE_URL } from '@/content/hotel';
import { pageMetadata } from '@/lib/cms/site';

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

export default function GuidesPage() {
  return (
    <>
      <JsonLd data={breadcrumbLd} />
      <BuiltInPage slug="guides" title="Guides" />
    </>
  );
}
