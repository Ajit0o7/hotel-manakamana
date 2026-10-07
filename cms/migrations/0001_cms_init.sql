-- Hotel Manakamana CMS: initial schema.
--
-- Everything lives in a dedicated "cms" schema instead of "public". Supabase
-- exposes "public" through its auto-generated REST API (PostgREST) to anyone
-- holding the anon key, which is shipped to browsers. Keeping CMS tables out
-- of it means they are only reachable through the Go API, which enforces
-- admin authentication. RLS is enabled as a second line of defence.

create schema if not exists cms;

-- Keep updated_at current on every UPDATE.
create or replace function cms.set_updated_at() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

-------------------------------------------------------------------------------
-- Media library. Files live in Supabase Storage; this table holds metadata.
-------------------------------------------------------------------------------
create table cms.media (
  id           uuid primary key default gen_random_uuid(),
  bucket       text   not null,
  object_path  text   not null,
  filename     text   not null,
  mime_type    text   not null,
  kind         text   not null check (kind in ('image', 'video', 'document')),
  size_bytes   bigint not null check (size_bytes >= 0),
  width        integer check (width > 0),
  height       integer check (height > 0),
  title        text   not null default '',
  alt_text     text   not null default '',
  caption      text   not null default '',
  description  text   not null default '',
  -- Generated renditions keyed by size name:
  -- {"thumbnail": {"path": ..., "mime_type": ..., "width": ..., "height": ..., "size_bytes": ...}, ...}
  variants     jsonb  not null default '{}'::jsonb check (jsonb_typeof(variants) = 'object'),
  uploaded_by  uuid,  -- auth.users.id of the uploader
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  constraint media_object_key unique (bucket, object_path)
);

create index media_created_idx on cms.media (created_at desc, id);
create index media_kind_created_idx on cms.media (kind, created_at desc);

create trigger media_set_updated_at before update on cms.media
  for each row execute function cms.set_updated_at();

-------------------------------------------------------------------------------
-- Content entries: one table for every content type (page, post, and any type
-- registered later), WordPress-style. Type-specific data goes in "fields".
-------------------------------------------------------------------------------
create table cms.entries (
  id                uuid primary key default gen_random_uuid(),
  type              text not null check (type ~ '^[a-z][a-z0-9_-]{0,63}$'),
  title             text not null check (title <> ''),
  slug              text not null check (slug <> '' and position('/' in slug) = 0),
  -- Slugs of all ancestors and this entry joined with "/", e.g. "about/team".
  -- Maintained by triggers below; never written by the application.
  path              text not null default '',
  content           text not null default '',
  excerpt           text not null default '',
  status            text not null default 'draft'
                    check (status in ('draft', 'published', 'archived')),
  parent_id         uuid references cms.entries (id) on delete restrict,
  menu_order        integer not null default 0,
  template          text not null default '',
  featured_media_id uuid references cms.media (id) on delete set null,
  fields            jsonb not null default '{}'::jsonb check (jsonb_typeof(fields) = 'object'),
  author_id         uuid, -- auth.users.id
  -- When the entry goes (or went) live. A published entry with a future
  -- date is scheduled.
  published_at      timestamptz,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now(),

  constraint entries_published_has_date check (status <> 'published' or published_at is not null),
  constraint entries_not_own_parent check (parent_id is null or parent_id <> id),
  -- Unique URL per type. For flat types path = slug, so slugs are unique;
  -- for hierarchical types, slugs are unique among siblings.
  constraint entries_type_path_key unique (type, path)
);

create index entries_listing_idx on cms.entries (type, status, published_at desc);
create index entries_parent_idx on cms.entries (parent_id, menu_order) where parent_id is not null;
create index entries_featured_media_idx on cms.entries (featured_media_id) where featured_media_id is not null;
create index entries_fields_idx on cms.entries using gin (fields jsonb_path_ops);

create trigger entries_set_updated_at before update on cms.entries
  for each row execute function cms.set_updated_at();

