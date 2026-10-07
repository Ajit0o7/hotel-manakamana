-- A tiny blurred preview of each image (a data: URL of a ~10 px JPEG), so
-- the website can show a blur-up placeholder while the real image loads.
alter table cms.media add column if not exists blur_data_url text not null default '';
