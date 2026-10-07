// Exports the website's built-in content (src/content/*.ts) as the CMS's
// one-time import bundle: cms/internal/seed/data/content.json plus the photos.
// The CMS imports it on first start (see cms/internal/seed). Re-run this only
// if the built-in content changes before the import has happened:
//
//   node --disable-warning=MODULE_TYPELESS_PACKAGE_JSON scripts/export-cms-seed.mjs
import { copyFileSync, mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { register } from 'node:module';
import { dirname, join } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const src = join(root, 'src');
const out = join(root, 'cms/internal/seed/data');

// Resolve "@/..." and extensionless imports to .ts files, and load images as
// { src: "<file name>" } so the content modules run outside Next.js.
register(
  'data:text/javascript,' +
    encodeURIComponent(`
const SRC = ${JSON.stringify(pathToFileURL(src).href + '/')};
export async function resolve(spec, ctx, next) {
  if (spec.startsWith('@/')) spec = SRC + spec.slice(2);
  if (/\\.(jpe?g|png|webp)$/.test(spec)) return { url: new URL(spec, ctx.parentURL).href, shortCircuit: true };
  if ((spec.startsWith('.') || spec.startsWith('file:')) && !/\\.[a-z]+$/.test(spec)) spec += '.ts';
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (/\\.(jpe?g|png|webp)$/.test(url)) {
    return { format: 'module', source: 'export default { src: ' + JSON.stringify(url.split('/').pop()) + ' };', shortCircuit: true };
  }
  return next(url, ctx);
}`),
  import.meta.url,
);

const { HOTEL, POLICIES, AMENITIES, NEARBY, FAQS } = await import(pathToFileURL(join(src, 'content/hotel.ts')).href);
const { ROOMS } = await import(pathToFileURL(join(src, 'content/rooms.ts')).href);
const { GALLERY } = await import(pathToFileURL(join(src, 'content/gallery.ts')).href);
const { GUIDES } = await import(pathToFileURL(join(src, 'content/guides.ts')).href);

// ---- Media -------------------------------------------------------------------
const media = new Map(); // file name -> { key, file, alt, title }
const humanize = (file) => file.replace(/\.[a-z]+$/, '').replace(/^(ebn|fb|bp)-/, '').replace(/-/g, ' ').replace(/^./, (c) => c.toUpperCase());
function mediaKey(photo, alt) {
  const file = photo.src.src; // the image stub: { src: "<file name>" }
  if (!media.has(file)) media.set(file, { key: file.replace(/\.[a-z]+$/, ''), file, alt: alt ?? photo.alt ?? '', title: humanize(file) });
  const m = media.get(file);
  if (!m.alt && (alt ?? photo.alt)) m.alt = alt ?? photo.alt;
  return `media:${m.key}`;
}

// ---- Inline text and guide blocks -> HTML ----------------------------------------
const esc = (s) => s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
const inline = (s) =>
  esc(s)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/\[(.+?)\]\((.+?)\)/g, (_, text, href) => `<a href="${href}">${text}</a>`);

function credit(c) {
  return `<p><em>Photo: <a href="${esc(c.sourceUrl)}">${esc(c.author)}</a>, <a href="${esc(c.licenseUrl)}">${esc(c.license)}</a></em></p>`;
}

