'use client';

/* eslint-disable @next/next/no-img-element -- media is served from Supabase Storage, already resized */
import { useEffect, useState } from 'react';
import { thumbUrl } from '@/lib/cms/format';
import type { Media } from '@/lib/cms/types';
import { MediaGrid } from './MediaGrid';
import { getMedia, useMediaList } from './media';
import { Spinner } from './Spinner';
import { UploadButton } from './UploadButton';

/** A dialog for choosing (or uploading) an image from the media library. */
export function MediaPicker(props: { onSelect: (m: Media) => void; onClose: () => void; title?: string }) {
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const list = useMediaList('image', search);

  const { onClose } = props;
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [onClose]);

  return (
    <div className="cms-modal" role="dialog" aria-modal="true" aria-label={props.title ?? 'Choose an image'} onClick={props.onClose}>
      <div className="cms-modal__box" onClick={(e) => e.stopPropagation()}>
        <header className="cms-page__head">
          <h2 className="cms-h2">{props.title ?? 'Choose an image'}</h2>
          <div className="cms-row">
            <UploadButton accept="image/*" label="Upload new" onUploaded={props.onSelect} />
            <button type="button" className="cms-btn" onClick={props.onClose}>Cancel</button>
          </div>
        </header>
        <form className="cms-search" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}>
          <input className="cms-input" type="search" placeholder="Search images…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} autoFocus />
        </form>
        <div className="cms-modal__body">
          {list.loading ? (
            <Spinner />
          ) : list.error ? (
            <p className="cms-error">{list.error}</p>
          ) : list.items.length === 0 ? (
            <p className="cms-empty">No images yet. Upload one.</p>
          ) : (
            <>
              <MediaGrid items={list.items} onSelect={props.onSelect} />
              {list.hasMore && (
                <p className="cms-center">
                  <button type="button" className="cms-link" disabled={list.loadingMore} onClick={list.loadMore}>Load more</button>
                </p>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

/** A form control holding one image: shows it, and opens the picker to change it. */
export function MediaField(props: { value: string | null; onChange: (id: string | null) => void; label?: string }) {
  const [open, setOpen] = useState(false);
  const [loaded, setLoaded] = useState<Media | null>(null);

  useEffect(() => {
    if (!props.value) return;
    let cancelled = false;
    getMedia(props.value).then((m) => !cancelled && setLoaded(m)).catch(() => {});
    return () => {
      cancelled = true;
    };
  }, [props.value]);

  const media = props.value && loaded?.id === props.value ? loaded : null;
  return (
    <div className="cms-mediafield">
      {props.value ? (
        media ? (
          <img src={thumbUrl(media)} alt={media.alt_text} className="cms-mediafield__img" />
        ) : (
          <span className="cms-mediafield__img cms-thumb--file">…</span>
        )
      ) : null}
      <div className="cms-row">
        <button type="button" className="cms-btn" onClick={() => setOpen(true)}>
          {props.value ? 'Change' : (props.label ?? 'Choose image')}
        </button>
        {props.value && (
          <button type="button" className="cms-btn cms-btn--ghost" onClick={() => props.onChange(null)}>Remove</button>
        )}
      </div>
      {open && (
        <MediaPicker
          onClose={() => setOpen(false)}
          onSelect={(m) => {
            setLoaded(m);
            props.onChange(m.id);
            setOpen(false);
          }}
        />
      )}
    </div>
  );
}
