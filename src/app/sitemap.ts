import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/content/hotel';
import { getCmsPages, getGuides, getRooms } from '@/lib/cms/site';

export const revalidate = 60;

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const pages = ['', '/rooms', '/dining', '/gallery', '/location', '/guides', '/contact'];
  const now = new Date();
  const [rooms, guides, cmsPages] = await Promise.all([getRooms(), getGuides(), getCmsPages()]);
  return [
    ...pages.map((p) => ({ url: `${SITE_URL}${p}`, lastModified: now, changeFrequency: 'monthly' as const, priority: p === '' ? 1 : 0.8 })),
    ...cmsPages
      .filter((p) => !p.head.robots.includes('noindex'))
      .map((p) => ({ url: `${SITE_URL}/${p.path}`, lastModified: new Date(p.updated_at), changeFrequency: 'monthly' as const, priority: 0.7 })),
    ...rooms.map((r) => ({ url: `${SITE_URL}/rooms/${r.slug}`, lastModified: now, changeFrequency: 'monthly' as const, priority: 0.9 })),
    ...guides.map((g) => ({
      url: `${SITE_URL}/guides/${g.slug}`,
      lastModified: g.updated ? new Date(g.updated) : now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
