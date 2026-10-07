'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { api, apiList, ApiError, query } from '@/lib/cms/api';
import { formatDate, fromLocalInput, toLocalInput } from '@/lib/cms/format';
import { emptySeo, fieldsFor, type ContentType, type Entry, type EntryInput, type Status } from '@/lib/cms/types';
import { cleanFields, FieldInput } from './FieldInput';
import { MediaField } from './MediaPicker';
import { RichTextEditor } from './RichTextEditor';
import { SeoPanel } from './SeoPanel';
import { Spinner } from './Spinner';
import { useToast } from './Toaster';
import { useContentType, useContentTypes } from './TypesProvider';

const BLANK: EntryInput = {
  title: '',
  slug: '',
  content: '',
  excerpt: '',
  status: 'draft',
  parent_id: null,
  menu_order: 0,
  template: '',
  featured_media_id: null,
  fields: {},
  published_at: null,
  seo: emptySeo(),
};

function toInput(e: Entry): EntryInput {
  return {
    title: e.title,
    slug: e.slug,
    content: e.content,
    excerpt: e.excerpt,
    status: e.status,
    parent_id: e.parent_id,
    menu_order: e.menu_order,
    template: e.template,
    featured_media_id: e.featured_media_id,
    fields: e.fields ?? {},
    published_at: e.published_at,
    seo: { ...emptySeo(), ...e.seo },
  };
}

/** The sections a new page starts with: a header, a text and the call-to-action band. */
const STARTER_SECTIONS = ['page_hero', 'text', 'cta_band'];

function starterFields(ct: ContentType | undefined): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const f of ct?.fields ?? []) {
    if (f.type !== 'flexible') continue;
    const names = new Set(f.layouts?.map((l) => l.name));
    out[f.name] = STARTER_SECTIONS.filter((n) => names.has(n)).map((layout) => ({ layout }));
  }
  return out;
}

/** Public path of an entry, mirroring the CMS permalink rules. */
function publicPath(ct: ContentType, path: string, parentId: string | null): string {
  if (ct.name === 'page' && !parentId && path === 'home') return '/';
  return `${ct.route_prefix.replace(/\/$/, '')}/${path}`;
}

