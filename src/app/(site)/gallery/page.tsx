import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { pageMetadata } from '@/lib/cms/site';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('gallery', '/gallery', {
    title: 'Photo Gallery',
    description: 'Photos of our rooms, rooftop restaurant, food and views in Manthali, Ramechhap.',
    alternates: { canonical: '/gallery' },
  });
}

export default function GalleryPage() {
  return <BuiltInPage slug="gallery" title="Gallery" />;
}