function blocksToHtml(blocks) {
  return blocks
    .map((b) => {
      switch (b.type) {
        case 'h2':
          return `<h2>${esc(b.text)}</h2>`;
        case 'p':
          return `<p>${inline(b.text)}</p>`;
        case 'list': {
          const tag = b.ordered ? 'ol' : 'ul';
          return `<${tag}>${b.items.map((i) => `<li><p>${inline(i)}</p></li>`).join('')}</${tag}>`;
        }
        case 'callout':
          return `<blockquote><p><strong>${esc(b.title)}</strong></p><p>${inline(b.text)}</p></blockquote>`;
        case 'compare':
          return [
            '<p>[compare]</p>',
            ...b.items.map((c) => `<h3>${esc(c.title)}${c.tone === 'good' ? ' (recommended)' : ''}</h3><ul>${c.points.map((pt) => `<li><p>${esc(pt)}</p></li>`).join('')}</ul>`),
            '<p>[/compare]</p>',
          ].join('');
        case 'airlines':
          return '<p>[airlines]</p>';
        case 'weather':
          return '<p>[weather]</p>';
        case 'map':
          return `<p>[map ${esc(b.title)} | ${esc(b.src)}]</p>`;
        case 'cta':
          return `<p>[booking ${esc(b.title)} | ${esc(b.text)}]</p>`;
        case 'figure':
          return `<img src="${mediaKey(b.photo)}" alt="${esc(b.photo.alt)}" title="${esc(b.caption)}">${b.credit ? credit(b.credit) : ''}`;
        case 'table':
          return `<table><tbody><tr>${b.head.map((h) => `<th><p>${esc(h)}</p></th>`).join('')}</tr>${b.rows
            .map((r) => `<tr>${r.map((c) => `<td><p>${inline(c)}</p></td>`).join('')}</tr>`)
            .join('')}</tbody></table>`;
        default:
          throw new Error(`unknown block ${b.type}`);
      }
    })
    .join('\n');
}

// ---- Entries ---------------------------------------------------------------------
const at = (date) => `${date}T06:00:00Z`;
const published = '2026-09-30T06:00:00Z';
const entries = [];

entries.push({
  key: 'settings:hotel',
  type: 'settings',
  title: 'Hotel settings',
  slug: 'hotel',
  status: 'published',
  published_at: published,
  fields: {
    phone: HOTEL.phoneDisplay,
    whatsapp: HOTEL.whatsapp,
    address: HOTEL.address,
    street: HOTEL.street,
    locality: HOTEL.locality,
    region: HOTEL.region,
    postal_code: HOTEL.postalCode,
    maps_url: HOTEL.mapsUrl,
    room_count: HOTEL.roomCount,
    rating_value: HOTEL.rating.value,
    rating_count: HOTEL.rating.count,
    review_quote: HOTEL.review.quote,
    review_author: HOTEL.review.author,
    review_source: HOTEL.review.source,
    distance_airport: HOTEL.distances.airport,
    distance_bus_park: HOTEL.distances.busPark,
    distance_kathmandu: HOTEL.distances.kathmandu,
    languages: HOTEL.languages.map((l) => l.name),
    payment: [...HOTEL.payment],
    google_url: HOTEL.profiles.google,
    facebook_url: HOTEL.profiles.facebook,
    tripadvisor_url: HOTEL.profiles.tripadvisor,
    ebooking_url: HOTEL.profiles.ebookingNepal,
    policies: POLICIES.map((p) => ({ term: p.term, detail: p.detail })),
    amenities: AMENITIES.map((a) => ({ icon: a.icon, label: a.label })),
    nearby: NEARBY.map((n) => ({ name: n.name, note: n.note, time: n.time })),
    faqs: FAQS.map((f) => ({ question: f.q, answer: f.a })),
  },
});

ROOMS.forEach((r, i) => {
  entries.push({
    key: `room:${r.slug}`,
    type: 'room',
    title: r.name,
    slug: r.slug,
    status: 'published',
    published_at: published,
    menu_order: i + 1,
    excerpt: r.summary,
    content: `<p>${esc(r.description)}</p>`,
    featured: mediaKey(r.image).slice(6),
    fields: {
      price_npr: r.price,
      max_guests: r.maxGuests,
      beds: r.beds,
      tag: r.tag,
      features: [...r.features],
      photos: r.photos.map((p) => mediaKey(p)),
    },
    seo: {
      meta_title: `${r.name} · NPR ${r.price.toLocaleString('en-US')} a night`,
      meta_description: `${r.summary} Room only, NPR ${r.price.toLocaleString('en-US')} per night, 500 m from Manthali (Ramechhap) Airport.`,
      focus_keyword: 'hotel near Ramechhap Airport',
    },
  });
});

