'use client';

import { useState } from 'react';
import { GALLERY, GALLERY_FILTERS } from '@/content/gallery';
import { PhotoGrid } from './PhotoGrid';

/** Gallery page: sticky filter pills + masonry grid. After a filter change the tiles pop in. */
export function FilterGallery() {
  const [filter, setFilter] = useState<string>('all');
  const [changed, setChanged] = useState(false);
  const items = filter === 'all' ? GALLERY : GALLERY.filter((g) => g.cat === filter);

  return (
    <>
      <div className="filters" role="group" aria-label="Filter photos">
        {GALLERY_FILTERS.map((f) => (
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
