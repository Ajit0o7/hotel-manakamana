import type { ReactNode } from 'react';
import { PAGE_SECTIONS } from '@/content/pages';
import type { Section } from '@/content/sections';
import { getGuides, getHotel, getPage, getPriceFrom, getRooms, placeholders, sectionsOf } from '@/lib/cms/site';
import { BannerSection, CtaSection, FactsSection, FeaturesSection, MarqueeSection, MenuCardsSection, PhotoMosaicSection, RoutesSection, SplitSection, StayStorySection, TextSection } from './blocks/content';
import { HeroSlideshowSection, PageHeroSection } from './blocks/heroes';
import {
  AmenitiesSection, AreaMapSection, BookingBarSection, EnquirySection, FaqSection, FlightBoardSection, GallerySection,
  GuidesGridSection, NearbySection, ReviewSection, RoomsListSection, RoomsPreviewSection,
} from './blocks/hotel';
import type { SectionContext } from './blocks/shared';
import { fillPlaceholders } from './text';

/** Renders a page's sections, top to bottom (see src/content/sections.ts). */
export async function Sections({ sections, pageTitle }: { sections: Section[]; pageTitle: string }) {
  const [hotel, rooms, guides, priceFrom] = await Promise.all([getHotel(), getRooms(), getGuides(), getPriceFrom()]);
  const ctx: SectionContext = { hotel, rooms, guides, pageTitle };
  const vars = placeholders(hotel, priceFrom);
  return <>{sections.map((section, i) => <SectionView key={i} s={fillPlaceholders(section, vars)} ctx={ctx} />)}</>;
}

function SectionView({ s, ctx }: { s: Section; ctx: SectionContext }): ReactNode {
  switch (s.layout) {
    case 'hero_slideshow': return <HeroSlideshowSection s={s} ctx={ctx} />;
    case 'page_hero': return <PageHeroSection s={s} ctx={ctx} />;
    case 'booking_bar': return <BookingBarSection />;
    case 'facts': return <FactsSection s={s} />;
    case 'marquee': return <MarqueeSection s={s} />;
    case 'split': return <SplitSection s={s} ctx={ctx} />;
    case 'features': return <FeaturesSection s={s} />;
    case 'stay_story': return <StayStorySection s={s} />;
    case 'rooms_preview': return <RoomsPreviewSection s={s} ctx={ctx} />;
    case 'rooms_list': return <RoomsListSection s={s} ctx={ctx} />;
    case 'banner': return <BannerSection s={s} />;
    case 'flight_board': return <FlightBoardSection s={s} ctx={ctx} />;
    case 'review': return <ReviewSection ctx={ctx} />;
    case 'photo_mosaic': return <PhotoMosaicSection s={s} />;
    case 'amenities': return <AmenitiesSection s={s} ctx={ctx} />;
    case 'menu_cards': return <MenuCardsSection s={s} />;
    case 'gallery': return <GallerySection s={s} />;
    case 'guides_grid': return <GuidesGridSection ctx={ctx} />;
    case 'enquiry': return <EnquirySection s={s} ctx={ctx} />;
    case 'faq': return <FaqSection s={s} ctx={ctx} />;
    case 'area_map': return <AreaMapSection s={s} />;
    case 'routes': return <RoutesSection s={s} />;
    case 'nearby': return <NearbySection s={s} ctx={ctx} />;
    case 'text': return <TextSection s={s} ctx={ctx} />;
    case 'cta_band': return <CtaSection s={s} />;
    default: return null; // a layout this version of the site doesn't know yet
  }
}

/** One of the built-in pages: its sections from the CMS, or the built-in ones. */
export async function BuiltInPage({ slug, title }: { slug: string; title: string }) {
  const page = await getPage(slug);
  return <Sections sections={sectionsOf(page) ?? PAGE_SECTIONS[slug] ?? []} pageTitle={page?.title || title} />;
}
