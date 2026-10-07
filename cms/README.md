# Hotel Manakamana CMS (Go + Supabase)

A headless, WordPress-style CMS for the hotel website. The Next.js site on
Vercel reads published content from this API; editors manage pages, posts and
the media library through the admin endpoints.

- **Go 1.26**, [Gin](https://gin-gonic.com), [pgx](https://github.com/jackc/pgx)
- **Supabase**: Postgres (content), Auth (admin sign-in, JWT), Storage (media files)
- Pages and posts, drafts, publishing and scheduling, nested pages
- Yoast-style SEO fields on every entry, an SEO and readability analyzer, and
  ready-to-use `<head>` data for the frontend
- Media library with automatic thumbnails, responsive WebP sizes and a
  1200×630 social-card crop
- New content types can be added with a few lines of Go or a JSON file, with no migration

## Layout

```
cms/
├── cmd/
│   ├── server/          HTTP server entry point
│   └── migrate/         applies migrations/*.sql
├── migrations/          SQL schema (embedded into the binaries)
├── examples/            sample extra content types (JSON)
└── internal/
    ├── app/             composition root: builds and wires every component
    ├── config/          environment variables
    ├── httpapi/         Gin router, handlers, auth/CORS/logging middleware
    ├── auth/            Supabase JWT verification (JWKS + legacy HS256)
    ├── content/         entries, content-type registry, custom fields, service
    │   └── postgres/    content repository (pgx)
    ├── media/           media library service, upload validation
    │   └── postgres/    media repository (pgx)
    ├── seo/             SEO metadata struct + pluggable analyzer
    ├── imaging/         resizing, EXIF rotation, WebP/JPEG renditions
    ├── sanitize/        HTML sanitizer for editor content
    ├── platform/
    │   ├── database/    connection pool, migration runner, query helpers
    │   └── supabase/    Supabase Storage client
    ├── apperr/          error codes shared by services and HTTP layer
    └── testdb/          throwaway databases for integration tests
```

Dependencies point inwards. `content` and `media` define the interfaces they
need (`Repository`, `ObjectStore`, `ImageProcessor`, `MediaResolver`,
`Sanitizer`), and `internal/app` injects the implementations. Swapping
Supabase Storage for S3, say, means writing one `media.ObjectStore`.

## Data model

All tables live in a dedicated `cms` schema (see
[`migrations/0001_cms_init.sql`](migrations/0001_cms_init.sql)).

| Table | Purpose |
|---|---|
| `cms.entries` | Every page, post and custom-type entry, WordPress-style (`type` column). Type-specific data goes in the `fields` JSONB column. |
| `cms.seo_data` | One row per entry: meta title and description, focus keyword, canonical URL, OG title, description and image, noindex, nofollow, plus the latest SEO and readability scores. |
| `cms.media` | Media library metadata. The files themselves are in Supabase Storage. |
| `cms.pages`, `cms.posts` | Read-only views joining entries with their SEO data. |

Nested pages store a `path` (`about-us/team`), maintained by triggers. Paths
are unique per type, renaming a page updates all its descendants, and the
database rejects cycles and cross-type parents.

> **Why not the `public` schema?** Supabase serves `public` through its REST
> API to anyone holding the anon key, and the anon key ships to browsers.
> Keeping CMS tables in `cms` means writes can only go through this API,
> which checks admin rights. RLS is enabled too, as a second barrier. The Go
> server connects as `postgres`, which owns the tables, so RLS does not get
> in its way.

## Setup

### 1. Supabase

1. Create a project (or use the existing one).
2. Apply the schema, either:
   - `DATABASE_URL=... go run ./cmd/migrate` (records applied versions in `cms.schema_migrations`), or
   - paste `migrations/0001_cms_init.sql` into the SQL editor.

   This also creates a **public** Storage bucket called `media`.
3. Create the admin user (Authentication → Users → Add user), then give them
   the CMS role. `app_metadata` can only be changed server-side, so users
   cannot promote themselves:

   ```sql
   update auth.users
   set raw_app_meta_data = coalesce(raw_app_meta_data, '{}'::jsonb) || '{"cms_role": "admin"}'
   where email = 'owner@hotelmanthali.com';
   ```

   The role is read from the access token, so the user must sign in again
   after the change.

### 2. Configure

```bash
cp .env.example .env   # fill in DATABASE_URL, SUPABASE_URL, SUPABASE_SECRET_KEY...
```

| Variable | Required | Notes |
|---|---|---|
| `DATABASE_URL` | yes | Supabase connection string. On the transaction pooler (port 6543) the server switches to the simple query protocol automatically. |
| `SUPABASE_URL` | yes | `https://<ref>.supabase.co`. Also used to find the JWKS and to check the token issuer. |
| `SUPABASE_SECRET_KEY` | yes | `sb_secret_…` or the legacy `service_role` key (`SUPABASE_SERVICE_ROLE_KEY` also works). Used only for Storage. **Never expose it to a browser.** |
| `SUPABASE_JWT_SECRET` | no | Set it only if user tokens are still signed with the legacy HS256 secret. |
| `SUPABASE_STORAGE_BUCKET` | no | Default `media`. |
| `CMS_ALLOWED_ROLES` | no | `app_metadata.cms_role` values allowed in. Default `admin`. |
| `CORS_ALLOWED_ORIGINS` | no | Comma-separated browser origins, e.g. your Vercel domains. |
| `SITE_URL` | no | Public site origin. Default `https://www.hotelmanthali.com`. |
| `MAX_UPLOAD_MB` | no | Default `50`. |
| `CONTENT_TYPES_FILE` | no | JSON file with extra content types. |
| `PORT`, `LOG_LEVEL`, `SHUTDOWN_TIMEOUT` | no | Defaults: `8080`, `info`, `15s`. |

### 3. Run

```bash
set -a; source .env; set +a
go run ./cmd/migrate
go run ./cmd/server          # http://localhost:8080/healthz
```

Or with Docker:

```bash
docker build -t hotel-cms .
docker run --env-file .env --entrypoint /app/migrate hotel-cms
docker run --env-file .env -p 8080:8080 hotel-cms
```

The server is a long-running process, so deploy it to a container host
(Fly.io, Render, Railway, Cloud Run...) rather than to Vercel functions. Point
the Next.js site at it with an environment variable such as `CMS_API_URL`.

## API

Responses are JSON: `{"data": ...}`, plus `"meta": {"page", "per_page", "total"}`
for lists. Errors look like `{"error": {"code", "message", "fields"}}`, using
these status codes:
`401` (not signed in), `403` (not a CMS admin), `404`, `409` (slug taken, or the
page has children), `413`, `415` (file type not allowed), `422` (validation, with
per-field messages).

### Public (no auth; published content only)

| Method | Path | |
|---|---|---|
| GET | `/api/v1/content-types` | Registered types and their fields |
| GET | `/api/v1/content/:type` | List. Query: `page`, `per_page` (≤100), `parent=<id>`, `root=true`, `search`, `order=menu\|newest\|updated`, `field.<name>=<value>` |
| GET | `/api/v1/content/:type/by-path/*path` | One entry, e.g. `/content/page/by-path/about-us/team` |

Public entries include `url`, the embedded `featured_media` (with all
renditions), and a resolved `head`:

```json
"head": {
  "title": "Meet the team",
  "description": "…",
  "canonical": "https://www.hotelmanthali.com/about-us/team",
  "robots": "index, follow",
  "og_type": "website",
  "og_title": "Meet the team",
  "og_description": "…",
  "og_url": "https://www.hotelmanthali.com/about-us/team",
  "og_image": "https://<ref>.supabase.co/storage/v1/object/public/media/2026/10/<id>/team-og.jpg",
  "og_image_width": 1200,
  "og_image_height": 630,
  "twitter_card": "summary_large_image"
}
```

Fallbacks follow Yoast: meta title → title, meta description → excerpt, OG
fields → meta fields, OG image → featured image, canonical → the entry's own URL.
A page with slug `home` at the top level maps to `/`, and posts live under `/blog/`.

The frontend can map `head` straight onto Next.js `generateMetadata`:

```ts
const res = await fetch(`${process.env.CMS_API_URL}/api/v1/content/page/by-path/${path}`);
if (res.status === 404) notFound();
const { data: page } = await res.json();
// page.head.title, page.head.description, page.head.canonical, page.head.og_image ...
```

### Admin (`Authorization: Bearer <Supabase access token>`)

| Method | Path | |
|---|---|---|
| GET | `/api/v1/admin/me` | The signed-in admin |
| GET | `/api/v1/admin/content/:type` | List in any status; also `status=draft,published,archived` |
| POST | `/api/v1/admin/content/:type` | Create |
| GET / PUT / DELETE | `/api/v1/admin/content/:type/:id` | Read, replace, delete |
| POST | `/api/v1/admin/content/:type/:id/publish` | Publish now, or schedule with `{"published_at": "…"}` |
| POST | `/api/v1/admin/content/:type/:id/unpublish` | Back to draft |
| GET | `/api/v1/admin/content/:type/:id/seo-analysis` | Full SEO and readability report |
| POST | `/api/v1/admin/seo/analyze` | Analyze unsaved content (live editor feedback) |
| GET / POST | `/api/v1/admin/media` | List (`kind`, `search`, paging), or upload (multipart) |
| GET / PATCH / DELETE | `/api/v1/admin/media/:id` | Read, edit metadata, delete (file and renditions) |

Create a page:

```bash
curl -X POST "$CMS/api/v1/admin/content/page" -H "Authorization: Bearer $TOKEN" \
  -H "Content-Type: application/json" -d '{
    "title": "Rooms",
    "template": "rooms",
    "status": "published",
    "content": "<p>Two room types, both with hot water and runway views.</p>",
    "featured_media_id": "8f6c…",
    "fields": {"subtitle": "Sleep steps from Ramechhap Airport"},
    "seo": {
      "meta_title": "Rooms near Ramechhap Airport | Hotel Manakamana",
      "meta_description": "Deluxe and double rooms 5 minutes from Ramechhap Airport…",
      "focus_keyword": "rooms near Ramechhap Airport",
      "og_image_id": null,
      "no_index": false
    }
  }'
```

Leave `slug` empty to derive it from the title. Set `parent_id` to nest a page.
`PUT` replaces every editable field, so send the whole entry. Saving runs the
analyzer and stores `seo.seo_score` and `seo.readability_score`, which admin
list views can show as traffic lights.

Upload a file:

```bash
curl -X POST "$CMS/api/v1/admin/media" -H "Authorization: Bearer $TOKEN" \
  -F file=@rooftop.jpg -F "alt_text=Rooftop terrace at sunset" -F "title=Rooftop"
```

The file type is detected from its content, not its name. Accepted: JPEG, PNG,
GIF, WebP, AVIF, MP4, WebM, MOV, PDF, DOCX, XLSX, PPTX, TXT and CSV. SVG and
HTML are refused, because they can carry scripts. For JPEG, PNG, GIF and WebP
images the server:

1. applies the EXIF orientation, so phone photos are upright;
2. generates `thumbnail` (300×300 crop), `medium` (768 wide), `large` (fits in
   1600×1600), all WebP, plus `og` (a 1200×630 JPEG for social cards);
3. never upscales, and refuses images over 50 megapixels.

Objects are stored at `YYYY/MM/<uuid>/<name>[-<size>].<ext>` with a one-year
cache lifetime. If any step fails, the files already uploaded are deleted
again.

## Adding a content type

Every type shares `cms.entries`, so no migration is needed. In Go, add it to
`RegisterContentTypes` in `internal/app/app.go`:

```go
r.MustRegister(content.ContentType{
	Name:        "offer",
	Label:       "Special offer",
	RoutePrefix: "/offers",
	Fields: []content.Field{
		{Name: "price_npr", Label: "Price (NPR)", Type: content.FieldNumber, Required: true},
		{Name: "valid_until", Label: "Valid until", Type: content.FieldDate},
		{Name: "includes", Label: "Includes", Type: content.FieldList},
	},
	// Optional: custom permalinks.
	Permalink: func(e *content.Entry) string { return "/offers/" + e.Slug },
})
```

Or without recompiling, list types in a JSON file and set
`CONTENT_TYPES_FILE` (see [`examples/content-types.json`](examples/content-types.json),
which defines a `room` type). The new type immediately gets every endpoint
(`/api/v1/content/offer`, `/api/v1/admin/content/offer`...), SEO metadata,
analysis, publishing and field validation.

Field types: `text`, `textarea`, `richtext` (sanitized HTML), `number`,
`integer`, `boolean`, `date`, `datetime`, `url`, `email`, `media` (must exist
in the library), `select` (with `options`), `list` (array of strings). Unknown
fields are rejected, so typos surface as errors instead of being silently lost.

## SEO analyzer

`seo.Analyzer` runs a list of `seo.Check`s and scores each category from 0 to
100 (≥70 good, ≥40 ok). Built-in checks:

- **SEO**: focus keyword set; keyword in SEO title (best at the start), meta
  description, slug, first paragraph and H2/H3 subheadings; keyword density
  (0.5–3%); title length (30–60 characters); meta description length
  (120–156); text length (≥300 words); image alt text; internal and outbound
  links; social image; noindex warning.
- **Readability**: sentence length (≤25% over 20 words), paragraph length,
  subheading distribution, Flesch reading ease, repeated sentence openings,
  transition words.

Text is tokenized with Unicode rules, so Nepali (Devanagari) content works.
English-only checks (Flesch, transition words) are skipped for text that is
not mostly Latin script. Add a rule:

```go
analyzer.Register(seo.NewCheck("mentions_airport", seo.CategorySEO, func(d *seo.Document) *seo.Result {
	if seo.ContainsPhrase(d.Words, seo.Words("ramechhap airport")) {
		return &seo.Result{Status: seo.StatusGood, Message: "Mentions Ramechhap Airport."}
	}
	return &seo.Result{Status: seo.StatusOK, Message: "Guests search for the airport; mention it."}
}))
```

## Security notes

- Admin endpoints accept only Supabase access tokens that pass signature,
  `exp`, `iss` and `aud` checks, and that carry `app_metadata.cms_role` in
  `CMS_ALLOWED_ROLES`. Anonymous users are rejected. Signing algorithms are
  pinned: ES256, RS256 and EdDSA through JWKS, and HS256 only when a legacy
  secret is configured.
- Editor HTML is sanitized with bluemonday (scripts, event handlers, iframes
  and `javascript:` URLs are removed), so a stolen admin session cannot plant
  scripts on the public site.
- Uploads are sniffed and checked against an allow-list, and stored under
  server-generated names.
- The Storage secret key never leaves the server.

## Tests

```bash
go test ./...                       # unit tests
# Integration and end-to-end tests need a Postgres 15+ server where the user can
# create databases. Each test makes its own throwaway database.
CMS_TEST_DATABASE_URL=postgres://postgres@localhost:5432/postgres go test ./...
```

The end-to-end test drives the real router, services and Postgres
repositories. It uses the real Storage client against a fake Supabase Storage
server, and real JWT verification.

## Possible next steps

- Taxonomies (categories and tags tables) if the `category` select field outgrows itself
- Revisions and autosave (an `entry_revisions` table written on update)
- On-demand ISR: call a Next.js revalidation webhook after publish
- Direct-to-Storage signed uploads for very large videos
- Background image processing for big batches
