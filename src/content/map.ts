/* Places on the interactive area map (/location). Coordinates come from OpenStreetMap, checked 30 Sep 2026;
   only places with a mapped position are shown. Not mapped in OpenStreetMap yet, so not on the map:
   Devkota (Madan Ashrit) Chowk and the Global IME, Laxmi Sunrise, Prabhu and Rastriya Banijya bank branches.
   Add them here once their positions are confirmed on the ground. */
import { HOTEL } from './hotel';

export type LngLat = [number, number];
export type PoiKind = 'hotel' | 'airport' | 'bus' | 'bank' | 'health' | 'temple' | 'city';
/** `label` is shown on the map at all times; other pins show their name on hover. */
export type Poi = { id: string; kind: PoiKind; name: string; label?: string; note: string; at: LngLat; views: ViewId[] };
export type ViewId = 'area' | 'drive' | 'flight';

export const MAP_VIEWS: { id: ViewId; label: string }[] = [
  { id: 'area', label: 'Around the hotel' },
  { id: 'drive', label: 'Drive from Kathmandu' },
  { id: 'flight', label: 'Flight to Lukla' },
];

export const HOTEL_AT: LngLat = [HOTEL.geo.lng, HOTEL.geo.lat];
export const RAMECHHAP_RUNWAY: LngLat = [86.05986, 27.39334];
export const LUKLA_AIRPORT: LngLat = [86.7297, 27.6869];

export const POIS: Poi[] = [
  { id: 'hotel', kind: 'hotel', name: HOTEL.name, label: HOTEL.shortName, note: 'Your base for the night before your flight.', at: HOTEL_AT, views: ['area', 'drive', 'flight'] },
  { id: 'airport', kind: 'airport', name: 'Ramechhap Airport (Manthali)', label: 'Terminal · about 500 m walk', note: 'Terminal and apron, about 500 m from the hotel. Lukla flights leave from here in the trekking seasons.', at: [86.06093, 27.39399], views: ['area'] }, // at flight-view zoom it sits on top of the hotel pin
  { id: 'bus', kind: 'bus', name: 'Manthali Bus Park', note: 'Buses and jeeps to and from Kathmandu.', at: [86.06254, 27.38901], views: ['area'] },
  { id: 'banks', kind: 'bank', name: 'Banks', note: 'NMB Bank and Agriculture Development Bank. ATMs can run out of cash in the busy trekking seasons, so bring enough rupees from Kathmandu.', at: [86.05946, 27.38187], views: ['area'] },
  { id: 'health', kind: 'health', name: 'Hospital & pharmacy', note: 'District Health Center and Tamakoshi Hospital, with a pharmacy nearby.', at: [86.061, 27.3806], views: ['area'] },
  { id: 'khandadevi', kind: 'temple', name: 'Khandadevi Temple', note: 'Hilltop temple and viewpoint, about 1 hr 15 min by jeep. A good day out if the weather holds your flight.', at: [85.92801, 27.46194], views: ['drive'] },
  { id: 'kathmandu', kind: 'city', name: 'Thamel, Kathmandu', label: 'Kathmandu', note: 'Start of the drive: about 133 km and 4–5 hours by road via the BP Highway.', at: [85.3123, 27.7154], views: ['drive'] },
  { id: 'lukla', kind: 'airport', name: 'Lukla (Tenzing-Hillary Airport)', label: 'Lukla', note: 'About 2,850 m up. The flight from Manthali takes about 15–25 minutes, weather permitting.', at: LUKLA_AIRPORT, views: ['flight'] },
];
