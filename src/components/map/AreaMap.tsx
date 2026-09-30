'use client';

import { useEffect, useRef, useState } from 'react';
import { Icon } from '@/components/ui/Icon';
import { HOTEL } from '@/content/hotel';
import { MAP_VIEWS, POIS, type ViewId } from '@/content/map';
import type { AreaMapHandle } from './createAreaMap';

type Status = 'idle' | 'loading' | 'ready' | 'failed';

/** Interactive 3D area map. MapLibre loads only when the map nears the viewport; the place list below
    works without it (and is what keyboard and screen-reader users can rely on). */
export function AreaMap() {
  const canvas = useRef<HTMLDivElement>(null);
  const handle = useRef<AreaMapHandle | null>(null);
  const viewRef = useRef<ViewId>('area');
  const [view, setView] = useState<ViewId>('area');
  const [status, setStatus] = useState<Status>('idle');

  useEffect(() => {
    const node = canvas.current;
    if (!node) return;
    let cancelled = false;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((e) => e.isIntersecting)) return;
        io.disconnect();
        setStatus('loading');
        import('./createAreaMap')
          .then(({ createAreaMap }) => {
            if (cancelled) return;
            handle.current = createAreaMap(node, { view: viewRef.current, onReady: () => !cancelled && setStatus('ready') });
          })
          .catch((err) => {
            console.warn('[area map]', err);
            if (!cancelled) setStatus('failed'); // e.g. no WebGL
          });
      },
      { rootMargin: '400px 0px' },
    );
    io.observe(node);
    return () => {
      cancelled = true;
      io.disconnect();
      handle.current?.destroy();
      handle.current = null;
    };
  }, []);

  const choose = (next: ViewId) => {
    viewRef.current = next;
    setView(next);
    handle.current?.show(next);
  };

  const places = POIS.filter((p) => p.views.includes(view));

  return (
    <div className="area-map">
      <div className="area-map__views" role="group" aria-label="Map view">
        {MAP_VIEWS.map((v) => (
          <button key={v.id} type="button" aria-pressed={view === v.id} onClick={() => choose(v.id)}>{v.label}</button>
        ))}
      </div>

      <div className="area-map__frame">
        {/* MapLibre wants an empty container, so the status message sits beside it. */}
        <div className="area-map__canvas" ref={canvas} role="region" aria-label="Interactive map of Manthali and the route to the hotel" />
        {status !== 'ready' && (
          <div className="area-map__status">
            {status === 'failed' ? (
              <p>
                Sorry, the interactive map can&apos;t run in this browser.{' '}
                <a href={HOTEL.mapsUrl} target="_blank" rel="noopener noreferrer">Open the hotel in Google Maps</a>.
              </p>
            ) : (
              <p>Loading the map…</p>
            )}
          </div>
        )}
      </div>

      <ul className="area-map__legend">
        {places.map((p) => (
          <li key={p.id}>
            <button type="button" onClick={() => handle.current?.focus(p.id)} disabled={status !== 'ready'}>
              <span className={`area-map__dot area-map__dot--${p.kind}`} aria-hidden="true" />
              <span><strong>{p.name}</strong><small>{p.note}</small></span>
            </button>
          </li>
        ))}
      </ul>
      <p className="area-map__foot">
        {view === 'flight'
          ? 'The dashed line shows the direction of the flight only; the planes follow the valleys. '
          : 'Ctrl + scroll (or two fingers) to zoom and pan. '}
        <a href={HOTEL.mapsUrl} target="_blank" rel="noopener noreferrer">
          Directions in Google Maps <Icon name="arrowRight" className="link__icon" />
        </a>
      </p>
    </div>
  );
}
