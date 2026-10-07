import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/hotel';
import { getGuides, getRooms } from '@/lib/cms/site';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/rooms', '/dining', '/gallery', '/location', '/guides', '/contact'];
  const now = new Date();
  const [rooms, guides] = await Promise.all([getRooms(), getGuides()]);
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.8 })),
    ...rooms.map((r) => ({ url: `${SITE_URL}/rooms/${r.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 })),
    ...guides.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.updated ? new Date(g.updated) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
