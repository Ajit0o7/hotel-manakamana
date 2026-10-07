# Hotel Manakamana Airport View — website (Next.js)

Next.js 16 (App Router, TypeScript, React 19) version of the static site in the parent folder, with the same
design, plus room pages, a price calculator, live Manthali weather, SEO and more.

## Run it

Needs **Node.js 20.9 or newer** (tested on Node 25).

```bash
npm install
npm run dev        # http://localhost:3000
npm run build      # production build
npm run start      # serve the production build
npm run lint
```

## Where things live

| What | File |
|---|---|
| Hotel facts, phone, address, amenities, policies, FAQs, nearby places | `src/content/hotel.ts` |
| Rooms, prices, room photos | `src/content/rooms.ts` |
| Gallery photos and filters | `src/content/gallery.ts` |
| All photos (static imports → automatic blur placeholders) | `src/assets/images/`, `src/content/images.ts` |
| Global styles (ported 1:1 from the static site) | `src/app/globals.css` |
| Emblem (loading screen) and pagoda mark | `src/components/brand/` |
| Page-transition curtain | `src/components/layout/CurtainProvider.tsx` |
| Scroll reveals, parallax, counters, magnetic buttons, smooth scroll | `src/components/layout/Motion.tsx` |

To change a price, a phone number or an amenity, edit the file in `src/content/` and every page updates.

## Features

- Emblem loading screen (draws itself on the first visit) and curtain transitions between pages (`<TLink>`).
- Home hero slideshow, word-by-word headings, image wipes, parallax, count-ups, marquee, label-roll buttons.
- **Room pages** (`/rooms/deluxe-double-room`, `/rooms/double-room`) with photo gallery and a live price calculator.
- **Booking enquiry** with nights × rooms × price estimate, validation and WhatsApp hand-off; dates carry over from the home booking bar and room pages.
- **Live Manthali weather and local time** (Open-Meteo, cached 30 minutes; hidden if unavailable).
- "Your stay, step by step" pinned sideways-scroll section.
- `next/image` (AVIF/WebP, responsive sizes, blur-up) and `next/font` (self-hosted Cormorant Garamond + Manrope).
- SEO: per-page titles/descriptions, canonical URLs, generated share image (`/opengraph-image`), `sitemap.xml`, `robots.txt`, JSON-LD (Hotel, HotelRoom + Offer, FAQPage).
- Installable app manifest and icons, branded 404 page, skip link, reduced-motion and no-JavaScript fallbacks.

## Settings

- `NEXT_PUBLIC_SITE_URL` — the live domain, used for the sitemap, canonical URLs and share links.
  Defaults to `https://www.hotelmanthali.com` (shown on the hotel's own flyer); set it if the site goes live elsewhere.

## Before going live — please confirm with the owner

- Room prices (from the eBooking Nepal listing, September 2026) and which photos show which room type.
- That `+977 984-4228627` is on WhatsApp.
- Permission to use the photos (some come from Google / Facebook / eBooking Nepal).
- Address wording: Google lists "Manthali Bus Stand"; the hotel's logo says "Traffic Chowk, Manthali".

## CMS and admin dashboard

- **Admin dashboard:** `/admin` (e.g. https://manakamana-next.vercel.app/admin). Sign in with a Supabase account that has
  the CMS admin role, then manage pages, posts (with Yoast-style SEO checks) and the media library. The code is in
  `src/app/admin` and `src/components/admin`; the public site's pages live in `src/app/(site)`.
- **CMS API:** `cms/` is a separate Go server (Supabase Postgres, Auth and Storage) that stores everything. See
  [`cms/README.md`](cms/README.md).

The public pages do not read from the CMS yet; they still use the files in `src/content/`.

The admin finds its services through these settings. The defaults point at this project, so nothing needs setting:

| Variable | Default |
|---|---|
| `NEXT_PUBLIC_CMS_API_URL` | `https://hotel-manakamana.onrender.com` |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://rtusjzvbkuwktjxammda.supabase.co` |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | this project's publishable key |

The CMS server only accepts browser requests from origins listed in its `CORS_ALLOWED_ORIGINS`, so add any new domain
(for example a custom domain) there too.
