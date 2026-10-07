/* The built-in content of the website's pages, as sections (see sections.ts). The CMS was filled with these on
   its first start, and the site falls back to them when the CMS can't be reached during a build. */
import { GALLERY } from './gallery';
import { IMG } from './images';
import type { Section } from './sections';

const ctaBand: Section = {
  layout: 'cta_band',
  eyebrow: 'Reservations',
  heading: 'Ready to rest before *your flight?*',
  text: 'Rooms from {price_from} a night. Call or WhatsApp us to check availability.',
};

const home: Section[] = [
  {
    layout: 'hero_slideshow',
    eyebrow: 'Manthali · Ramechhap · Nepal',
    heading: 'Rest well, \n*fly early.*',
    text: 'A warm, family-run hotel just 500 m from Manthali (Ramechhap) Airport, with air-conditioned rooms, private balconies, free Wi-Fi and a rooftop restaurant looking over the valley.',
    buttons: [
      { label: 'Check availability', link: '/contact', style: 'gold', icon: 'arrow' },
      { label: 'Explore rooms', link: '/rooms', style: 'light' },
    ],
    show_rating: true,
    slides: [
      { photo: { src: IMG.heroValleyView, alt: 'Green hills and Manthali valley seen from the hotel terrace' }, caption: 'The valley from our terrace' },
      { photo: { src: IMG.fbAirportRunway, alt: 'Manthali (Ramechhap) Airport runway lights at night' }, caption: 'Manthali Airport runway at night' },
      { photo: { src: IMG.ebnRooftopTerrace, alt: 'Rooftop terrace with tables and a view of the hills' }, caption: 'Our rooftop terrace' },
      { photo: { src: IMG.fbHotelExterior, alt: 'Hotel Manakamana Airport View lit up at night' }, caption: 'Our hotel, lit up at night', tall: true },
    ],
  },
  { layout: 'booking_bar' },
  {
    layout: 'facts',
    items: [
      { value: '{rating}', suffix: '★', label: 'Google rating' },
      { value: '{reviews}', label: 'Guest reviews' },
      { value: '4.5', suffix: 'hrs', label: 'From Kathmandu by road' },
      { value: '500', suffix: 'm', label: 'To Manthali Airport' },
    ],
  },
  { layout: 'marquee', words: ['Rest well', 'Fly early', 'Dal bhat power', 'Rooftop evenings', 'Manthali', 'Ramechhap'] },
  {
    layout: 'split',
    number: '01',
    eyebrow: 'Welcome',
    heading: 'A warm Nepali welcome, *minutes* from your flight',
    photo: { src: IMG.fbHotelExterior, alt: 'Hotel Manakamana Airport View lit up at night' },
    badge_value: '{rating}★',
    badge_text: 'Rated "Very good" by {reviews} guests on Google',
    lead: 'Hotel Manakamana Airport View is a friendly, family-run hotel in Manthali, Ramechhap: 500 m from the airport and 300 m from the bus park.',
    text: 'Many trekkers stay here before flying from Manthali to Lukla. Others stop on the Lamosangu–Ramechhap highway on the way through. Either way, you get a clean, air-conditioned room with its own balcony, a hot shower, a good plate of dal bhat and tea on the rooftop.',
    checks: [
      'Private balconies over the runway and green hills',
      'Air conditioning, flat-screen TV and free Wi-Fi',
      'Private bathrooms with plenty of hot water',
      'Rooftop restaurant, room service and kind, helpful hosts',
    ],
    buttons: [{ label: 'Explore our rooms', link: '/rooms', style: 'outline', icon: 'arrow' }],
  },
  {
    layout: 'features',
    background: 'pine',
    number: '02',
    eyebrow: 'Why guests choose us',
    heading: "Everything you need, *nothing* you don't",
    items: [
      { icon: 'plane', title: 'Close to the airport', text: 'Just 500 m from Manthali Airport, so an early Lukla flight is easy.' },
      { icon: 'shower', title: 'Clean & comfortable', text: 'Air-conditioned rooms with a balcony, flat-screen TV and a proper hot shower after a long road.' },
      { icon: 'food', title: 'Home-cooked food', text: 'Nepali thali, dal bhat, breakfasts, snacks and hot tea, all made fresh.' },
      { icon: 'heart', title: 'Friendly service', text: "Guests keep telling us they felt at home. We'll mind your luggage and help with travel plans." },
    ],
  },
  {
    layout: 'stay_story',
    number: '03',
    eyebrow: 'Your stay',
    heading: 'From the road to *the runway*',
    text: 'One easy night between Kathmandu and the mountains. Scroll to follow your stay, step by step.',
    steps: [
      { step: '01 · Arrive', title: 'Drop your bags', text: 'After the drive from Kathmandu (about 4½ hours), check in at Manthali. We can store your luggage.', photo: { src: IMG.ebnExteriorDay, alt: 'Hotel Manakamana Airport View by day' } },
      { step: '02 · Unwind', title: 'Your own balcony', text: 'An air-conditioned room with a flat-screen TV, free Wi-Fi, a hot shower and a balcony over the hills.', photo: { src: IMG.ebnRoomSofa, alt: 'Deluxe Double Room with seating area' } },
      { step: '03 · Dine', title: 'Dal bhat on the roof', text: 'Home-cooked Nepali thali on the rooftop terrace, or room service if you would rather stay in.', photo: { src: IMG.foodThali, alt: 'Nepali thali set' } },
      { step: '04 · Rest', title: 'Runway lights', text: 'An early night, with Manthali Airport’s runway just beyond the rooftops.', photo: { src: IMG.fbAirportRunway, alt: 'Manthali Airport runway at night' } },
      { step: '05 · Fly', title: '500 m to the terminal', text: 'Wake up close to the airport and start your Everest journey rested.', photo: { src: IMG.heroValleyView, alt: 'Morning over the Manthali valley' } },
    ],
  },
  {
    layout: 'rooms_preview',
    number: '04',
    eyebrow: 'Stay',
    heading: 'Our rooms',
    text: 'Air-conditioned rooms with private balconies and free Wi-Fi. Rates are room only and can change, so call or WhatsApp to confirm.',
    link_label: 'All rooms & amenities →',
  },
  {
    layout: 'split',
    background: 'sand',
    photo_side: 'right',
    photo: { src: IMG.rooftopDining, alt: 'Guests dining together on the rooftop terrace with hill views' },
    number: '05',
    eyebrow: 'Rooftop restaurant',
    heading: 'Dal bhat *with a view*',
    text: 'Our rooftop terrace is where guests meet. Trekking groups share stories there over a Nepali thali, and the hills turn golden in the evening.',
    checks: ['Traditional Nepali thali & dal bhat', 'Breakfast, sandwiches & snacks', 'Tea and coffee all day'],
    buttons: [{ label: 'See the menu', link: '/dining', style: 'outline', icon: 'arrow' }],
  },
  {
    layout: 'banner',
    photo: { src: IMG.fbAirportRunway, alt: 'Manthali (Ramechhap) Airport runway lights at night' },
    number: '06',
    eyebrow: 'Flying to Lukla?',
    heading: 'Start your Everest journey *rested*',
    text: "In peak trekking season, many Lukla flights leave from Manthali (Ramechhap) Airport. Drive in from Kathmandu the day before and stay with us. Then it's a short trip to the airport in the morning.",
    buttons: [
      { label: 'Getting here', link: '/location#flights', style: 'gold', icon: 'arrow' },
      { label: 'Book your night', link: '/contact', style: 'light' },
    ],
    show_weather: true,
  },
  {
    layout: 'flight_board',
    note: 'Flights usually leave early in the morning and move with the weather. Tickets are booked with the airline or your trekking agency, so always confirm your departure time with them. [Read our Manthali to Lukla flight guide →](/guides/manthali-to-lukla-flights)',
    tips: [
      { icon: 'calendar', title: 'Confirm the evening before', text: 'Lukla schedules move with the mountain weather. Check your flight time with your airline or agency the evening before, and again in the morning.' },
      { icon: 'bag', title: 'Pack light, leave the rest', text: 'Lukla flights have strict baggage limits, so check yours with the airline. Leave extra bags with us while you trek.' },
      { icon: 'plane', title: '500 m to the terminal', text: 'Wake up close to Manthali Airport: an easy walk or a very short ride, with no pre-dawn drive from Kathmandu.' },
    ],
    guides_eyebrow: 'Travel guides',
    guides_heading: 'Plan your *flight day*',
  },
  { layout: 'review' },
  {
    layout: 'photo_mosaic',
    background: 'sand',
    number: '07',
    eyebrow: 'Gallery',
    heading: 'A glimpse of *your stay*',
    link_label: 'View all photos →',
    link: '/gallery',
    photos: [
      { src: IMG.viewManthaliTown, alt: 'View over Manthali town and green hills' },
      { src: IMG.foodThali, alt: 'Nepali thali set' },
      { src: IMG.fbRooftopDining, alt: 'Guests at dinner on the rooftop at night' },
      { src: IMG.fbRoomTwoBeds, alt: 'Spacious room with sofa and attached bathroom' },
    ],
  },
  {
    layout: 'split',
    media: 'map',
    number: '08',
    eyebrow: 'Find us',
    heading: '500 m from Manthali *Airport*',
    text: '{address}',
    details: [
      { term: 'Airport', detail: 'Manthali (Ramechhap) Airport, 500 m' },
      { term: 'Bus park', detail: 'Manthali Bus Park, 300 m' },
      { term: 'Kathmandu', detail: '{distance_kathmandu}' },
    ],
    buttons: [{ label: 'Directions & nearby', link: '/location', style: 'outline', icon: 'arrow' }],
  },
  ctaBand,
];

