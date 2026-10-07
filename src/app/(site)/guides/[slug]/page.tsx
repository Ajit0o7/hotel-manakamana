import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { GuideBody } from '@/components/guides/GuideBody';
import { GuideHtml, guideToc } from '@/components/guides/GuideHtml';
import { GuideCard } from '@/components/guides/GuideCard';
import { GuideToc } from '@/components/guides/GuideToc';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { HOTEL, SITE_URL } from '@/content/hotel';
import { HOTEL_ID, abs } from '@/content/schema';
import { getGuide, getGuides, getHotel, headMetadata } from '@/lib/cms/site';
import { formatDateLong } from '@/lib/dates';

export async function generateStaticParams() {
  return (await getGuides()).map((g) => ({ slug: g.slug }));
}

export async function generateMetadata({ params }: PageProps<'/guides/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const g = await getGuide(slug);
  if (!g) return {};
  if (g.head) {
    const meta = headMetadata(g.head, `/guides/${g.slug}`, { type: 'article' });
    return {
      ...meta,
      openGraph: { ...meta.openGraph, type: 'article', publishedTime: g.published || undefined, modifiedTime: g.updated || undefined },
    };
  }
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
  const g = await getGuide(slug);
  if (!g) notFound();
  const [hotel, guides] = await Promise.all([getHotel(), getGuides()]);
  const url = `${SITE_URL}/guides/${g.slug}`;
  const toc = g.html ? guideToc(g.html) : g.body.filter((b) => b.type === 'h2').map((b) => ({ id: b.id, text: b.text }));
  const related = guides.filter((x) => x.slug !== g.slug).slice(0, 4);

  const articleLd = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: g.title,
    description: g.description,
    image: [abs(g.hero.src.src)],
    datePublished: g.published || undefined,
    dateModified: g.updated || undefined,
    author: { '@type': 'Organization', '@id': HOTEL_ID, name: hotel.name, url: SITE_URL },
    publisher: { '@type': 'Organization', '@id': HOTEL_ID, name: hotel.name, logo: { '@type': 'ImageObject', url: `${SITE_URL}/icons/icon-512.png` } },
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
        title={g.heading[1] ? <>{g.heading[0]} <em className="accent">{g.heading[1]}</em></> : g.heading[0]}
        text={g.description}
        crumbs={[{ href: '/guides', label: 'Guides' }, { label: g.heading.filter(Boolean).join(' ') }]}
      />

      <section className="section">
        <div className="container guide-layout">
          <GuideToc items={toc} />
          <article>
            <p className="guide-meta">
              <span>By {hotel.name}</span>
              {g.updated && <span>Updated <time dateTime={g.updated}>{formatDateLong(g.updated)}</time></span>}
              <span>{g.readMins} min read</span>
            </p>
            {g.facts.length > 0 && (
              <dl className="guide-facts">
                {g.facts.map(([term, value]) => (
                  <div key={term}><dt>{term}</dt><dd>{value}</dd></div>
                ))}
              </dl>
            )}
            {g.html ? <GuideHtml html={g.html} hotel={hotel} /> : <GuideBody blocks={g.body} hotel={hotel} />}
            <footer className="guide-sources">
              {g.sources.length > 0 && (
                <>
                  <h2>Sources &amp; further reading</h2>
                  <ul>
                    {g.sources.map((s) => (
                      <li key={s.url}><a href={s.url} target="_blank" rel="noopener noreferrer">{s.label}</a></li>
                    ))}
                  </ul>
                </>
              )}
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

      {related.length > 0 && (
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
      )}

      <CtaBand />
    </>
  );
}
