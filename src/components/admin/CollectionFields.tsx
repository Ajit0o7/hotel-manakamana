'use client';

/* eslint-disable @next/next/no-img-element -- media is served from Supabase Storage, already resized */
import { useEffect, useState } from 'react';
import { thumbUrl } from '@/lib/cms/format';
import type { Column, Media } from '@/lib/cms/types';
import { getMedia } from './media';
import { MediaField, MediaPicker } from './MediaPicker';

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

function RowButtons(props: { index: number; count: number; onMove: (to: number) => void; onRemove: () => void; label: string }) {
  return (
    <span className="cms-rowbtns">
      <button type="button" className="cms-tool" title={`Move ${props.label} up`} aria-label={`Move ${props.label} up`} disabled={props.index === 0} onClick={() => props.onMove(props.index - 1)}>↑</button>
      <button type="button" className="cms-tool" title={`Move ${props.label} down`} aria-label={`Move ${props.label} down`} disabled={props.index === props.count - 1} onClick={() => props.onMove(props.index + 1)}>↓</button>
      <button type="button" className="cms-tool cms-tool--danger" title={`Remove ${props.label}`} aria-label={`Remove ${props.label}`} onClick={props.onRemove}>✕</button>
    </span>
  );
}

/** Shows a media item's thumbnail given only its ID. */
function ThumbById({ id }: { id: string }) {
  const [m, setM] = useState<Media | null>(null);
  useEffect(() => {
    let cancelled = false;
    getMedia(id).then((x) => !cancelled && setM(x)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [id]);
  return m ? <img className="cms-thumb" src={thumbUrl(m)} alt={m.alt_text} /> : <span className="cms-thumb cms-thumb--file">…</span>;
}

/** An ordered list of photos from the media library. */
export function GalleryField(props: { value: unknown; onChange: (v: string[]) => void }) {
  const ids = Array.isArray(props.value) ? (props.value as string[]) : [];
  const [picking, setPicking] = useState(false);
  return (
    <div className="cms-gallery">
      {ids.length > 0 && (
        <ul className="cms-gallery__list">
          {ids.map((id, i) => (
            <li key={`${id}-${i}`}>
              <ThumbById id={id} />
              <RowButtons label="photo" index={i} count={ids.length} onMove={(to) => props.onChange(move(ids, i, to))} onRemove={() => props.onChange(ids.filter((_, j) => j !== i))} />
            </li>
          ))}
        </ul>
      )}
      <button type="button" className="cms-btn" onClick={() => setPicking(true)}>Add photo</button>
      {picking && (
        <MediaPicker
          title="Add a photo"
          onClose={() => setPicking(false)}
          onSelect={(m) => {
            props.onChange([...ids, m.id]);
            setPicking(false);
          }}
        />
      )}
    </div>
  );
}

type Row = Record<string, unknown>;

/** Repeating rows of columns, e.g. FAQs (question, answer) or gallery photos (photo, category). */
export function TableField(props: { columns: Column[]; value: unknown; onChange: (v: Row[]) => void; label: string }) {
  const rows = Array.isArray(props.value) ? (props.value as Row[]) : [];
  const setCell = (i: number, name: string, v: unknown) => props.onChange(rows.map((r, j) => (j === i ? { ...r, [name]: v } : r)));
  const wide = props.columns.some((c) => c.type === 'textarea');
  // A photo column goes on the left, with the other columns stacked beside it.
  const media = props.columns.find((c) => c.type === 'media');
  const rest = props.columns.filter((c) => c !== media);

  return (
    <div className="cms-table-field">
      {rows.length === 0 && <p className="cms-muted">No rows yet.</p>}
      <ol className="cms-rows">
        {rows.map((row, i) => (
          <li key={i} className={`cms-rows__row${media ? ' cms-rows__row--media' : wide ? ' cms-rows__row--wide' : ''}`}>
            {media ? (
              <>
                <Cell column={media} value={row[media.name]} onChange={(v) => setCell(i, media.name, v)} />
                <div className="cms-rows__fields">
                  {rest.map((c) => (
                    <Cell key={c.name} column={c} value={row[c.name]} onChange={(v) => setCell(i, c.name, v)} />
                  ))}
                </div>
              </>
            ) : (
              props.columns.map((c) => <Cell key={c.name} column={c} value={row[c.name]} onChange={(v) => setCell(i, c.name, v)} />)
            )}
            <RowButtons
              label="row"
              index={i}
              count={rows.length}
              onMove={(to) => props.onChange(move(rows, i, to))}
              onRemove={() => props.onChange(rows.filter((_, j) => j !== i))}
            />
          </li>
        ))}
      </ol>
      <button type="button" className="cms-btn" onClick={() => props.onChange([...rows, {}])}>Add row</button>
    </div>
  );
}

function Cell({ column: c, value, onChange }: { column: Column; value: unknown; onChange: (v: unknown) => void }) {
  const str = typeof value === 'string' ? value : value == null ? '' : String(value);
  let input: React.ReactNode;
  switch (c.type) {
    case 'textarea':
      input = <textarea className="cms-input" rows={2} value={str} onChange={(e) => onChange(e.target.value)} />;
      break;
    case 'number':
      input = <input className="cms-input" type="number" step="any" value={str} onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))} />;
      break;
    case 'select':
      input = (
        <select className="cms-input" value={str} onChange={(e) => onChange(e.target.value || null)}>
          <option value="">—</option>
          {c.options?.map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      );
      break;
    case 'media':
      return (
        <div className="cms-cell cms-cell--media">
          <span className="cms-cell__label">{c.label}</span>
          <MediaField value={str || null} onChange={onChange} label="Choose" />
        </div>
      );
    default:
      input = <input className="cms-input" type={c.type === 'url' ? 'url' : 'text'} value={str} onChange={(e) => onChange(e.target.value)} />;
  }
  return (
    <label className="cms-cell">
      <span className="cms-cell__label">{c.label}</span>
      {input}
    </label>
  );
}

/** Drops empty cells and rows, so the API gets clean data. */
export function cleanRows(rows: Row[]): Row[] {
  return rows
    .map((r) => Object.fromEntries(Object.entries(r).filter(([, v]) => v !== '' && v !== null && v !== undefined)))
    .filter((r) => Object.keys(r).length > 0);
}