const rooms: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.ebnRoomMural, alt: 'Room with a Himalayan mountain mural' },
    eyebrow: 'Stay',
    heading: 'Rooms & *amenities*',
    text: '{room_count} air-conditioned rooms with private balconies, flat-screen TVs and free Wi-Fi, 500 m from Manthali Airport.',
    crumb: 'Rooms',
  },
  { layout: 'rooms_list', note: 'Prices are per room per night, room only, as listed in September 2026. They can change, so please confirm when you book.' },
  { layout: 'amenities', background: 'sand', eyebrow: 'Amenities', heading: 'At the *hotel*' },
  {
    layout: 'split',
    photo: { src: IMG.bathroom, alt: 'Clean private bathroom with shower' },
    eyebrow: 'Good to know',
    heading: 'Before you *arrive*',
    show_policies: true,
    buttons: [{ label: 'Send an enquiry', link: '/contact#enquiry', style: 'dark', icon: 'arrow' }],
  },
  ctaBand,
];

const dining: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.ebnRooftopTerrace, alt: 'Rooftop terrace with tables and a view of the hills' },
    eyebrow: 'Dining',
    heading: 'Rooftop *restaurant*',
    text: 'Home-cooked Nepali food, hearty breakfasts and hot tea, served with views of the hills.',
    crumb: 'Dining',
  },
  {
    layout: 'split',
    photo: { src: IMG.foodDalBhat, alt: 'Dal bhat set with rice, curry and pickles' },
    eyebrow: 'Our kitchen',
    heading: 'Cooked fresh, *Nepali* style',
    lead: '"Dal bhat power, 24 hour!" There\'s no better fuel before the mountains.',
    text: "We cook everything fresh for our guests. You can have a full Nepali thali with rice, dal, seasonal greens and pickles, or a quick breakfast before the airport. Groups are welcome and we're happy to cater for vegetarians. Prefer to eat in? Room service is available.",
    buttons: [{ label: 'Book a table or group meal', link: '/contact#enquiry', style: 'outline', icon: 'arrow' }],
  },
  {
    layout: 'banner',
    photo: { src: IMG.fbRooftopTerrace, alt: 'Trekking group at dinner on the rooftop at night' },
    eyebrow: 'The rooftop',
    heading: 'Where travellers *meet*',
    text: 'Pull up a chair, order a pot of tea and watch the hills. Trekking groups love our rooftop for dinner the night before they fly.',
    buttons: [{ label: 'Plan a group dinner', link: '/contact#enquiry', style: 'gold', icon: 'arrow' }],
  },
  {
    layout: 'menu_cards',
    background: 'sand',
    eyebrow: 'Menu highlights',
    heading: 'What we *serve*',
    items: [
      { photo: { src: IMG.foodThali, alt: 'Nepali thali' }, tag: 'Signature', title: 'Nepali thali', text: 'Rice, dal, vegetable curry, saag, pickles, papad and curd, served the traditional way.' },
      { photo: { src: IMG.foodDalBhat, alt: 'Dal bhat' }, tag: 'Everyday favourite', title: 'Dal bhat', text: "The classic trekker's meal. It's filling and wholesome, and refills are always welcome." },
      { photo: { src: IMG.foodBreakfast, alt: 'Breakfast plate' }, tag: 'Morning', title: 'Breakfast', text: 'Eggs, potatoes and local sides, so you set off well fed.' },
      { photo: { src: IMG.foodSandwich, alt: 'Sandwich with fries' }, tag: 'Light bites', title: 'Sandwiches & snacks', text: 'Toasted sandwiches, fries and snacks when you arrive hungry.' },
    ],
  },
  ctaBand,
];

