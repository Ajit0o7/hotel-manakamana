import type { Metadata } from 'next';
import { BuiltInPage } from '@/components/sections/Sections';
import { pageMetadata } from '@/lib/cms/site';

export function generateMetadata(): Promise<Metadata> {
  return pageMetadata('dining', '/dining', {
    title: 'Rooftop Restaurant',
    description: 'Nepali thali, dal bhat, breakfasts and tea on our rooftop terrace in Manthali, Ramechhap. Room service available.',
    alternates: { canonical: '/dining' },
  });
}

export default function DiningPage() {
  return <BuiltInPage slug="dining" title="Dining" />;
}
