import type { MetadataRoute } from 'next';
import { HOTEL } from '@/content/hotel';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: HOTEL.name,
    short_name: 'Manakamana',
    description: 'Family-run hotel 500 m from Manthali (Ramechhap) Airport.',
    start_url: '/',
    display: 'standalone',
    background_color: '#15302a',
    theme_color: '#15302a',
    icons: [
      { src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' },
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
