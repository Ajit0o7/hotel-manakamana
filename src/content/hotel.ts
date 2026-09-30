/* Hotel facts — one source of truth for every page.
   Sources: Google Hotels listing, the hotel's eBooking Nepal listing (checked 29 Sep 2026)
   and the hotel's own logo. Items marked TODO still need the owner's confirmation. */

export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://www.hotelmanthali.com'; // domain shown on the hotel's own flyer

export const HOTEL = {
  name: 'Hotel Manakamana Airport View',
  shortName: 'Hotel Manakamana',
  tagline: 'Airport View · Manthali',
  phoneDisplay: '+977 984-4228627',
  phoneTel: '+9779844228627',
  whatsapp: '9779844228627', // TODO confirm this number is on WhatsApp
  address: 'Manthali Bus Stand, Lamosangu–Ramechhap Highway, Manthali, Bagmati Province 45400, Nepal',
  street: 'Manthali Bus Stand, Lamosangu–Ramechhap Highway',
  locality: 'Manthali',
  region: 'Bagmati Province',
  postalCode: '45400',
  geo: { lat: 27.390018, lng: 86.062944 },
  mapsUrl: 'https://www.google.com/maps/search/?api=1&query=Hotel+Manakamana+Airport+View+Manthali',
  mapEmbed: 'https://maps.google.com/maps?q=Hotel%20Manakamana%20Airport%20View%20Manthali&z=15&output=embed',
  rating: { value: 4.1, count: 54, source: 'Google' },
  review: {
    quote: 'Excellent service with great food and tea. People are very kind and friendly.',
    author: 'Orichiz',
    source: 'Tripadvisor (5/5)',
  },
  distances: { airport: '500 m', busPark: '300 m', kathmandu: 'About 4½ hours by road' },
  priceFrom: 2000,
} as const;

export const WHATSAPP_URL = `https://wa.me/${HOTEL.whatsapp}`;
export const whatsappWith = (text: string) => `${WHATSAPP_URL}?text=${encodeURIComponent(text)}`;

export const NAV = [
  { href: '/', label: 'Home' },
  { href: '/rooms', label: 'Rooms' },
  { href: '/dining', label: 'Dining' },
  { href: '/gallery', label: 'Gallery' },
  { href: '/location', label: 'Location' },
  { href: '/contact', label: 'Contact' },
] as const;

export const formatNPR = (n: number) => `NPR ${n.toLocaleString('en-US')}`;

/* House rules and policies from the listing */
export const POLICIES = [
  { term: 'Check-in', detail: 'Tell us your arrival time when you book' },
  { term: 'Early flights', detail: "Tell us your flight time and we'll help you plan the morning" },
  { term: 'ID', detail: 'A valid ID is required at check-in' },
  { term: 'Rates', detail: 'Room only. Meals are available at our restaurant' },
  { term: 'Cancellation', detail: "Depends on the room type. We'll confirm it when you book" },
  { term: 'Pets', detail: 'Not allowed' },
  { term: 'Smoking', detail: 'Non-smoking rooms, with a designated smoking area' },
  { term: 'House rules', detail: 'No outside food. Damage to hotel property is charged to the guest' },
] as const;

/* Hotel-wide amenities marked "YES" on the listing */
export const AMENITIES = [
  { icon: 'wifi', label: 'Free Wi-Fi' },
  { icon: 'ac', label: 'Air conditioning' },
  { icon: 'tv', label: 'Flat-screen TV' },
  { icon: 'shower', label: 'Private bathroom & hot shower' },
  { icon: 'balcony', label: 'Private balcony' },
  { icon: 'bell', label: 'Room service' },
  { icon: 'food', label: 'Restaurant' },
  { icon: 'sun', label: 'Rooftop terrace' },
  { icon: 'car', label: 'Parking' },
  { icon: 'bag', label: 'Luggage storage' },
  { icon: 'nosmoke', label: 'Non-smoking rooms' },
  { icon: 'smoke', label: 'Designated smoking area' },
] as const;

export const NEARBY = [
  { name: 'Manthali (Ramechhap) Airport', note: 'Lukla flights', time: '500 m' },
  { name: 'Manthali Bus Park', note: 'buses & jeeps', time: '300 m' },
  { name: 'Khandadevi Temple', note: 'hilltop temple & viewpoint', time: '~1 hr 15 min' },
  { name: 'Sindhuli Gadhi War Museum', note: 'historic fort', time: '~1 hr 15 min' },
  { name: 'Kala Ghar', note: 'local point of interest', time: '~1 hr 30 min' },
  { name: 'Tribhuvan International Airport', note: 'Kathmandu', time: '~4 hr 30 min' },
] as const;

export const FAQS = [
  { q: 'How do I book a room?', a: `Use the booking form to send us your dates on WhatsApp, or call ${HOTEL.phoneDisplay}. We'll confirm availability and today's rate.` },
  { q: 'How close are you to Manthali (Ramechhap) Airport?', a: 'About 500 m, an easy walk or a very short ride, and Manthali Bus Park is about 300 m away. Many guests stay with us the night before their Lukla flight.' },
  { q: 'How much are the rooms?', a: 'The Deluxe Double Room is from NPR 2,500 and the Double Room from NPR 2,000 per night, room only. Prices can change, so please confirm when you book.' },
  { q: 'Is breakfast included?', a: 'Our rates are room only. Breakfast and other meals are available at our rooftop restaurant, and room service is available too.' },
  { q: 'How long is the drive from Kathmandu?', a: 'Around 4½ hours by road, depending on traffic and road conditions.' },
  { q: 'Do you have Wi-Fi and parking?', a: 'Yes. Free Wi-Fi and parking are available, and we can store your luggage.' },
  { q: 'Are pets allowed?', a: 'Sorry, pets are not allowed.' },
  { q: 'Can you host trekking groups?', a: 'Yes, we regularly welcome groups. Contact us with your group size and dates so we can prepare rooms and meals.' },
] as const;
