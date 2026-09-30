'use client';

import Image from 'next/image';
import { useCallback, useState, type CSSProperties } from 'react';
import type { Photo } from '@/content/images';
import { Lightbox } from './Lightbox';

type Variant = 'mosaic' | 'masonry' | 'room';

const SIZES: Record<Variant, string> = {
  mosaic: '(max-width: 960px) 50vw, 600px',
  masonry: '(max-width: 700px) 100vw, (max-width: 1100px) 50vw, 400px',
  room: '(max-width: 960px) 50vw, 360px',
};

/** Clickable photo layout that opens the lightbox. `shape` adds mosaic tiles (big / wide / tall). */
export function PhotoGrid({ items, variant, shapes = [], captions = false, reveal = true, animate = false }: {
  items: Photo[]; variant: Variant; shapes?: string[]; captions?: boolean; reveal?: boolean; animate?: boolean;
}) {
  const [index, setIndex] = useState<number | null>(null);
  const close = useCallback(() => setIndex(null), []);
  const gridClass = variant === 'mosaic' ? 'mosaic' : variant === 'masonry' ? 'gallery-grid' : 'room-gallery';

  return (
    <>
      <div className={gridClass} data-stagger={variant === 'masonry' ? undefined : ''}>
        {items.map((p, i) => (
          <a
            key={`${p.alt}-${i}`}
            href={p.src.src}
            className={['zoom', shapes[i], reveal && 'reveal', animate && 'pop'].filter(Boolean).join(' ')}
            style={animate ? ({ animationDelay: `${(i % 6) * 60}ms` } as CSSProperties) : undefined}
            onClick={(e) => {
              e.preventDefault();
              setIndex(i);
            }}
          >
            <Image
              src={p.src}
              alt={p.alt}
              sizes={variant === 'room' && i === 0 ? '(max-width: 960px) 100vw, 760px' : SIZES[variant]}
              placeholder="blur"
              {...(variant === 'masonry' ? {} : { fill: true })}
            />
            {captions && <figcaption>{p.alt}</figcaption>}
          </a>
        ))}
      </div>
      <Lightbox items={items} index={index} onClose={close} onIndex={setIndex} />
    </>
  );
}
