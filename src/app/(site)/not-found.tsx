import { NotFoundContent } from '@/components/layout/NotFoundContent';

export const metadata = { title: 'Page not found' };

// notFound() in a public page (e.g. an unknown room) renders here, inside the (site) layout.
export default function NotFound() {
  return <NotFoundContent />;
}
