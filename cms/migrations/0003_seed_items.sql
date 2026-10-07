-- Remembers what the one-time content import created (keyed by the bundle's
-- item keys), so the import never runs an item twice or duplicates anything,
-- and items an editor later deletes stay deleted.
create table if not exists cms.seed_items (
  key        text primary key,
  ref        uuid not null,
  created_at timestamptz not null default now()
);
alter table cms.seed_items enable row level security;
