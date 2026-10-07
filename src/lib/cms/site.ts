/* The public website's content, read from the CMS (cms/ in this repository) with the built-in content in
   src/content/ as a fallback.

   - Pages are pre-rendered and refreshed in the background at most every REVALIDATE seconds, so visitors
     never wait for the CMS (which sleeps on Render's free plan and can take a minute to wake).
   - If the CMS cannot be reached while a page is being refreshed, the error makes Next.js keep serving
     the last good version of the page. During a build (and in development) the built-in content is used
     instead, so a sleeping CMS never breaks a deploy.
   - If the CMS has no entry yet (e.g. before the first content import has finished), the built-in
     content is used. */
import type { Metadata } from 'next';
import type { StaticImageData } from 'next/image';
import { cache } from 'react';
import { GALLERY, GALLERY_FILTERS, type GalleryItem } from '@/content/gallery';
import { GUIDES, type Guide } from '@/content/guides';
import { AMENITIES, FAQS, HOTEL, NEARBY, POLICIES } from '@/content/hotel';
import type { Photo } from '@/content/images';
import { ROOMS, type Room } from '@/content/rooms';
import { CMS_API_URL } from './config';

/** Seconds between background refreshes of a page's CMS content. */
export const REVALIDATE = 60;
const TIMEOUT_MS = 20_000;
const BUILDING = process.env.NEXT_PHASE === 'phase-production-build';
const LENIENT = BUILDING || process.env.NODE_ENV !== 'production';
/** Set when the CMS failed during a build, so the remaining pages don't each wait for the timeout. */
let downDuringBuild = false;

// ---- CMS public API shapes ---------------------------------------------------------------------

interface MediaRef {
  id: string;
  url: string;
  alt_text: string;
  caption?: string;
  width?: number;
  height?: number;
  sizes?: Record<string, { url: string; width: number; height: number }>;
  blur_data_url?: string;
}

export interface CmsHead {
  title: string;
  description: string;
  canonical: string;
  robots: string;
  og_type: string;
  og_title: string;
  og_description: string;
  og_url: string;
  og_image?: string;
  og_image_alt?: string;
  og_image_width?: number;
  og_image_height?: number;
}

export interface CmsEntry {
  id: string;
  type: string;
  title: string;
  slug: string;
  path: string;
  url: string;
  content: string;
  excerpt: string;
  template: string;
  menu_order: number;
  featured_media: MediaRef | null;
  fields: Record<string, unknown>;
  media: Record<string, MediaRef>;
  published_at: string | null;
  updated_at: string;
  head: CmsHead;
}

// ---- Fetching ---------------------------------------------------------------------------------

const UNREACHABLE = Symbol('unreachable');

/** GETs a public CMS endpoint. Returns null for 404, UNREACHABLE when the CMS is down during a build. */
async function get<T>(path: string): Promise<T | null | typeof UNREACHABLE> {
  if (downDuringBuild) return UNREACHABLE;
  try {
    const res = await Promise.race([
      fetch(CMS_API_URL + path, { next: { revalidate: REVALIDATE, tags: ['cms'] } }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error(`timed out after ${TIMEOUT_MS} ms`)), TIMEOUT_MS)),
    ]);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return (await res.json()) as T;
  } catch (err) {
    if (LENIENT) {
      if (BUILDING) downDuringBuild = true;
      console.warn(`CMS unavailable (${path}): ${(err as Error).message}. Using built-in content.`);
      return UNREACHABLE;
    }
    // At runtime, failing makes Next.js keep the last good version of the page.
    throw new Error(`CMS unavailable (${path}): ${(err as Error).message}`);
  }
}

const one = (type: string, path: string) =>
  get<{ data: CmsEntry }>(`/api/v1/content/${type}/by-path/${path}`).then((r) => (r && r !== UNREACHABLE ? r.data : null));

const list = (type: string, order: 'menu' | 'newest') =>
  get<{ data: CmsEntry[] }>(`/api/v1/content/${type}?order=${order}&per_page=100`).then((r) =>
    r && r !== UNREACHABLE ? r.data : [],
  );

// ---- Mapping helpers --------------------------------------------------------------------------

