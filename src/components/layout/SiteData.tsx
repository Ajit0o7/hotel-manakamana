'use client';

import { createContext, useContext, type ReactNode } from 'react';
import type { Hotel } from '@/lib/cms/site';

/** What browser-side components need from the CMS: the hotel's facts and a short room list. */
export type SiteData = {
  hotel: Hotel;
  rooms: { slug: string; name: string; price: number; maxGuests: number }[];
};

const SiteDataContext = createContext<SiteData | null>(null);

export function SiteDataProvider({ value, children }: { value: SiteData; children: ReactNode }) {
  return <SiteDataContext.Provider value={value}>{children}</SiteDataContext.Provider>;
}

export function useSiteData(): SiteData {
  const v = useContext(SiteDataContext);
  if (!v) throw new Error('useSiteData must be used inside SiteChrome');
  return v;
}
