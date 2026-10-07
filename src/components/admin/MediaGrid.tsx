'use client';

/* eslint-disable @next/next/no-img-element -- media is served from Supabase Storage, already resized */
import { thumbUrl } from '@/lib/cms/format';
import type { Media } from '@/lib/cms/types';

export function MediaThumb({ media, size = 'md' }: { media: Media; size?: 'sm' | 'md' }) {
  if (media.kind === 'image') {
    return <img className={`cms-thumb cms-thumb--${size}`} src={thumbUrl(media)} alt={media.alt_text} loading="lazy" />;
  }
  const ext = media.filename.split('.').pop()?.toUpperCase() ?? media.kind;
  return (
    <span className={`cms-thumb cms-thumb--${size} cms-thumb--file`} aria-label={media.filename}>
      {media.kind === 'video' ? '▶' : ext}
    </span>
  );
}

export function MediaGrid(props: { items: Media[]; selectedId?: string | null; onSelect: (m: Media) => void }) {
  return (
    <ul className="cms-grid">
      {props.items.map((m) => (
        <li key={m.id}>
          <button
            type="button"
            className={`cms-grid__item${props.selectedId === m.id ? ' is-selected' : ''}`}
            onClick={() => props.onSelect(m)}
            title={m.filename}
          >
            <MediaThumb media={m} />
            <span className="cms-grid__name">{m.title || m.filename}</span>
            {m.kind === 'image' && !m.alt_text && <span className="cms-grid__warn" title="No alt text">alt?</span>}
          </button>
        </li>
      ))}
    </ul>
  );
}
