import { EntryList } from '@/components/admin/EntryList';

export default async function ListPage({ params }: PageProps<'/admin/content/[type]'>) {
  const { type } = await params;
  return <EntryList type={type} />;
}
