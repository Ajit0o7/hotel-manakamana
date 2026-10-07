import { EntryEditor } from '@/components/admin/EntryEditor';

export default async function NewEntryPage({ params }: PageProps<'/admin/content/[type]/new'>) {
  const { type } = await params;
  return <EntryEditor type={type} />;
}