/** Create (no id) or edit (id) one entry of any content type. */
export function EntryEditor({ type, id }: { type: string; id?: string }) {
  const { types, error: typesError } = useContentTypes();
  const ct = useContentType(type);
  const router = useRouter();
  const notify = useToast();

  const [saved, setSaved] = useState<{ id: string; entry: Entry | null; error: string | null } | null>(null);
  const [form, setForm] = useState<EntryInput | null>(null);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);

  // Load the saved entry when editing.
  useEffect(() => {
    if (!id) return;
    let cancelled = false;
    api<Entry>(`/api/v1/admin/content/${type}/${id}`)
      .then((entry) => !cancelled && setSaved({ id, entry, error: null }))
      .catch((err: Error) => !cancelled && setSaved({ id, entry: null, error: err.message }));
    return () => {
      cancelled = true;
    };
  }, [type, id]);

  const entry = id && saved?.id === id ? saved.entry : null;
  const loadError = id && saved?.id === id ? saved.error : null;
  // New entries start with the type's first template when it has no "default" one (posts start as guides).
  const firstTemplate = ct?.templates?.length && !ct.templates.includes('default') ? ct.templates[0] : '';
  const baseline = useMemo(
    () => (entry ? toInput(entry) : id ? null : { ...BLANK, template: firstTemplate, fields: starterFields(ct) }),
    [entry, id, firstTemplate, ct],
  );
  const value = form ?? baseline;
  const dirty = form !== null && JSON.stringify(form) !== JSON.stringify(baseline);

  // Warn before leaving with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    window.addEventListener('beforeunload', warn);
    return () => window.removeEventListener('beforeunload', warn);
  }, [dirty]);

  const parents = useParents(ct, entry);

  if (typesError) return <p className="cms-error">{typesError}</p>;
  if (types && !ct) return <p className="cms-error">Unknown content type &quot;{type}&quot;.</p>;
  if (loadError) return <p className="cms-error">{loadError}</p>;
  if (!ct || !value) return <Spinner />;

  const update = (patch: Partial<EntryInput>) => setForm({ ...value, ...patch });
  const fields = fieldsFor(ct, value.template);
  const ordered = ct.hierarchical || !!ct.sortable;
  // Pages built from sections: the body text only matters when there are no sections.
  const built = fields.some((f) => f.type === 'flexible');
  const err = (k: string) => errors[k];

  async function save(status: Status) {
    if (!value || !ct) return;
    setBusy(true);
    const body: EntryInput = { ...value, status, fields: cleanFields(value.fields, fieldsFor(ct, value.template)) };
    try {
      const result = id
        ? await api<Entry>(`/api/v1/admin/content/${type}/${id}`, { method: 'PUT', body })
        : await api<Entry>(`/api/v1/admin/content/${type}`, { method: 'POST', body });
      setErrors({});
      notify(status === 'published' && value.status !== 'published' ? `${ct.label} published` : 'Saved');
      if (id) {
        setSaved({ id, entry: result, error: null });
        setForm(null);
      } else {
        router.replace(`/admin/content/${type}/${result.id}`);
      }
    } catch (e) {
      if (e instanceof ApiError) {
        setErrors(e.fields);
        notify(Object.keys(e.fields).length ? 'Please fix the highlighted fields.' : e.message, 'error');
      } else {
        notify('Saving failed.', 'error');
      }
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!id || !ct) return;
    if (!window.confirm(`Delete this ${ct.label.toLowerCase()}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/v1/admin/content/${type}/${id}`, { method: 'DELETE' });
      notify(`${ct.label} deleted`);
      router.replace(`/admin/content/${type}`);
    } catch (e) {
      notify((e as Error).message, 'error');
      setBusy(false);
    }
  }

  const scheduled = value.published_at && new Date(value.published_at) > new Date();
  const isLive = entry?.status === 'published';
  // Where the entry will live: the parent's path (if any) plus this entry's slug.
  const parentPath = value.parent_id ? parents.find((p) => p.id === value.parent_id)?.path : undefined;
  const slug = value.slug || slugPreview(value.title) || 'your-page';
  const path = parentPath ? `${parentPath}/${slug}` : slug;
  const base = `${ct.route_prefix.replace(/\/$/, '')}/${parentPath ? parentPath + '/' : ''}`;
  const url = (typeof window !== 'undefined' ? window.location.origin : '') + publicPath(ct, path, value.parent_id);

  return (
    <div className="cms-page">
      <header className="cms-page__head">
        <div>
          <p className="cms-crumb"><Link href={`/admin/content/${type}`}>{ct.label_plural}</Link></p>
          <h1 className="cms-h1">{id ? `Edit ${ct.label.toLowerCase()}` : `New ${ct.label.toLowerCase()}`}</h1>
        </div>
        {dirty && <span className="cms-badge cms-badge--warn">Unsaved changes</span>}
      </header>

      <div className="cms-editor-layout">
        <div className="cms-editor-main">
          <section className="cms-card">
            <label className="cms-label">
              Title
              <input className="cms-input cms-input--title" value={value.title} onChange={(e) => update({ title: e.target.value })} placeholder={`${ct.label} title`} />
              {err('title') && <span className="cms-error">{err('title')}</span>}
            </label>
            <label className="cms-label">
              URL slug <span className="cms-muted">— the last part of the address; leave empty to make it from the title</span>
              <span className="cms-slug">
                <span className="cms-muted">{base}</span>
                <input className="cms-input" value={value.slug} placeholder={slugPreview(value.title)} onChange={(e) => update({ slug: e.target.value })} />
              </span>
              {err('slug') && <span className="cms-error">{err('slug')}</span>}
            </label>
            {built ? (
              <details className="cms-label cms-body-details">
                <summary>Body text <span className="cms-muted">— only shown when the page has no sections; use a Text section instead</span></summary>
                <RichTextEditor label="Content" value={value.content} onChange={(content) => update({ content })} />
              </details>
            ) : (
              <div className="cms-label">
                <span>Content</span>
                <RichTextEditor label="Content" value={value.content} onChange={(content) => update({ content })} />
                {err('content') && <span className="cms-error">{err('content')}</span>}
                {ct.name === 'post' && <ShortcodeHelp />}
              </div>
            )}
            <label className="cms-label">
              Excerpt <span className="cms-muted">— a short summary for listings; also used when the meta description is empty</span>
              <textarea className="cms-input" rows={3} value={value.excerpt} onChange={(e) => update({ excerpt: e.target.value })} />
              {err('excerpt') && <span className="cms-error">{err('excerpt')}</span>}
            </label>
          </section>

          {fields.length > 0 && (
            <section className="cms-card">
              {!built && <h2 className="cms-h2">{ct.label} details</h2>}
              {fields.map((f) => (
                <FieldInput
                  key={f.name}
                  field={f}
                  value={value.fields[f.name]}
                  error={err(`fields.${f.name}`)}
                  onChange={(v) => update({ fields: { ...value.fields, [f.name]: v } })}
                />
              ))}
            </section>
          )}

          <SeoPanel
            seo={value.seo}
            onChange={(seo) => update({ seo })}
            errors={errors}
            title={value.title}
            slug={value.slug || slugPreview(value.title)}
            content={value.content}
            excerpt={value.excerpt}
            hasFeaturedImage={!!value.featured_media_id}
            url={url}
            type={ct.name}
            template={value.template}
            fields={value.fields}
          />
        </div>

        <aside className="cms-editor-side">
          <section className="cms-card">
            <h2 className="cms-h2">Publish</h2>
            <p>
              Status: <StatusBadge status={entry?.status ?? 'draft'} publishedAt={entry?.published_at ?? null} />
            </p>
            {entry && <p className="cms-muted">Last saved {formatDate(entry.updated_at)}</p>}
            <label className="cms-label">
              Publish date <span className="cms-muted">— empty means now; a future date schedules it</span>
              <input
                className="cms-input"
                type="datetime-local"
                value={toLocalInput(value.published_at)}
                onChange={(e) => update({ published_at: fromLocalInput(e.target.value) })}
              />
            </label>
            <div className="cms-stack">
              {isLive ? (
                <>
                  <button className="cms-btn cms-btn--primary" disabled={busy} onClick={() => save('published')}>Update</button>
                  <button className="cms-btn" disabled={busy} onClick={() => save('draft')}>Unpublish (back to draft)</button>
                </>
              ) : (
                <>
                  <button className="cms-btn cms-btn--primary" disabled={busy || !value.title.trim()} onClick={() => save('published')}>
                    {scheduled ? 'Schedule' : 'Publish'}
                  </button>
                  <button className="cms-btn" disabled={busy || !value.title.trim()} onClick={() => save('draft')}>Save draft</button>
                </>
              )}
              {id && <button className="cms-btn cms-btn--danger-link" disabled={busy} onClick={remove}>Delete {ct.label.toLowerCase()}</button>}
            </div>
          </section>

          {(ordered || (ct.templates && ct.templates.length > 0)) && (
            <section className="cms-card">
              <h2 className="cms-h2">{ct.label} attributes</h2>
              {ct.hierarchical && (
                <label className="cms-label">
                  Parent
                  <select className="cms-input" value={value.parent_id ?? ''} onChange={(e) => update({ parent_id: e.target.value || null })}>
                    <option value="">(none — top level)</option>
                    {parents.map((p) => (
                      <option key={p.id} value={p.id}>{'— '.repeat(p.path.split('/').length - 1)}{p.title}</option>
                    ))}
                  </select>
                  {err('parent_id') && <span className="cms-error">{err('parent_id')}</span>}
                </label>
              )}
              {ct.templates && ct.templates.length > 0 && (
                <label className="cms-label">
                  Template
                  <select className="cms-input" value={value.template} onChange={(e) => update({ template: e.target.value })}>
                    {(ct.templates.includes('default') || value.template === '') && <option value="">default</option>}
                    {ct.templates.filter((t) => t !== 'default').map((t) => <option key={t} value={t}>{t}</option>)}
                  </select>
                  {err('template') && <span className="cms-error">{err('template')}</span>}
                </label>
              )}
              {ordered && (
                <label className="cms-label">
                  {ct.hierarchical ? 'Menu order' : 'Order'} <span className="cms-muted">— lower numbers come first</span>
                  <input className="cms-input cms-input--short" type="number" value={value.menu_order} onChange={(e) => update({ menu_order: Number(e.target.value) || 0 })} />
                </label>
              )}
            </section>
          )}

          <section className="cms-card">
            <h2 className="cms-h2">Featured image</h2>
            <MediaField value={value.featured_media_id} onChange={(featured_media_id) => update({ featured_media_id })} label="Set featured image" />
            {err('featured_media_id') && <span className="cms-error">{err('featured_media_id')}</span>}
          </section>
        </aside>
      </div>
    </div>
  );
}

