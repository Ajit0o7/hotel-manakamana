import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { JsonLd } from '@/components/seo/JsonLd';
import { hotelLd, websiteLd } from '@/content/schema';
import { getHotel, getRooms, pageMetadata } from '@/lib/cms/site';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('home', '/', { alternates: { canonical: '/' } }, { absolute: true });
}

export default async function HomePage() {
  const [hotel, rooms] = await Promise.all([getHotel(), getRooms()]);
  return (
    <>
      <JsonLd data={[websiteLd, hotelLd(hotel, rooms)]} />
      <BuiltInPage slug="home" title="Home" />
    </>
  );
}
