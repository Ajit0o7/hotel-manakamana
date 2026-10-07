'use client';

/* eslint-disable @next/next/no-img-element -- media is served from Supabase Storage, already resized */
import { useState } from 'react';
import { api } from '@/lib/cms/api';
import { formatBytes, formatDate, largeUrl } from '@/lib/cms/format';
import type { Media } from '@/lib/cms/types';
import { rememberMedia } from './media';
import { useToast } from './Toaster';

/** Preview, links and editable metadata of one media item. */
export function MediaDetails(props: { media: Media; onChange: (m: Media) => void; onDelete: (id: string) => void; onClose: () => void }) {
  const m = props.media;
  const notify = useToast();
  const [form, setForm] = useState({ title: m.title, alt_text: m.alt_text, caption: m.caption, description: m.description });
  const [busy, setBusy] = useState(false);
  const dirty = form.title !== m.title || form.alt_text !== m.alt_text || form.caption !== m.caption || form.description !== m.description;

  async function save() {
    setBusy(true);
    try {
      const updated = await api<Media>(`/api/v1/admin/media/${m.id}`, { method: 'PATCH', body: form });
      rememberMedia(updated);
      props.onChange(updated);
      notify('Saved');
    } catch (err) {
      notify((err as Error).message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function remove() {
    if (!window.confirm(`Delete "${m.filename}"? Pages using it will lose this image. This cannot be undone.`)) return;
    setBusy(true);
    try {
      await api(`/api/v1/admin/media/${m.id}`, { method: 'DELETE' });
      props.onDelete(m.id);
      notify('Deleted');
    } catch (err) {
      notify((err as Error).message, 'error');
      setBusy(false);
    }
  }

  const copy = (url: string) => {
    navigator.clipboard.writeText(url).then(() => notify('Link copied'));
  };

  return (
    <aside className="cms-card cms-details" aria-label="Media details">
      <div className="cms-details__head">
        <h2 className="cms-h2">Details</h2>
        <button type="button" className="cms-btn cms-btn--ghost" onClick={props.onClose} aria-label="Close details">✕</button>
      </div>
      <div className="cms-details__preview">
        {m.kind === 'image' && <img src={largeUrl(m)} alt={m.alt_text} />}
        {m.kind === 'video' && <video src={m.url} controls preload="metadata" />}
        {m.kind === 'document' && (
          <a href={m.url} target="_blank" rel="noreferrer" className="cms-btn">Open {m.filename}</a>
        )}
      </div>
      <dl className="cms-meta">
        <dt>File</dt><dd>{m.filename}</dd>
        <dt>Type</dt><dd>{m.mime_type}</dd>
        <dt>Size</dt><dd>{formatBytes(m.size_bytes)}</dd>
        {m.width && m.height && (<><dt>Dimensions</dt><dd>{m.width} × {m.height}</dd></>)}
        <dt>Uploaded</dt><dd>{formatDate(m.created_at)}</dd>
      </dl>
      <div className="cms-links">
        <button type="button" className="cms-link" onClick={() => copy(m.url)}>Copy original link</button>
        {Object.entries(m.variants ?? {}).map(([name, v]) =>
          v.url ? (
            <button type="button" key={name} className="cms-link" onClick={() => copy(v.url!)}>
              Copy {name} ({v.width}×{v.height})
            </button>
          ) : null,
        )}
      </div>
      {m.kind === 'image' && (
        <label className="cms-label">
          Alt text <span className="cms-muted">— describe the image for blind visitors and Google</span>
          <textarea className="cms-input" rows={2} value={form.alt_text} onChange={(e) => setForm({ ...form, alt_text: e.target.value })} />
        </label>
      )}
      <label className="cms-label">
        Title
        <input className="cms-input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
      </label>
      <label className="cms-label">
        Caption
        <textarea className="cms-input" rows={2} value={form.caption} onChange={(e) => setForm({ ...form, caption: e.target.value })} />
      </label>
      <label className="cms-label">
        Description
        <textarea className="cms-input" rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} />
      </label>
      <div className="cms-row cms-row--between">
        <button type="button" className="cms-btn cms-btn--primary" disabled={!dirty || busy} onClick={save}>Save</button>
        <button type="button" className="cms-btn cms-btn--danger" disabled={busy} onClick={remove}>Delete</button>
      </div>
    </aside>
  );
}