-- Compute "path" from the parent's path, and refuse parents of another type
-- or parents that are descendants of the entry (which would form a cycle).
-- (Written without a DECLARE block: the Supabase SQL editor splits scripts
-- into statements and cuts functions that declare variables in half.)
create or replace function cms.entries_set_path() returns trigger
language plpgsql as $$
begin
  if new.parent_id is null then
    new.path := new.slug;
    return new;
  end if;

  if not exists (select 1 from cms.entries p where p.id = new.parent_id) then
    raise foreign_key_violation using message = 'parent entry does not exist',
      constraint = 'entries_parent_id_fkey';
  end if;
  if exists (select 1 from cms.entries p where p.id = new.parent_id and p.type <> new.type) then
    raise check_violation using message = 'parent entry must have the same type',
      constraint = 'entries_parent_same_type';
  end if;
  if tg_op = 'UPDATE' and exists (
    select 1 from cms.entries p
    where p.id = new.parent_id and (p.path = old.path or starts_with(p.path, old.path || '/'))
  ) then
    raise check_violation using message = 'an entry cannot be moved below itself',
      constraint = 'entries_parent_cycle';
  end if;

  new.path := (select p.path from cms.entries p where p.id = new.parent_id) || '/' || new.slug;
  return new;
end $$;

create trigger entries_set_path before insert or update of slug, parent_id on cms.entries
  for each row execute function cms.entries_set_path();

-- When an entry's path changes, rewrite its children's paths (which in turn
-- fires this trigger for their children). This must be a plain AFTER UPDATE
-- trigger: "UPDATE OF path" would not fire, because path is changed by the
-- BEFORE trigger above rather than named in the UPDATE's SET list.
create or replace function cms.entries_cascade_path() returns trigger
language plpgsql as $$
begin
  update cms.entries set path = new.path || '/' || slug where parent_id = new.id;
  return null;
end $$;

create trigger entries_cascade_path after update on cms.entries
  for each row when (old.path is distinct from new.path)
  execute function cms.entries_cascade_path();

-------------------------------------------------------------------------------
-- Yoast-style SEO metadata, one row per entry.
-------------------------------------------------------------------------------
create table cms.seo_data (
  entry_id          uuid primary key references cms.entries (id) on delete cascade,
  meta_title        text    not null default '',
  meta_description  text    not null default '',
  focus_keyword     text    not null default '',
  canonical_url     text    not null default '',
  og_title          text    not null default '',
  og_description    text    not null default '',
  og_image_id       uuid references cms.media (id) on delete set null,
  og_image_url      text    not null default '',
  no_index          boolean not null default false,
  no_follow         boolean not null default false,
  -- Scores from the analyzer (0–100), refreshed on every save.
  seo_score         smallint check (seo_score between 0 and 100),
  readability_score smallint check (readability_score between 0 and 100),
  updated_at        timestamptz not null default now()
);

create index seo_data_og_image_idx on cms.seo_data (og_image_id) where og_image_id is not null;

create trigger seo_data_set_updated_at before update on cms.seo_data
  for each row execute function cms.set_updated_at();

-------------------------------------------------------------------------------
-- Convenience views for reporting and the Supabase table editor.
-------------------------------------------------------------------------------
create view cms.pages with (security_invoker = true) as
  select e.*, s.meta_title, s.meta_description, s.focus_keyword, s.canonical_url,
         s.og_title, s.og_description, s.og_image_id, s.og_image_url,
         s.no_index, s.no_follow, s.seo_score, s.readability_score
  from cms.entries e left join cms.seo_data s on s.entry_id = e.id
  where e.type = 'page';

create view cms.posts with (security_invoker = true) as
  select e.*, s.meta_title, s.meta_description, s.focus_keyword, s.canonical_url,
         s.og_title, s.og_description, s.og_image_id, s.og_image_url,
         s.no_index, s.no_follow, s.seo_score, s.readability_score
  from cms.entries e left join cms.seo_data s on s.entry_id = e.id
  where e.type = 'post';

-------------------------------------------------------------------------------
-- Lock down access. The Go API connects as the table owner (postgres), which
-- bypasses RLS; Supabase's API roles get nothing.
-------------------------------------------------------------------------------
alter table cms.media    enable row level security;
alter table cms.entries  enable row level security;
alter table cms.seo_data enable row level security;

do $$
begin
  if exists (select 1 from pg_roles where rolname = 'anon') then
    revoke all on schema cms from anon, authenticated;
    revoke all on all tables in schema cms from anon, authenticated;
  end if;
end $$;

-- Create the public media bucket when running on Supabase (skipped on plain
-- Postgres, e.g. in tests). Change the name here if you set
-- SUPABASE_STORAGE_BUCKET to something other than "media".
do $$
begin
  if to_regclass('storage.buckets') is not null then
    insert into storage.buckets (id, name, public)
    values ('media', 'media', true)
    on conflict (id) do nothing;
  end if;
end $$;
