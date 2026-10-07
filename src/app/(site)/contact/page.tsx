import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { HOTEL, formatNPR } from '@/content/hotel';
import { getHotel, getPriceFrom, pageMetadata } from '@/lib/cms/site';

export async function generateMetadata(): Promise<Metadata> {
  const [hotel, priceFrom] = await Promise.all([getHotel(), getPriceFrom()]);
  return pageMetadata('contact', '/contact', {
    title: 'Contact & Book',
    description: `Book your room at ${HOTEL.name}, Manthali. Call or WhatsApp ${hotel.phoneDisplay}. Rooms from ${formatNPR(priceFrom)} a night.`,
    alternates: { canonical: '/contact' },
  });
}

export default function ContactPage() {
  return <BuiltInPage slug="contact" title="Contact" />;
}
