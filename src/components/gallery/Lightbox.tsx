'use client';

import Image from 'next/image';
import { useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import type { Photo } from '@/content/images';
import { useIsClient } from '@/lib/hooks';
import { lockScroll } from '@/lib/scroll-lock';

/** Full-screen photo viewer: counter, caption, ← → keys, swipe, Esc, focus returns to the opener. */
export function Lightbox({ items, index, onClose, onIndex }: {
  items: Photo[]; index: number | null; onClose: () => void; onIndex: (i: number) => void;
}) {
  const open = index !== null;
  const closeRef = useRef<HTMLButtonElement>(null);
  const opener = useRef<Element | null>(null);
  const touchX = useRef<number | null>(null);
  const mounted = useIsClient();

  useEffect(() => {
    if (!open) return;
    opener.current = document.activeElement;
    lockScroll(true);
    closeRef.current?.focus();
    return () => {
      lockScroll(false);
      (opener.current as HTMLElement | null)?.focus?.();
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft') onIndex((index! - 1 + items.length) % items.length);
      if (e.key === 'ArrowRight') onIndex((index! + 1) % items.length);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, index, items.length, onClose, onIndex]);

  if (!mounted) return null;
  const item = open ? items[index!] : null;

  return createPortal(
    <div
      className={`lightbox${open ? ' is-open' : ''}`}
      role="dialog"
      aria-modal="true"
      aria-label="Photo viewer"
      aria-hidden={!open}
      onClick={(e) => e.target === e.currentTarget && onClose()}
      onTouchStart={(e) => (touchX.current = e.touches[0].clientX)}
      onTouchEnd={(e) => {
        if (touchX.current === null || !open) return;
        const dx = e.changedTouches[0].clientX - touchX.current;
        if (Math.abs(dx) > 50) onIndex((index! + (dx < 0 ? 1 : -1) + items.length) % items.length);
        touchX.current = null;
      }}
    >
      <span className="lightbox__count">{open ? `${index! + 1} / ${items.length}` : ''}</span>
      <button ref={closeRef} className="lightbox__close" aria-label="Close" onClick={onClose} tabIndex={open ? 0 : -1}>✕</button>
      <button className="lightbox__prev" aria-label="Previous photo" tabIndex={open ? 0 : -1}
        onClick={() => onIndex((index! - 1 + items.length) % items.length)}>←</button>
      <figure>
        {item && (
          <Image key={index} src={item.src} alt={item.alt} sizes="(max-width: 1100px) 100vw, 1100px" quality={85}
            style={{ width: 'auto', height: 'auto' }} placeholder="blur" />
        )}
        <figcaption>{item?.alt}</figcaption>
      </figure>
      <button className="lightbox__next" aria-label="Next photo" tabIndex={open ? 0 : -1}
        onClick={() => onIndex((index! + 1) % items.length)}>→</button>
    </div>,
    document.body,
  );
}
