import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { formatNPR } from '@/content/hotel';
import { getPriceFrom, pageMetadata } from '@/lib/cms/site';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('rooms', '/rooms', {
    title: 'Rooms & Rates',
    description: `Deluxe Double and Double rooms with air conditioning, balcony, flat-screen TV and free Wi-Fi, 500 m from Manthali (Ramechhap) Airport. From ${formatNPR(await getPriceFrom())} a night.`,
    alternates: { canonical: '/rooms' },
  });
}

export default function RoomsPage() {
  return <BuiltInPage slug="rooms" title="Rooms" />;
}