GUIDES.forEach((g, i) => {
  const fields = {
    eyebrow: g.eyebrow,
    heading: g.heading[0],
    heading_accent: g.heading[1],
    updated_on: g.updated,
    read_minutes: g.readMins,
    facts: g.facts.map(([term, value]) => ({ term, value })),
    sources: g.sources.map((s) => ({ label: s.label, url: s.url })),
  };
  if (g.heroCredit) {
    Object.assign(fields, {
      hero_credit_author: g.heroCredit.author,
      hero_credit_url: g.heroCredit.sourceUrl,
      hero_credit_license: g.heroCredit.license,
      hero_credit_license_url: g.heroCredit.licenseUrl,
    });
  }
  entries.push({
    key: `post:${g.slug}`,
    type: 'post',
    template: 'guide',
    title: g.title,
    slug: g.slug,
    status: 'published',
    published_at: new Date(Date.parse(at(g.published)) - i * 60_000).toISOString().replace('.000Z', 'Z'),
    excerpt: g.description,
    content: blocksToHtml(g.body),
    featured: mediaKey(g.hero).slice(6),
    fields,
    seo: { meta_description: g.description },
  });
});

const priceFrom = Math.min(...ROOMS.map((r) => r.price)).toLocaleString('en-US');
const pages = [
  { slug: 'home', template: 'home', title: 'Home', meta_title: `${HOTEL.name} | 500 m from Manthali (Ramechhap) Airport`,
    description: 'Family-run hotel in Manthali, 500 m from Ramechhap Airport for Lukla flights. Air-conditioned rooms with balconies, free Wi-Fi and a rooftop restaurant. From NPR 2,000.',
    keyword: 'hotel near Ramechhap Airport' },
  { slug: 'rooms', template: 'rooms', title: 'Rooms & Rates',
    description: `Deluxe Double and Double rooms with air conditioning, balcony, flat-screen TV and free Wi-Fi, 500 m from Manthali (Ramechhap) Airport. From NPR ${priceFrom} a night.` },
  { slug: 'dining', template: 'dining', title: 'Rooftop Restaurant',
    description: 'Nepali thali, dal bhat, breakfasts and tea on our rooftop terrace in Manthali, Ramechhap. Room service available.' },
  { slug: 'gallery', template: 'gallery', title: 'Photo Gallery',
    description: 'Photos of our rooms, rooftop restaurant, food and views in Manthali, Ramechhap.',
    fields: { photos: GALLERY.map((p) => ({ photo: mediaKey(p), category: p.cat, caption: p.alt })) } },
  { slug: 'location', template: 'location', title: 'Location & Getting Here',
    description: '500 m from Manthali (Ramechhap) Airport and 300 m from Manthali Bus Park: an easy base for Lukla flights.' },
  { slug: 'guides', template: 'guides', title: 'Travel Guides: Manthali, Ramechhap Airport & Lukla Flights',
    description: 'Practical guides for trekkers: Manthali (Ramechhap) to Lukla flights, getting from Kathmandu to Manthali, and what to do if your Lukla flight is delayed or cancelled.' },
  { slug: 'contact', template: 'contact', title: 'Contact & Book',
    description: `Book your room at ${HOTEL.name}, Manthali. Call or WhatsApp ${HOTEL.phoneDisplay}. Rooms from NPR ${priceFrom} a night.` },
];
pages.forEach((p, i) => {
  entries.push({
    key: `page:${p.slug}`,
    type: 'page',
    template: p.template,
    title: p.title,
    slug: p.slug,
    status: 'published',
    published_at: published,
    menu_order: i,
    fields: p.fields ?? {},
    seo: { meta_title: p.meta_title ?? '', meta_description: p.description, focus_keyword: p.keyword ?? '' },
  });
});

// ---- Write -------------------------------------------------------------------------
rmSync(out, { recursive: true, force: true });
mkdirSync(join(out, 'images'), { recursive: true });
for (const m of media.values()) copyFileSync(join(src, 'assets/images', m.file), join(out, 'images', m.file));
const bundle = { version: 1, media: [...media.values()], entries };
writeFileSync(join(out, 'content.json'), JSON.stringify(bundle, null, 2) + '\n');
console.log(`Wrote ${entries.length} entries and ${media.size} photos to ${out}`);
console.log(entries.map((e) => `  ${e.key}`).join('\n'));
