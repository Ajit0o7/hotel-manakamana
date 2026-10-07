/* Structured data (JSON-LD) shared across pages. Every page points at the same Hotel node by its @id,
   so search engines see one hotel with its rooms, restaurant, photos and website linked together.

   Deliberately left out: aggregateRating / review. Our ratings come from Google and Tripadvisor, and
   Google's review-snippet rules forbid marking up reviews collected on other sites (or self-serving
   LocalBusiness reviews), so adding them risks a manual action and would never show stars anyway.

   Check-in and check-out are "any time", which checkinTime/checkoutTime (a single clock time) can't
   express, so they are listed as amenity features instead, matching the policies shown on the site. */
import type { Hotel } from '@/lib/cms/site';
import { HOTEL, SITE_URL, formatNPR } from './hotel';
import { IMG } from './images';
import type { Room } from './rooms';

export const HOTEL_ID = `${SITE_URL}/#hotel`;
export const WEBSITE_ID = `${SITE_URL}/#website`;
export const roomId = (slug: string) => `${SITE_URL}/rooms/${slug}#room`;

export const abs = (path: string) => (/^https?:\/\//.test(path) ? path : `${SITE_URL}${path}`);

/** Short reference to the hotel, for nesting inside other pages' structured data. */
export const hotelRef = { '@type': 'Hotel', '@id': HOTEL_ID, name: HOTEL.name, url: SITE_URL };

export const websiteLd = {
  '@context': 'https://schema.org',
  '@type': 'WebSite',
  '@id': WEBSITE_ID,
  name: HOTEL.name,
  alternateName: HOTEL.shortName,
  url: SITE_URL,
  inLanguage: 'en',
  publisher: { '@id': HOTEL_ID },
};

/** The hotel's structured data, from the CMS settings and rooms. */
export const hotelLd = (hotel: Hotel, rooms: Room[]) => ({
  '@context': 'https://schema.org',
  '@type': 'Hotel',
  '@id': HOTEL_ID,
  name: HOTEL.name,
  alternateName: HOTEL.shortName,
  url: SITE_URL,
  description:
    'Family-run hotel in Manthali, 500 m from Ramechhap Airport, where Lukla flights leave in the trekking seasons. Air-conditioned rooms with private balconies, free Wi-Fi and a rooftop restaurant serving Nepali food.',
  telephone: hotel.phoneTel,
  logo: abs('/icons/icon-512.png'),
  image: [
    abs('/opengraph-image.jpg'),
    abs(IMG.fbHotelExterior.src),
    abs(IMG.ebnExteriorDay.src),
    abs(IMG.ebnRoomSofa.src),
    abs(IMG.ebnRooftopTerrace.src),
    abs(IMG.rooftopDining.src),
  ],
  address: {
    '@type': 'PostalAddress',
    streetAddress: hotel.street,
    addressLocality: hotel.locality,
    addressRegion: hotel.region,
    postalCode: hotel.postalCode,
    addressCountry: 'NP',
  },
  geo: { '@type': 'GeoCoordinates', latitude: hotel.geo.lat, longitude: hotel.geo.lng },
  hasMap: hotel.mapsUrl,
  sameAs: Object.values(hotel.profiles).filter(Boolean),
  numberOfRooms: hotel.roomCount,
  priceRange: priceRange(rooms),
  currenciesAccepted: 'NPR',
  paymentAccepted: hotel.payment.join(', '),
  availableLanguage: hotel.languages.map((l) => ({ '@type': 'Language', name: l.name, alternateName: l.code })),
  petsAllowed: false,
  amenityFeature: [...hotel.amenities.map((a) => a.label), 'Check-in any time', 'Check-out any time'].map((name) => ({
    '@type': 'LocationFeatureSpecification',
    name,
    value: true,
  })),
  containsPlace: [
    ...rooms.map((r) => ({ '@type': 'HotelRoom', '@id': roomId(r.slug), name: r.name, url: abs(`/rooms/${r.slug}`) })),
    {
      '@type': 'Restaurant',
      name: `Rooftop restaurant at ${HOTEL.name}`,
      servesCuisine: 'Nepali',
      hasMenu: abs('/dining'),
      url: abs('/dining'),
    },
  ],
});

/** "NPR 2,000–2,500 per night" from the room prices. */
function priceRange(rooms: Room[]): string {
  const prices = rooms.map((r) => r.price).filter((p) => p > 0);
  if (!prices.length) return 'NPR';
  const lo = Math.min(...prices), hi = Math.max(...prices);
  return `${formatNPR(lo)}${hi > lo ? `–${hi.toLocaleString('en-US')}` : ''} per night`;
}

/** A room page's structured data. HotelRoom is also typed as Product because schema.org only allows
    `offers` on products and services (the pattern schema.org's own hotel docs use). */
export const roomLd = (room: Room) => ({
  '@context': 'https://schema.org',
  '@type': ['HotelRoom', 'Product'],
  '@id': roomId(room.slug),
  name: room.name,
  description: room.description,
  url: abs(`/rooms/${room.slug}`),
  image: room.photos.map((p) => abs(p.src.src)),
  occupancy: { '@type': 'QuantitativeValue', maxValue: room.maxGuests, unitCode: 'C62' },
  bed: { '@type': 'BedDetails', numberOfBeds: 1, typeOfBed: 'Double' },
  amenityFeature: room.features.map((f) => ({ '@type': 'LocationFeatureSpecification', name: f, value: true })),
  containedInPlace: hotelRef,
  offers: {
    '@type': 'Offer',
    url: abs(`/rooms/${room.slug}`),
    price: room.price,
    priceCurrency: 'NPR',
    description: 'Per room per night, room only',
    offeredBy: { '@id': HOTEL_ID },
  },
});
