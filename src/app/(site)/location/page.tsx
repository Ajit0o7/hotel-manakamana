import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { pageMetadata } from '@/lib/cms/site';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('location', '/location', {
    title: 'Location & Getting Here',
    description: '500 m from Manthali (Ramechhap) Airport and 300 m from Manthali Bus Park: an easy base for Lukla flights.',
    alternates: { canonical: '/location' },
  });
}

export default function LocationPage() {
  return <BuiltInPage slug="location" title="Location" />;
}
