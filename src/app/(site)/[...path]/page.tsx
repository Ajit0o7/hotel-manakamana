import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { Sections } from '@/components/sections/Sections';
import { BUILT_IN_PAGES } from '@/content/pages';
import type { Section } from '@/content/sections';
import { featuredPhoto, getCmsPage, getCmsPages, headMetadata, sectionsOf, type CmsEntry } from '@/lib/cms/site';

/* Pages made in the CMS (Pages → Add page), served at their address, e.g. /about-us or /about-us/team.
   The built-in pages (home, rooms…) have their own routes. */

export async function generateStaticParams() {
  return (await getCmsPages()).map((p) => ({ path: p.path.split('/') }));
}

async function load(params: PageProps<'/[...path]'>['params']): Promise<CmsEntry | null> {
  const path = (await params).path.map(decodeURIComponent).join('/');
  if (BUILT_IN_PAGES.has(path)) return null; // e.g. /home: the home page lives at /
  return getCmsPage(path);
}

export async function generateMetadata({ params }: PageProps<'/[...path]'>): Promise<Metadata> {
  const page = await load(params);
  return page ? headMetadata(page.head, `/${page.path}`) : {};
}

export default async function CmsPage({ params }: PageProps<'/[...path]'>) {
  const page = await load(params);
  if (!page) notFound();
  const sections: Section[] = sectionsOf(page)?.length
    ? sectionsOf(page)!
    : // A page without sections yet: its title over the featured photo, then its body text.
      [
        { layout: 'page_hero', heading: page.title, photo: featuredPhoto(page) },
        { layout: 'text', content: page.content },
      ];
  return <Sections sections={sections} pageTitle={page.title} />;
}
