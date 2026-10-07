import { EntryEditor } from '@/components/admin/EntryEditor';

export default async function EditEntryPage({ params }: PageProps<'/admin/content/[type]/[id]'>) {
  const { type, id } = await params;
  return <EntryEditor key={id} type={type} id={id} />;
}
