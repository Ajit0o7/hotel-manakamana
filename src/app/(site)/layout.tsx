import { SiteChrome } from '@/components/layout/SiteChrome';

/* Layout for every public page. The route group "(site)" does not appear in URLs; it only keeps the
   public pages apart from /admin, which must not get the site's header, footer and animations. */

// Re-read content from the CMS at most once a minute, in the background (see src/lib/cms/site.ts). Set
// here too, not only on each fetch, so pages built while the CMS was asleep still pick up its content.
export const revalidate = 60;

export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome>{children}</SiteChrome>;
}
