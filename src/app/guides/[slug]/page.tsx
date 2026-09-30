import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideBody } from '@/components/guides/GuideBody';
import { GuideCard } from '@/components/guides/GuideCard';
import { GuideToc } from '@/components/guides/GuideToc';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { GUIDES, getGuide } from '@/content/guides';
import { HOTEL, SITE_URL } from '@/content/hotel';
import { formatDateLong } from '@/lib/dates';

export function generateStaticParams() {
  return GUIDES.map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<'/guides/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) return {};
  return {
    title: g.title,
    description: g.description,
    alternates: { canonical: `/guides/${g.slug}` },
    openGraph: {
      type: 'article', siteName: HOTEL.name, locale: 'en_US', title: g.title, description: g.description,
      publishedTime: g.published, modifiedTime: g.updated,
      images: [{ url: g.hero.src.src, width: g.hero.src.width, height: g.hero.src.height, alt: g.hero.alt }],
    },
  };
}

export default async function GuidePage({ params }: PageProps<'/guides/[slug]'>) {
  const { slug } = await params;
  const g = getGuide(slug);
  if (!g) notFound();
  const url = `${SITE_URL}/guides/${g.slug}`;
  const toc = g.body.filter((b) => b.type === 'h2').map((b) => ({ id: b.id, text: b.text }));
  const related = GUIDES.filter((x) => x.slug !== g.slug);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    image: [`${SITE_URL}${g.hero.src.src}`],
    datePublished: g.published,
    dateModified: g.updated,
    author: { '@type': 'Organization', name: HOTEL.name, url: SITE_URL },
    publisher: { '@type': 'Organization', name: HOTEL.name, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } },
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
  };
  const breadcrumbLd = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: [
      { '@type': 'ListItem', position: 1, name: 'Home', item: SITE_URL },
      { '@type': 'ListItem', position: 2, name: 'Guides', item: `${SITE_URL}/guides` },
      { '@type': 'ListItem', position: 3, name: g.title, item: url },
    ],
  };

  return (
    <>
      <JsonLd data={[articleLd, breadcrumbLd]} />
      <PageHero
        photo={g.hero}
        eyebrow={g.eyebrow}
        title={<>{g.heading[0]} <em className="accent">{g.heading[1]}</em></>}
        text={g.description}
        crumbs={[{ href: '/guides', label: 'Guides' }, { label: g.heading.join(' ') }]}
      />

      <section className="section">
        <div className="container guide-layout">
          <GuideToc items={toc} />
          <article>
            <p className="guide-meta">
              <span>By {HOTEL.name}</span>
              <span>Updated <time dateTime={g.updated}>{formatDateLong(g.updated)}</time></span>
              <span>{g.readMins} min read</span>
            </p>
            <dl className="guide-facts">
              {g.facts.map(([term, value]) => (
                <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <GuideBody blocks={g.body} />
            <footer className="guide-sources">
              <h2>Sources &amp; further reading</h2>
              <ul>
                {g.sources.map((s) => (
                  <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                ))}
              </ul>
              <p>Schedules, dates and allowances change from season to season. Always confirm with your airline or trekking agency.</p>
              {g.heroCredit && (
                <p>
                  Header photo: <a href={g.heroCredit.sourceUrl} target="_blank" rel="noopener noreferrer">{g.heroCredit.author}</a>,{' '}
                  <a href={g.heroCredit.licenseUrl} target="_blank" rel="noopener noreferrer license">{g.heroCredit.license}</a>
                </p>
              )}
            </footer>
          </article>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow>More guides</Eyebrow>
              <SplitHeading>Keep <em className="accent">planning</em></SplitHeading>
            </div>
          </div>
          <div className="grid grid--2" data-stagger="">
            {related.map((r) => <GuideCard key={r.slug} guide={r} />)}
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
