/* Builds the interactive area map on /location. AreaMap imports this module on demand, so MapLibre, its CSS
   and the route line only download once the map scrolls into view.
   Base map: OpenFreeMap (free, no key, no cookies). 3D terrain: AWS Terrain Tiles (public dataset). */
import 'maplibre-gl/dist/maplibre-gl.css';
import {
  FullscreenControl,
  getVersion,
  LngLatBounds,
  Map as MapLibreMap,
  Marker,
  NavigationControl,
  Popup,
  ScaleControl,
  setWorkerUrl,
} from 'maplibre-gl';
import { iconSvg } from '@/components/ui/Icon';
import { HOTEL_AT, LUKLA_AIRPORT, POIS, RAMECHHAP_RUNWAY, type LngLat, type Poi, type PoiKind, type ViewId } from '@/content/map';
import ROUTE from '@/content/route-kathmandu-manthali.json';

export type AreaMapHandle = { show: (view: ViewId) => void; focus: (id: string) => void; destroy: () => void };

const STYLE = 'https://tiles.openfreemap.org/styles/positron';
const DEM = {
  type: 'raster-dem' as const,
  tiles: ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png'],
  encoding: 'terrarium' as const,
  tileSize: 256,
  maxzoom: 14,
  attribution: '<a href="https://github.com/tilezen/joerd/blob/master/docs/attribution.md" target="_blank" rel="noopener">Terrain: Mapzen, AWS</a>',
};
const PIN_ICON: Record<PoiKind, Parameters<typeof iconSvg>[0]> = {
  hotel: 'bed', airport: 'plane', bus: 'bus', bank: 'cash', health: 'health', temple: 'landmark', city: 'pin',
};
// Site palette (globals.css :root), repeated here because map paint properties can't read CSS variables.
const PINE = '#15302a';
const GOLD = '#b68a4e';

const route = ROUTE as LngLat[];
const airport = POIS.find((p) => p.id === 'airport')!.at;
const line = (coordinates: LngLat[]) => ({
  type: 'Feature' as const, properties: {}, geometry: { type: 'LineString' as const, coordinates },
});
const mid = (a: LngLat, b: LngLat): LngLat => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];

const CAMERA: Record<ViewId, { points: LngLat[]; pitch: number; bearing: number; maxZoom: number }> = {
  area: { points: POIS.filter((p) => p.views.includes('area')).map((p) => p.at), pitch: 50, bearing: -15, maxZoom: 16 },
  drive: { points: route, pitch: 0, bearing: 0, maxZoom: 12 },
  flight: { points: [RAMECHHAP_RUNWAY, LUKLA_AIRPORT], pitch: 60, bearing: 60, maxZoom: 11 },
};

function el(tag: string, className: string, text?: string) {
  const node = document.createElement(tag);
  node.className = className;
  if (text) node.textContent = text;
  return node;
}

function pin(p: Poi) {
  const node = el('div', `map-pin map-pin--${p.kind}${p.label ? ' map-pin--labelled' : ''}`);
  node.innerHTML = iconSvg(PIN_ICON[p.kind]); // static, trusted markup from Icon.tsx
  node.append(el('span', 'map-pin__label', p.label ?? p.name));
  return node;
}

function popup(p: Poi) {
  const node = el('div', 'map-popup');
  node.append(el('strong', '', p.name), el('p', '', p.note));
  return new Popup({ offset: 24, maxWidth: '260px', focusAfterOpen: false }).setDOMContent(node);
}

