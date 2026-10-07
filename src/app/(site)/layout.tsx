import { SiteChrome } from '@/components/layout/SiteChrome';

/* Layout for every public page. The route group "(site)" does not appear in URLs; it only keeps the
   public pages apart from /admin, which must not get the site's header, footer and animations. */
export default function SiteLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <SiteChrome>{children}</SiteChrome>;
}
