import type { Metadata } from 'next';
import { FilterGallery } from '@/components/gallery/FilterGallery';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { IMG } from '@/content/images';

export const metadata: Metadata = {
  title: 'Photo Gallery',
  description: 'Photos of our rooms, rooftop restaurant, food and views in Manthali, Ramechhap.',
  alternates: { canonical: '/gallery' },
};

export default function GalleryPage() {
  return (
    <>
      <PageHero
        photo={{ src: IMG.viewManthaliTown, alt: 'Manthali town and hills' }}
        eyebrow="Gallery"
        title={<>Photo <em className="accent">gallery</em></>}
        text="Our rooms, our rooftop, our food and the green hills of Ramechhap."
        crumbs={[{ label: 'Gallery' }]}
      />
      <section className="section">
        <div className="container">
          <FilterGallery />
        </div>
      </section>
      <CtaBand />
    </>
  );
}