/** A CMS image shaped like a static import, so next/image gets its size and blur placeholder. */
function image(m: MediaRef | null | undefined): StaticImageData | undefined {
  if (!m) return undefined;
  const large = m.sizes?.large;
  const src = large ?? (m.width && m.height ? { url: m.url, width: m.width, height: m.height } : undefined);
  if (!src) return undefined;
  return { src: src.url, width: src.width, height: src.height, blurDataURL: m.blur_data_url || undefined };
}

function photo(m: MediaRef | null | undefined, alt?: string): Photo | undefined {
  const src = image(m);
  return src ? { src, alt: alt || m?.alt_text || '' } : undefined;
}

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' && v.trim() ? v : fallback);
const num = (v: unknown, fallback: number): number => (typeof v === 'number' && Number.isFinite(v) ? v : fallback);
const strings = (v: unknown, fallback: readonly string[] = []): string[] =>
  Array.isArray(v) && v.length ? v.map(String) : [...fallback];
const rows = (v: unknown): Record<string, string>[] =>
  Array.isArray(v) ? v.map((r) => Object.fromEntries(Object.entries(r as object).map(([k, x]) => [k, String(x)]))) : [];

/** Plain text of an HTML snippet (for room descriptions stored as rich text). */
function text(html: string): string {
  return html
    .replace(/<\/(p|li|h\d)>/g, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim();
}

// ---- Hotel settings ---------------------------------------------------------------------------

export type Hotel = {
  name: string;
  shortName: string;
  tagline: string;
  phoneDisplay: string;
  phoneTel: string;
  whatsapp: string;
  whatsappUrl: string;
  email: string;
  address: string;
  street: string;
  locality: string;
  region: string;
  postalCode: string;
  geo: { lat: number; lng: number };
  mapsUrl: string;
  mapEmbed: string;
  rating: { value: number; count: number; source: string };
  review: { quote: string; author: string; source: string };
  distances: { airport: string; busPark: string; kathmandu: string };
  roomCount: number;
  languages: { name: string; code: string }[];
  payment: string[];
  profiles: Record<string, string>;
  policies: { term: string; detail: string }[];
  amenities: { icon: string; label: string }[];
  nearby: { name: string; note: string; time: string }[];
  faqs: { q: string; a: string }[];
};

const LANGUAGE_CODES: Record<string, string> = { english: 'en', hindi: 'hi', nepali: 'ne', chinese: 'zh', french: 'fr', german: 'de' };

function builtInHotel(): Hotel {
  return {
    ...HOTEL,
    whatsappUrl: `https://wa.me/${HOTEL.whatsapp}`,
    email: '',
    geo: { ...HOTEL.geo },
    rating: { ...HOTEL.rating },
    review: { ...HOTEL.review },
    distances: { ...HOTEL.distances },
    languages: HOTEL.languages.map((l) => ({ ...l })),
    payment: [...HOTEL.payment],
    profiles: { ...HOTEL.profiles },
    policies: POLICIES.map((p) => ({ ...p })),
    amenities: AMENITIES.map((a) => ({ ...a })),
    nearby: NEARBY.map((n) => ({ ...n })),
    faqs: FAQS.map((f) => ({ ...f })),
  };
}

/** The hotel's facts: the CMS "Hotel settings" entry over the built-in defaults. */
export const getHotel = cache(async (): Promise<Hotel> => {
  const base = builtInHotel();
  const e = await one('settings', 'hotel');
  if (!e) return base;
  const f = e.fields;
  const phone = str(f.phone, base.phoneDisplay);
  const whatsapp = str(f.whatsapp, base.whatsapp).replace(/\D/g, '');
  const policies = rows(f.policies).map((r) => ({ term: r.term ?? '', detail: r.detail ?? '' })).filter((p) => p.term);
  const amenities = rows(f.amenities).map((r) => ({ icon: r.icon || 'heart', label: r.label ?? '' })).filter((a) => a.label);
  const nearby = rows(f.nearby).map((r) => ({ name: r.name ?? '', note: r.note ?? '', time: r.time ?? '' })).filter((n) => n.name);
  const faqs = rows(f.faqs).map((r) => ({ q: r.question ?? '', a: r.answer ?? '' })).filter((x) => x.q && x.a);
  return {
    ...base,
    phoneDisplay: phone,
    phoneTel: phone.replace(/[^\d+]/g, ''),
    whatsapp,
    whatsappUrl: `https://wa.me/${whatsapp}`,
    email: str(f.email),
    address: str(f.address, base.address),
    street: str(f.street, base.street),
    locality: str(f.locality, base.locality),
    region: str(f.region, base.region),
    postalCode: str(f.postal_code, base.postalCode),
    mapsUrl: str(f.maps_url, base.mapsUrl),
    roomCount: num(f.room_count, base.roomCount),
    rating: { value: num(f.rating_value, base.rating.value), count: num(f.rating_count, base.rating.count), source: base.rating.source },
    review: { quote: str(f.review_quote, base.review.quote), author: str(f.review_author, base.review.author), source: str(f.review_source, base.review.source) },
    distances: {
      airport: str(f.distance_airport, base.distances.airport),
      busPark: str(f.distance_bus_park, base.distances.busPark),
      kathmandu: str(f.distance_kathmandu, base.distances.kathmandu),
    },
    languages: strings(f.languages, base.languages.map((l) => l.name)).map((name) => ({
      name,
      code: LANGUAGE_CODES[name.toLowerCase()] ?? name.slice(0, 2).toLowerCase(),
    })),
    payment: strings(f.payment, base.payment),
    profiles: {
      ...base.profiles,
      google: str(f.google_url, base.profiles.google),
      facebook: str(f.facebook_url, base.profiles.facebook),
      tripadvisor: str(f.tripadvisor_url, base.profiles.tripadvisor),
      ebookingNepal: str(f.ebooking_url, base.profiles.ebookingNepal),
    },
    policies: policies.length ? policies : base.policies,
    amenities: amenities.length ? amenities : base.amenities,
    nearby: nearby.length ? nearby : base.nearby,
    faqs: faqs.length ? faqs : base.faqs,
  };
});

/** WhatsApp link with a pre-filled message. */
export const whatsappLink = (hotel: Pick<Hotel, 'whatsappUrl'>, message: string) =>
  `${hotel.whatsappUrl}?text=${encodeURIComponent(message)}`;

// ---- Rooms --------------------------------------------------------------------------------------

function roomFrom(e: CmsEntry, i: number): Room | null {
  const main = photo(e.featured_media, `${e.title} at ${HOTEL.name}, Manthali`);
  const photos = strings(e.fields.photos)
    .map((id) => photo(e.media[id]))
    .filter((p): p is Photo => !!p);
  const cover = main ?? photos[0];
  if (!cover) return null; // a room needs at least one photo to be shown
  const builtIn = ROOMS.find((r) => r.slug === e.slug);
  return {
    slug: e.slug,
    anchor: builtIn?.anchor ?? e.slug,
    num: String(i + 1).padStart(2, '0'),
    name: e.title,
    tag: str(e.fields.tag, 'Room'),
    price: num(e.fields.price_npr, 0),
    maxGuests: num(e.fields.max_guests, 2),
    beds: str(e.fields.beds),
    image: cover,
    summary: e.excerpt,
    description: text(e.content),
    features: strings(e.fields.features),
    photos: photos.length ? photos : [cover],
    head: e.head,
  };
}

/** The room types, in the CMS order. */
export const getRooms = cache(async (): Promise<Room[]> => {
  const entries = await list('room', 'menu');
  const rooms = entries.map(roomFrom).filter((r): r is Room => !!r);
  return rooms.length ? rooms : ROOMS;
});

export async function getRoom(slug: string): Promise<Room | undefined> {
  return (await getRooms()).find((r) => r.slug === slug);
}

/** "NPR 2,000"-style lowest room price. */
export async function getPriceFrom(): Promise<number> {
  const rooms = await getRooms();
  return Math.min(...rooms.map((r) => r.price).filter((p) => p > 0));
}

// ---- Gallery ------------------------------------------------------------------------------------

const CATEGORIES = new Set(GALLERY_FILTERS.map((f) => f.key));

/** The gallery page's photos, from the CMS "Gallery" page. */
export const getGallery = cache(async (): Promise<GalleryItem[]> => {
  const page = await getPage('gallery');
  const items = rows(page?.fields.photos)
    .map((r) => {
      const p = photo(page!.media[r.photo], r.caption);
      const cat = CATEGORIES.has(r.category as never) ? (r.category as GalleryItem['cat']) : 'hotel';
      return p ? { ...p, cat } : null;
    })
    .filter((x): x is GalleryItem => !!x);
  return items.length ? items : GALLERY;
});

// ---- Guides --------------------------------------------------------------------------------------

const toDate = (iso: string | null | undefined) => (iso ? iso.slice(0, 10) : '');

function guideFrom(e: CmsEntry): Guide | null {
  const hero = photo(e.featured_media);
  if (!hero) return null;
  const f = e.fields;
  const words = text(e.content).split(' ').length;
  const credit =
    str(f.hero_credit_author) && str(f.hero_credit_url)
      ? {
          author: str(f.hero_credit_author),
          sourceUrl: str(f.hero_credit_url),
          license: str(f.hero_credit_license, 'Licence'),
          licenseUrl: str(f.hero_credit_license_url, str(f.hero_credit_url)),
        }
      : undefined;
  return {
    slug: e.slug,
    title: e.title,
    heading: [str(f.heading, e.title), str(f.heading_accent)],
    eyebrow: str(f.eyebrow, 'Guide'),
    description: e.excerpt || e.head.description,
    hero,
    heroCredit: credit,
    published: toDate(e.published_at),
    updated: str(f.updated_on) || toDate(e.updated_at),
    readMins: num(f.read_minutes, Math.max(1, Math.round(words / 200))),
    facts: rows(f.facts).map((r) => [r.term ?? '', r.value ?? ''] as [string, string]).filter(([t]) => t),
    body: [],
    html: e.content,
    sources: rows(f.sources).map((r) => ({ label: r.label ?? r.url ?? '', url: r.url ?? '' })).filter((s) => s.url),
    head: e.head,
  };
}

/** Published posts (guides, news, offers), newest first. */
export const getGuides = cache(async (): Promise<Guide[]> => {
  const entries = await list('post', 'newest');
  const guides = entries.map(guideFrom).filter((g): g is Guide => !!g);
  return guides.length ? guides : GUIDES;
});

export async function getGuide(slug: string): Promise<Guide | undefined> {
  return (await getGuides()).find((g) => g.slug === slug);
}

// ---- Pages and SEO ---------------------------------------------------------------------------

/** The CMS entry for one of the site's pages ("home", "rooms", "gallery"...), if any. */
export const getPage = cache(async (slug: string): Promise<CmsEntry | null> => one('page', slug));

/** Turns a CMS head into Next.js metadata. `absolute` skips the "| Hotel name" title suffix. */
export function headMetadata(head: CmsHead, path: string, opts: { absolute?: boolean; type?: 'website' | 'article' } = {}): Metadata {
  const robots = head.robots.split(',').map((s) => s.trim());
  const ogImages = head.og_image
    ? [{ url: head.og_image, width: head.og_image_width, height: head.og_image_height, alt: head.og_image_alt }]
    : undefined;
  return {
    title: opts.absolute ? { absolute: head.title } : head.title,
    description: head.description || undefined,
    // The CMS fills canonical with the entry's own URL unless an editor set another one.
    alternates: { canonical: head.canonical === head.og_url ? path : head.canonical },
    robots: { index: !robots.includes('noindex'), follow: !robots.includes('nofollow') },
    openGraph: {
      type: opts.type ?? 'website',
      siteName: HOTEL.name,
      locale: 'en_US',
      title: head.og_title,
      description: head.og_description || undefined,
      url: path,
      ...(ogImages ? { images: ogImages } : {}),
    },
    ...(ogImages ? { twitter: { card: 'summary_large_image' as const, images: ogImages.map((i) => i.url) } } : {}),
  };
}

/** Metadata for a site page from its CMS entry, or `fallback` when the CMS has none. */
export async function pageMetadata(slug: string, path: string, fallback: Metadata, opts: { absolute?: boolean } = {}): Promise<Metadata> {
  const page = await getPage(slug);
  return page ? headMetadata(page.head, path, opts) : fallback;
}