export function createAreaMap(container: HTMLElement, { view, onReady }: { view: ViewId; onReady: () => void }): AreaMapHandle {
  setWorkerUrl(`/maplibre/${getVersion()}/maplibre-gl-worker.mjs`); // copied by scripts/copy-maplibre-worker.mjs
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const map = new MapLibreMap({
    container,
    style: STYLE,
    center: HOTEL_AT,
    zoom: 14,
    pitch: CAMERA.area.pitch,
    bearing: CAMERA.area.bearing,
    maxPitch: 70,
    cooperativeGestures: true, // page scroll keeps working; Ctrl + scroll (or two fingers) moves the map
    attributionControl: { compact: true },
  });
  map.addControl(new NavigationControl({ visualizePitch: true }), 'top-right');
  map.addControl(new FullscreenControl(), 'top-right');
  map.addControl(new ScaleControl({ unit: 'metric' }), 'bottom-left');

  const markers = POIS.map((p) => {
    // The hotel is a teardrop pointing down at its spot, so it doesn't cover the bus park 120 m away.
    const marker = new Marker({ element: pin(p), anchor: p.kind === 'hotel' ? 'bottom' : 'center' })
      .setLngLat(p.at).setPopup(popup(p)).addTo(map);
    marker.getElement().setAttribute('aria-label', p.name);
    return { poi: p, marker };
  });
  const tags: { views: ViewId[]; marker: Marker }[] = [
    // Sits below the flight line rather than on top of it.
    { views: ['flight'], marker: new Marker({ element: el('div', 'map-tag', 'About 74 km · 15–25 min flight'), anchor: 'top', offset: [0, 12] }).setLngLat(mid(RAMECHHAP_RUNWAY, LUKLA_AIRPORT)).addTo(map) },
  ];

  let current = view;
  const show = (next: ViewId, animate = true) => {
    current = next;
    const cam = CAMERA[next];
    const bounds = cam.points.reduce((b, p) => b.extend(p), new LngLatBounds(cam.points[0], cam.points[0]));
    // Extra room on the right for the hotel's label, which sits beside its pin.
    const padding = container.clientWidth < 600
      ? { top: 56, bottom: 56, left: 56, right: 120 }
      : { top: 90, bottom: 90, left: 90, right: 180 };
    map.fitBounds(bounds, {
      padding, pitch: cam.pitch, bearing: cam.bearing, maxZoom: cam.maxZoom,
      duration: animate && !reduceMotion ? 2400 : 0, essential: false,
    });
    for (const { poi, marker } of markers) {
      const visible = poi.views.includes(next);
      marker.getElement().classList.toggle('is-hidden', !visible);
      if (!visible && marker.getPopup()?.isOpen()) marker.togglePopup();
    }
    for (const t of tags) t.marker.getElement().classList.toggle('is-hidden', !t.views.includes(next));
  };

  map.on('load', () => {
    // Warm the base map towards the site's cream palette.
    if (map.getLayer('background')) map.setPaintProperty('background', 'background-color', '#f3eee4');
    if (map.getLayer('water')) map.setPaintProperty('water', 'fill-color', '#bcd5d1');

    // Hillshade and 3D terrain (separate sources, as MapLibre recommends).
    map.addSource('dem-terrain', DEM);
    map.addSource('dem-shade', DEM);
    const firstLine = map.getStyle().layers.find((l) => l.type === 'line')?.id;
    map.addLayer({
      id: 'hillshade', type: 'hillshade', source: 'dem-shade',
      paint: { 'hillshade-exaggeration': 0.4, 'hillshade-shadow-color': '#4a5550', 'hillshade-highlight-color': '#fbf8f2' },
    }, firstLine);
    map.setTerrain({ source: 'dem-terrain', exaggeration: 1.25 });

    const round = { 'line-join': 'round' as const, 'line-cap': 'round' as const };
    map.addSource('drive', { type: 'geojson', data: line(route) });
    map.addLayer({ id: 'drive-casing', type: 'line', source: 'drive', layout: round, paint: { 'line-color': PINE, 'line-width': 8, 'line-opacity': 0.2 } });
    map.addLayer({ id: 'drive', type: 'line', source: 'drive', layout: round, paint: { 'line-color': GOLD, 'line-width': 4 } });
    map.addSource('walk', { type: 'geojson', data: line([HOTEL_AT, airport]) });
    map.addLayer({ id: 'walk', type: 'line', source: 'walk', layout: round, paint: { 'line-color': PINE, 'line-width': 3, 'line-dasharray': [0.5, 2] } });
    // A straight line for direction only: the planes follow the valleys.
    map.addSource('flight', { type: 'geojson', data: line([RAMECHHAP_RUNWAY, LUKLA_AIRPORT]) });
    map.addLayer({ id: 'flight', type: 'line', source: 'flight', layout: round, paint: { 'line-color': PINE, 'line-width': 2.5, 'line-dasharray': [2, 2] } });

    show(current, false);
    onReady();
  });
  map.on('error', (e) => console.warn('[area map]', e.error?.message ?? e)); // e.g. a tile that failed to load

  return {
    show: (next) => show(next),
    focus: (id) => {
      const hit = markers.find((m) => m.poi.id === id);
      if (!hit) return;
      map.flyTo({ center: hit.poi.at, zoom: Math.max(map.getZoom(), current === 'area' ? 16 : 12), duration: reduceMotion ? 0 : 1600, essential: false });
      if (!hit.marker.getPopup()?.isOpen()) hit.marker.togglePopup();
    },
    destroy: () => map.remove(),
  };
}