/** Explains the special blocks the website draws in place of a line of text. */
function ShortcodeHelp() {
  return (
    <details className="cms-help">
      <summary>Special blocks you can add to an article</summary>
      <p className="cms-muted">Type one of these on a line by itself; the website shows the block in its place.</p>
      <ul>
        <li><code>[airlines]</code> — the table of airlines flying to Lukla</li>
        <li><code>[weather]</code> — live weather and time in Manthali</li>
        <li><code>[booking Title | Text]</code> — a booking box with call and WhatsApp buttons</li>
        <li><code>[map Title | https://maps.google.com/…&amp;output=embed]</code> — an embedded Google map</li>
        <li><code>[compare]</code> … <code>[/compare]</code> — side-by-side boxes: put an H3 heading and a list for each box between the two lines; add “(recommended)” to a heading to highlight it</li>
      </ul>
      <p className="cms-muted">A quote becomes a highlighted tip box (make its first line bold for a title). An image’s title becomes its caption; a line in italics starting with “Photo:” right after it becomes the photo credit.</p>
    </details>
  );
}

export function StatusBadge({ status, publishedAt }: { status: Status; publishedAt: string | null }) {
  if (status === 'published' && publishedAt && new Date(publishedAt) > new Date()) {
    return <span className="cms-badge cms-badge--info" title={formatDate(publishedAt)}>Scheduled</span>;
  }
  const label = { draft: 'Draft', published: 'Published', archived: 'Archived' }[status];
  return <span className={`cms-badge cms-badge--${status}`}>{label}</span>;
}

/** All entries of a hierarchical type that may be the parent of `self`. */
function useParents(ct: ContentType | undefined, self: Entry | null): Entry[] {
  const [all, setAll] = useState<Entry[]>([]);
  const name = ct?.hierarchical ? ct.name : null;
  useEffect(() => {
    if (!name) return;
    let cancelled = false;
    apiList<Entry>(`/api/v1/admin/content/${name}${query({ per_page: 100, order: 'menu' })}`)
      .then(({ data }) => !cancelled && setAll(data))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [name]);
  return all
    .filter((e) => !self || (e.id !== self.id && !e.path.startsWith(self.path + '/')))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** Roughly what the CMS will make from a title, for previews only. */
function slugPreview(title: string): string {
  return title
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/['’]/g, '')
    .replace(/[^\p{L}\p{N}\p{M}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}
