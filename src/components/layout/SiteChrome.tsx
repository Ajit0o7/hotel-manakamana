import type { ReactNode } from 'react';
import { Emblem } from '@/components/brand/Emblem';
import { CurtainProvider } from '@/components/layout/CurtainProvider';
import { FloatActions } from '@/components/layout/FloatActions';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Motion } from '@/components/layout/Motion';
import { SiteDataProvider } from '@/components/layout/SiteData';
import { getHotel, getRooms } from '@/lib/cms/site';

/* Everything around a public page: curtain transitions, header, footer, floating buttons and scroll
   effects. Used by the (site) layout and by the 404 page, which renders outside that layout. The
   admin area at /admin has its own layout and does not use it. */
export async function SiteChrome({ children }: { children: ReactNode }) {
  const [hotel, rooms] = await Promise.all([getHotel(), getRooms()]);
  const data = { hotel, rooms: rooms.map((r) => ({ slug: r.slug, name: r.name, price: r.price, maxGuests: r.maxGuests })) };
  return (
    <SiteDataProvider value={data}>
      <a className="skip-link" href="#main">Skip to content</a>
      <CurtainProvider emblem={<Emblem idPrefix="curtain" />}>
        <div className="progress" aria-hidden="true" />
        <Header />
        <main id="main">{children}</main>
        <Footer />
        <FloatActions />
        <Motion />
      </CurtainProvider>
    </SiteDataProvider>
  );
}
