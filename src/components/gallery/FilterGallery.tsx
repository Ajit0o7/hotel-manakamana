'use client';

import { useState } from 'react';
import { GALLERY_FILTERS, type GalleryItem } from '@/content/gallery';
import { PhotoGrid } from './PhotoGrid';

/** Gallery page: sticky filter pills + masonry grid. After a filter change the tiles pop in. */
export function FilterGallery({ items: all }: { items: GalleryItem[] }) {
  const [filter, setFilter] = useState<string>('all');
  const [changed, setChanged] = useState(false);
  const items = filter === 'all' ? all : all.filter((g) => g.cat === filter);
  // Only offer filters that have photos.
  const filters = GALLERY_FILTERS.filter((f) => f.key === 'all' || all.some((g) => g.cat === f.key));

  return (
    <>
      <div className="filters" role="group" aria-label="Filter photos">
        {filters.map((f) => (
          <button
            key={f.key}
            type="button"
            className={filter === f.key ? 'is-active' : undefined}
            aria-pressed={filter === f.key}
            onClick={() => {
              setFilter(f.key);
              setChanged(true);
            }}
          >
            {f.label}
          </button>
        ))}
      </div>
      {/* key remounts the grid so each filter change replays the pop-in */}
      <PhotoGrid key={filter} items={items} variant="masonry" captions reveal={!changed} animate={changed} />
    </>
  );
}
