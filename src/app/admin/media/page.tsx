import type { Metadata } from 'next';
import { MediaLibrary } from '@/components/admin/MediaLibrary';

export const metadata: Metadata = { title: 'Media library' };

export default function MediaPage() {
  return <MediaLibrary />;
}
