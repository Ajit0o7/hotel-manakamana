/* Shapes of the CMS API (see cms/README.md). */

export type FieldType =
  | 'text' | 'textarea' | 'richtext' | 'number' | 'integer' | 'boolean' | 'date'
  | 'datetime' | 'url' | 'email' | 'media' | 'select' | 'list';

export interface Field {
  name: string;
  label: string;
  type: FieldType;
  required?: boolean;
  help?: string;
  options?: string[];
}

export interface ContentType {
  name: string;
  label: string;
  label_plural: string;
  description?: string;
  hierarchical: boolean;
  templates?: string[];
  fields?: Field[];
  route_prefix: string;
}

export type Status = 'draft' | 'published' | 'archived';

export interface SeoMeta {
  meta_title: string;
  meta_description: string;
  focus_keyword: string;
  canonical_url: string;
  og_title: string;
  og_description: string;
  og_image_id: string | null;
  og_image_url: string;
  no_index: boolean;
  no_follow: boolean;
  seo_score?: number | null;
  readability_score?: number | null;
}

export interface Entry {
  id: string;
  type: string;
  title: string;
  slug: string;
  path: string;
  content: string;
  excerpt: string;
  status: Status;
  parent_id: string | null;
  menu_order: number;
  template: string;
  featured_media_id: string | null;
  fields: Record<string, unknown>;
  author_id: string | null;
  published_at: string | null;
  created_at: string;
  updated_at: string;
  seo: SeoMeta;
}

/** The editable part of an entry, as accepted by POST/PUT. */
export interface EntryInput {
  title: string;
  slug: string;
  content: string;
  excerpt: string;
  status: Status;
  parent_id: string | null;
  menu_order: number;
  template: string;
  featured_media_id: string | null;
  fields: Record<string, unknown>;
  published_at: string | null;
  seo: SeoMeta;
}

export interface Variant {
  path: string;
  url?: string;
  mime_type: string;
  width: number;
  height: number;
  size_bytes: number;
}

export interface Media {
  id: string;
  url: string;
  path: string;
  filename: string;
  mime_type: string;
  kind: 'image' | 'video' | 'document';
  size_bytes: number;
  width: number | null;
  height: number | null;
  title: string;
  alt_text: string;
  caption: string;
  description: string;
  variants: Record<string, Variant>;
  created_at: string;
  updated_at: string;
}

export type Rating = 'good' | 'ok' | 'problem';

export interface SeoResult {
  id: string;
  category: 'seo' | 'readability';
  status: Rating;
  message: string;
}

export interface SeoReport {
  focus_keyword: string;
  seo_score: number;
  seo_rating: 'good' | 'ok' | 'bad' | 'na';
  readability_score: number;
  readability_rating: 'good' | 'ok' | 'bad' | 'na';
  results: SeoResult[];
  stats: {
    word_count: number;
    keyword_count: number;
    keyword_density: number;
    flesch_reading_ease: number | null;
  };
}

export interface ListMeta {
  page: number;
  per_page: number;
  total: number;
}

export interface Principal {
  user_id: string;
  email: string;
  role: string;
}

export const emptySeo = (): SeoMeta => ({
  meta_title: '',
  meta_description: '',
  focus_keyword: '',
  canonical_url: '',
  og_title: '',
  og_description: '',
  og_image_id: null,
  og_image_url: '',
  no_index: false,
  no_follow: false,
});