const gallery: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.viewManthaliTown, alt: 'Manthali town and hills' },
    eyebrow: 'Gallery',
    heading: 'Photo *gallery*',
    text: 'Our rooms, our rooftop, our food and the green hills of Ramechhap.',
    crumb: 'Gallery',
  },
  { layout: 'gallery', photos: GALLERY.map(({ cat, ...photo }) => ({ photo, category: cat, caption: photo.alt })) },
  ctaBand,
];

const location: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.viewValleyClouds, alt: 'Valley around Manthali' },
    eyebrow: 'Location',
    heading: 'Getting *here*',
    text: '500 m from Manthali (Ramechhap) Airport and 300 m from the bus park, on the Lamosangu–Ramechhap Highway.',
    crumb: 'Location',
  },
  {
    layout: 'split',
    photo: { src: IMG.ramechhapAirportAerial, alt: 'Manthali town beside Ramechhap Airport runway and the Tamakoshi River' },
    eyebrow: 'Address',
    heading: 'Find us in *Manthali*',
    text: '{address}',
    details: [
      { term: 'Phone', detail: '[{phone}](tel:{phone_tel})' },
      { term: 'Airport', detail: 'Manthali (Ramechhap) Airport, 500 m' },
      { term: 'Bus park', detail: 'Manthali Bus Park, 300 m' },
    ],
    buttons: [{ label: 'Open in Google Maps', link: '{maps_url}', style: 'dark', icon: 'pin' }],
  },
  {
    layout: 'area_map',
    background: 'sand',
    anchor: 'map',
    eyebrow: 'Explore the map',
    heading: 'Manthali *in 3D*',
    text: 'The walk to the airport, the drive from Kathmandu and the flight to Lukla, over the real terrain. Tap a place for details.',
  },
  {
    layout: 'routes',
    eyebrow: 'Travel times',
    heading: 'How to *reach us*',
    items: [
      { time: '~4½ hrs', title: 'From Kathmandu', text: 'By road via the BP Highway and Lamosangu–Ramechhap Highway. Tourist jeeps and buses run daily.' },
      { time: '500 m', title: 'From the airport', text: 'Manthali (Ramechhap) Airport is about 500 m away, an easy walk or a very short ride. Ask us about getting to your early flight.' },
      { time: '300 m', title: 'From the bus park', text: 'Manthali Bus Park is about 300 m away, a short walk with your bags.' },
    ],
  },
  {
    layout: 'split',
    background: 'sand',
    anchor: 'flights',
    photo_side: 'right',
    photo: { src: IMG.fbAirportRunway, alt: 'Manthali (Ramechhap) Airport runway lights at night' },
    eyebrow: 'Lukla flights',
    heading: 'Flying to Lukla from *Ramechhap*',
    text: 'During the busy trekking seasons, many Lukla flights for the Everest region leave from Manthali (Ramechhap) Airport rather than Kathmandu. Flights usually go early in the morning, when the weather is clearest.',
    checks: ['Drive from Kathmandu the day before', 'Stay the night with us, 500 m from the airport', 'Eat an early breakfast, then head to the terminal'],
    show_weather: true,
    note: 'Always check your flight time and departure airport with your airline or trekking agency.',
    buttons: [
      { label: 'Book your night before', link: '/contact#enquiry', style: 'dark', icon: 'arrow' },
      { label: 'Read the flight guide', link: '/guides/manthali-to-lukla-flights', style: 'outline' },
    ],
  },
  { layout: 'nearby', eyebrow: 'Explore nearby', heading: 'Places worth *the drive*', note: 'Distances and driving times are approximate.' },
  ctaBand,
];

