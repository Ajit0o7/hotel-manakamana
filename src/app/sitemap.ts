import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/hotel';
import { ROOMS } from '@/content/rooms';

export default function sitemap(): MetadataRoute.Sitemap {
  const pages = ['', '/rooms', '/dining', '/gallery', '/location', '/contact'];
  const now = new Date();
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.8 })),
    ...ROOMS.map((r) => ({ url: `${SITE_URL}/rooms/${r.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 })),
  ];
}
