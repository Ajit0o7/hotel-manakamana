'use client';

import { useState } from 'react';
import type { Media } from '@/lib/cms/types';
import { MediaDetails } from './MediaDetails';
import { MediaGrid } from './MediaGrid';
import { useMediaList } from './media';
import { Spinner } from './Spinner';
import { UploadButton } from './UploadButton';

const KINDS = [
  { value: '', label: 'All' },
  { value: 'image', label: 'Images' },
  { value: 'video', label: 'Videos' },
  { value: 'document', label: 'Documents' },
];

export function MediaLibrary() {
  const [kind, setKind] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const list = useMediaList(kind, search);
  const [selected, setSelected] = useState<Media | null>(null);

  return (
    <div className="cms-page">
      <header className="cms-page__head">
        <h1 className="cms-h1">Media library</h1>
        <UploadButton multiple label="Upload files" onUploaded={(m) => { list.add(m); setSelected(m); }} />
      </header>
      <p className="cms-muted">
        Drag files anywhere onto this page to upload them. Photos get resized and converted to WebP automatically. Up to 50 MB each.
      </p>
      <div className="cms-toolbar">
        <div className="cms-tabs" role="tablist">
          {KINDS.map((k) => (
            <button key={k.value} role="tab" aria-selected={kind === k.value} className={`cms-tab${kind === k.value ? ' is-active' : ''}`} onClick={() => setKind(k.value)}>
              {k.label}
            </button>
          ))}
        </div>
        <form className="cms-search" onSubmit={(e) => { e.preventDefault(); setSearch(searchInput.trim()); }}>
          <input className="cms-input" type="search" placeholder="Search files…" value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
        </form>
      </div>
      <div className={`cms-split${selected ? ' has-details' : ''}`}>
        <div>
          {list.loading ? (
            <Spinner />
          ) : list.error ? (
            <p className="cms-error">{list.error}</p>
          ) : list.items.length === 0 ? (
            <p className="cms-empty">{search || kind ? 'Nothing matches.' : 'No files yet. Upload your first photo.'}</p>
          ) : (
            <>
              <MediaGrid items={list.items} selectedId={selected?.id} onSelect={setSelected} />
              <p className="cms-muted cms-center">
                Showing {list.items.length} of {list.total}
                {list.hasMore && (
                  <> · <button className="cms-link" disabled={list.loadingMore} onClick={list.loadMore}>{list.loadingMore ? 'Loading…' : 'Load more'}</button></>
                )}
              </p>
            </>
          )}
        </div>
        {selected && (
          <MediaDetails
            key={selected.id}
            media={selected}
            onClose={() => setSelected(null)}
            onChange={(m) => { list.replace(m); setSelected(m); }}
            onDelete={(id) => { list.remove(id); setSelected(null); }}
          />
        )}
      </div>
    </div>
  );
}