const guides: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.ramechhapAirportAerial, alt: 'Ramechhap Airport runway beside the Tamakoshi River in Manthali' },
    eyebrow: 'Travel guides',
    heading: 'Plan your *flight*',
    text: 'Practical guides for trekkers flying from Manthali (Ramechhap) to Lukla, written by the hotel 500 m from the airport.',
    crumb: 'Guides',
  },
  { layout: 'guides_grid' },
  ctaBand,
];

const contact: Section[] = [
  {
    layout: 'page_hero',
    photo: { src: IMG.exterior, alt: 'Hotel Manakamana building' },
    eyebrow: 'Contact',
    heading: 'Book your *stay*',
    text: "Send us your dates and we'll confirm on WhatsApp, or just give us a call.",
    crumb: 'Contact',
  },
  {
    layout: 'enquiry',
    anchor: 'enquiry',
    form_heading: 'Booking enquiry',
    form_text: 'Fill this in and it will open WhatsApp with your message ready to send.',
    side_eyebrow: 'Reach us directly',
    side_heading: "We're happy *to help*",
    rooms_text: 'From {price_from} a night, room only',
  },
  { layout: 'faq', background: 'sand', eyebrow: 'FAQ', heading: 'Common *questions*' },
];

/** Each built-in page's sections, by the page's slug in the CMS. */
export const PAGE_SECTIONS: Record<string, Section[]> = { home, rooms, dining, gallery, location, guides, contact };

/** The pages that have their own route in src/app/(site); every other CMS page is served by [...path]. */
export const BUILT_IN_PAGES = new Set(Object.keys(PAGE_SECTIONS));
