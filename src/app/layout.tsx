import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Manrope } from 'next/font/google';
import { Emblem } from '@/components/brand/Emblem';
import { CurtainProvider } from '@/components/layout/CurtainProvider';
import { FloatActions } from '@/components/layout/FloatActions';
import { Footer } from '@/components/layout/Footer';
import { Header } from '@/components/layout/Header';
import { Motion } from '@/components/layout/Motion';
import { HOTEL, SITE_URL } from '@/content/hotel';
import './globals.css';

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
});
const manrope = Manrope({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-manrope',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(SITE_URL),
  title: {
    default: `${HOTEL.name} | 500 m from Manthali (Ramechhap) Airport`,
    template: `%s | ${HOTEL.name}`,
  },
  description:
    'Family-run hotel in Manthali, 500 m from Ramechhap Airport for Lukla flights. Air-conditioned rooms with balconies, free Wi-Fi and a rooftop restaurant. From NPR 2,000.',
  applicationName: HOTEL.shortName,
  openGraph: { siteName: HOTEL.name, type: 'website', locale: 'en_US' },
  twitter: { card: 'summary_large_image' },
  icons: {
    icon: [
      { url: '/icon.svg', type: 'image/svg+xml' },
      { url: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { url: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
    ],
    apple: '/icons/apple-touch-icon.png',
  },
};

export const viewport: Viewport = { themeColor: '#15302a' };

/* Runs before first paint: turns on the animation styles, flags the first visit of the session
   (so the emblem draws itself from the very first frame) and, if the app never starts, shows the
   content anyway after 6s. */
const BOOT = `(function(d){d.classList.add('js');try{if(!sessionStorage.getItem('mk-intro')){d.classList.add('mk-intro');sessionStorage.setItem('mk-intro','1')}}catch(e){}setTimeout(function(){if(!window.__mkReady)d.classList.remove('js')},6000)})(document.documentElement);`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${cormorant.variable} ${manrope.variable}`} data-scroll-behavior="smooth" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: BOOT }} />
      </head>
      <body suppressHydrationWarning>
        <a className="skip-link" href="#main">Skip to content</a>
        <CurtainProvider emblem={<Emblem idPrefix="curtain" />}>
          <div className="progress" aria-hidden="true" />
          <Header />
          <main id="main">{children}</main>
          <Footer />
          <FloatActions />
          <Motion />
        </CurtainProvider>
      </body>
    </html>
  );
}
