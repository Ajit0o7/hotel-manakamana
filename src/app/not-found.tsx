import { NotFoundContent } from '@/components/layout/NotFoundContent';
import { SiteChrome } from '@/components/layout/SiteChrome';

export const metadata = { title: 'Page not found' };

// Unknown URLs render here, inside the root layout only, so this adds the site chrome itself.
export default function NotFound() {
  return (
    <SiteChrome>
      <NotFoundContent />
    </SiteChrome>
  );
}
