/* Travel guides (/guides/[slug]).
   Facts checked 30 Sep 2026 against: CAAN's Ramechhap diversion notice as reported by trekking operators
   (all scheduled Lukla flights from Ramechhap from 25 Sep 2025, peak seasons), Wikipedia (Ramechhap and
   Tenzing-Hillary airports), the airlines' own websites and The Kathmandu Post (BP Highway, Oct 2025).
   Keep claims hedged where they change from season to season (dates, baggage allowances, schedules).

   Inline text supports [link text](/path) and **bold**. */
import type { CmsHead } from '@/lib/cms/site';
import { IMG, type Photo } from './images';

export type Block =
  | { type: 'h2'; id: string; text: string }
  | { type: 'p'; text: string }
  | { type: 'list'; items: string[]; ordered?: boolean }
  | { type: 'callout'; title: string; text: string }
  | { type: 'compare'; items: { title: string; points: string[]; tone?: 'good' }[] }
  | { type: 'airlines' }
  | { type: 'weather' }
  | { type: 'map'; title: string; src: string }
  | { type: 'figure'; photo: Photo; caption: string; credit?: Credit }
  | { type: 'table'; caption: string; head: string[]; rows: string[][] } // cells support inline formatting
  | { type: 'cta'; title: string; text: string };

/** Attribution for photos we don't own (CC BY / CC BY-SA require it). */
export type Credit = { author: string; license: string; licenseUrl: string; sourceUrl: string };

/* Wikimedia Commons photos, downloaded 30 Sep 2026 (resized only). */
const CC_BY_2 = { license: 'CC BY 2.0', licenseUrl: 'https://creativecommons.org/licenses/by/2.0/' };
const CC_BY_SA_3 = { license: 'CC BY-SA 3.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/3.0/' };
const CC_BY_SA_4 = { license: 'CC BY-SA 4.0', licenseUrl: 'https://creativecommons.org/licenses/by-sa/4.0/' };
const commons = (file: string) => `https://commons.wikimedia.org/wiki/File:${file}`;
const CREDIT = {
  luklaTakeoff: { author: 'Petr Meissner', ...CC_BY_2, sourceUrl: commons('2015-12-19_Lukla_airport.jpg') },
  luklaCloud: { author: 'James Heilman', ...CC_BY_SA_3, sourceUrl: commons('LuklaAirportBadWeather.JPG') },
  ramechhapTaraAir: { author: 'Himalayanasiatreks', ...CC_BY_SA_4, sourceUrl: commons('Rammechap_Airport_-_Everest_Base_Camp_Trek_,_Himalayan_Asia_Treks.jpg') },
  summitAir: { author: 'Treflyn', ...CC_BY_SA_4, sourceUrl: commons('Summit_Air.jpg') },
  beniGhat: { author: 'Bijay Chaurasia', ...CC_BY_SA_4, sourceUrl: commons('Meeting_point_of_Sunkoshi_and_Tama_Koshi_River_from_Beni_Ghat-IMG0620-Pano.jpg') },
  mulkot: { author: 'Bijay Chaurasia', ...CC_BY_SA_4, sourceUrl: commons('Mulkot,_Sindhuli_District,Nepal.jpg') },
} satisfies Record<string, Credit>;

export type Guide = {
  slug: string;
  title: string; // <title> and card title
  heading: [string, string]; // h1: plain part + italic accent part
  eyebrow: string;
  description: string;
  hero: Photo;
  heroCredit?: Credit;
  published: string;
  updated: string;
  readMins: number;
  facts: [string, string][];
  body: Block[];
  /** HTML body, for guides written in the CMS (used instead of `body`). */
  html?: string;
  sources: { label: string; url: string }[];
  head?: CmsHead; // SEO settings from the CMS
};

export const GUIDES: Guide[] = [
  {
    slug: 'manthali-to-lukla-flights',
    title: 'Manthali (Ramechhap) to Lukla Flights: The Complete Guide',
    heading: ['Manthali to Lukla', 'flights'],
    eyebrow: 'Flight guide',
    description:
      'When Lukla flights leave from Ramechhap, which airlines fly the route, flight time, baggage limits, weather delays and why to sleep in Manthali the night before.',
    hero: { src: IMG.ramechhapAirportAerial, alt: 'Ramechhap Airport runway beside the river in Manthali, with the town and hills behind' },
    published: '2026-09-30',
    updated: '2026-09-30',
    readMins: 5,
    facts: [
      ['Route', 'Manthali (Ramechhap) → Lukla'],
      ['Flight time', 'About 15–25 minutes'],
      ['Airlines', 'Tara Air, Summit Air, Sita Air'],
      ['When', 'Peak spring and autumn seasons'],
      ['Departures', 'Early morning, weather permitting'],
      ['Baggage', 'Often 10 kg checked + 5 kg hand'],
    ],
    body: [
      { type: 'h2', id: 'why-manthali', text: 'Why Lukla flights leave from Manthali' },
      { type: 'p', text: "Kathmandu's Tribhuvan International Airport gets extremely busy in the trekking seasons. To ease the congestion, Nepal's Civil Aviation Authority moves scheduled Lukla flights to **Ramechhap Airport in Manthali** during the peak spring and autumn seasons. From 25 September 2025, for example, all scheduled Lukla flights were operated from Ramechhap instead of Kathmandu." },
      { type: 'figure', photo: { src: IMG.ramechhapAirportTerminal, alt: 'Ramechhap Airport terminal with its departures and arrivals entrances and control tower' }, caption: 'The small terminal at Ramechhap Airport. Departures are on the left, arrivals on the right, and the control tower sits in between.' },
      { type: 'p', text: 'The exact dates change from year to year, and outside the peak seasons most Lukla flights go from Kathmandu again. Always check with your airline or trekking agency which airport your flight leaves from.' },
      { type: 'h2', id: 'airlines', text: 'Airlines flying Manthali to Lukla' },
      { type: 'p', text: 'Three airlines fly small STOL (short take-off and landing) aircraft on the route. Tickets are sold by the airlines and by trekking agencies. We do not sell flight tickets, but here is how to reach each airline:' },
      { type: 'figure', photo: { src: IMG.ramechhapAirportTaraAir, alt: 'Tara Air Twin Otter and Dornier 228 aircraft parked on the apron at Ramechhap Airport' }, caption: 'Tara Air\'s Twin Otter and Dornier 228 on the apron at Ramechhap Airport.', credit: CREDIT.ramechhapTaraAir },
      { type: 'airlines' },
      { type: 'h2', id: 'flight', text: 'Flight time and what to expect' },
      { type: 'p', text: 'The flight takes about **15–25 minutes**, shorter than the flight from Kathmandu. Flights leave early in the morning, usually between about 6 and 10 AM, when mountain weather tends to be calmest. Arrive at the terminal early: your airline or agency will tell you your check-in time.' },
      { type: 'p', text: "You land at Lukla's Tenzing-Hillary Airport, a short, sloping airstrip at about 2,850 m. Only small aircraft can use it, which is why seats and baggage space are limited." },
      { type: 'figure', photo: { src: IMG.luklaAirportTakeoff, alt: 'A Tara Air Dornier 228 lifting off from the sloping runway at Lukla, with the Khumbu mountains behind' }, caption: 'A Tara Air Dornier 228 lifts off from Lukla\'s short, steeply sloping runway.', credit: CREDIT.luklaTakeoff },
      { type: 'h2', id: 'baggage', text: 'Baggage limits' },
      { type: 'p', text: 'Because the planes are small, baggage limits are strict. A common allowance is **10 kg of checked baggage plus 5 kg of hand luggage** per passenger, but it varies by airline and ticket. Extra weight is charged and only carried if there is space, so check your allowance when you book.' },
      { type: 'figure', photo: { src: IMG.summitAirLet410, alt: 'A Summit Air Let L-410 aircraft in flight against a blue sky' }, caption: 'A Summit Air Let L-410. Planes this size carry fewer than 20 passengers, so there is little room for extra bags.', credit: CREDIT.summitAir },
      { type: 'callout', title: 'Leave the rest with us', text: 'Staying with us before your trek? We can store your extra bags until you are back from the mountains.' },
      { type: 'h2', id: 'weather', text: 'Weather, delays and cancellations' },
      { type: 'p', text: 'Lukla flights depend on the weather. Pilots need good visibility at Lukla and along the route, so cloud or wind in the mountains can delay or cancel flights even on a clear morning in Manthali. Here are the conditions right now:' },
      { type: 'weather' },
      { type: 'p', text: 'If your flight is held or cancelled, read our [guide to Lukla flight delays and cancellations](/guides/lukla-flight-cancelled).' },
      { type: 'h2', id: 'getting-there', text: 'Getting to Manthali in time' },
      { type: 'p', text: 'Ramechhap Airport is about 130–145 km from Kathmandu, a 4–5 hour drive along the BP Highway. To catch a morning flight, many trekkers leave Kathmandu between 1 and 3 AM. The easier option is to drive the day before and sleep in Manthali. See [how to get from Kathmandu to Manthali](/guides/kathmandu-to-manthali).' },
      { type: 'cta', title: 'Sleep 500 m from the terminal', text: 'Arrive the evening before, have dinner on our rooftop and walk to the airport in the morning, rested.' },
      { type: 'h2', id: 'night-before', text: 'Your night before the flight' },
      { type: 'list', items: [
        'About 500 m from the terminal: an easy walk or a very short ride',
        'Air-conditioned rooms with a private bathroom and hot shower',
        'Rooftop restaurant, with breakfast and room service available',
        'Free Wi-Fi to follow flight updates',
        'Luggage storage while you trek',
      ] },
    ],
    sources: [
      { label: 'Ramechhap Airport (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ramechhap_Airport' },
      { label: 'Tenzing-Hillary Airport, Lukla (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Tenzing-Hillary_Airport' },
      { label: 'Tara Air', url: 'https://www.taraair.com' },
      { label: 'Summit Air', url: 'https://summitair.com.np' },
      { label: 'Sita Air', url: 'https://www.sitaair.com.np' },
    ],
  },
  {
    slug: 'kathmandu-to-manthali',
    title: 'Kathmandu to Manthali (Ramechhap Airport): How to Get There',
    heading: ['Kathmandu to', 'Manthali'],
    eyebrow: 'Getting here',
    description:
      'Distance, route, drive time and transport options from Kathmandu to Manthali and Ramechhap Airport, plus whether to drive through the night or arrive the day before your Lukla flight.',
    hero: { src: IMG.bpHighwayMulkot, alt: 'The BP Highway winding beside the Sunkoshi River at Mulkot, Sindhuli' },
    heroCredit: CREDIT.mulkot,
    published: '2026-09-30',
    updated: '2026-09-30',
    readMins: 4,
    facts: [
      ['Distance', 'About 130–145 km'],
      ['Drive time', '4–5 hours, longer in the monsoon'],
      ['Route', 'Dhulikhel → BP Highway → Khurkot → Manthali'],
      ['Night drive', 'Leave around 1–3 AM for a morning flight'],
      ['Our hotel', '500 m from the airport, 300 m from the bus park'],
    ],
    body: [
      { type: 'h2', id: 'route', text: 'The route' },
      { type: 'p', text: 'Most drivers leave the Kathmandu Valley through Bhaktapur and Dhulikhel, then follow the **BP Highway** down towards the Sunkoshi River and turn off at Khurkot onto the road to Manthali, the headquarters of Ramechhap district.' },
      { type: 'figure', photo: { src: IMG.bpHighwayBeniGhat, alt: 'The road above Beni Ghat, where the Tamakoshi River joins the Sunkoshi' }, caption: 'The Tamakoshi joins the Sunkoshi at Beni Ghat. From Khurkot, the road to Manthali follows the Tamakoshi upstream.', credit: CREDIT.beniGhat },
      { type: 'map', title: 'Driving route from Kathmandu to Manthali', src: 'https://maps.google.com/maps?saddr=Thamel,+Kathmandu&daddr=Ramechhap+Airport,+Manthali&output=embed' },
      { type: 'h2', id: 'time', text: 'How long it takes' },
      { type: 'p', text: 'Plan on **4–5 hours** for the drive. Traffic leaving Kathmandu, roadworks and landslides in the monsoon can make it longer. In October 2025, for example, floods and landslides damaged parts of the BP Highway and traffic had to be diverted, so check the road before you set off.' },
      { type: 'h2', id: 'transport', text: 'Ways to travel' },
      { type: 'list', items: [
        '**Private car or jeep:** most trekking agencies arrange one as part of your package, and you can also hire one in Kathmandu.',
        '**Shared jeeps and tourist buses:** in the trekking seasons they run between Kathmandu and Manthali, often overnight to reach the morning flights. Ask your agency or your Kathmandu hotel about current departures.',
        '**Local buses:** the cheapest and slowest option. Ask locally for the latest times.',
      ] },
      { type: 'h2', id: 'night-or-day', text: 'Drive through the night, or arrive the day before?' },
      { type: 'compare', items: [
        { title: 'Night drive', points: ['Leave Kathmandu around 1–3 AM', 'No extra hotel night', 'Little sleep before the flight', 'A slow road can make you late for check-in'] },
        { title: 'Arrive the day before', tone: 'good', points: ['Drive in daylight and see the valley', 'Sleep 500 m from the terminal', 'A calm, rested start to your trek', 'A buffer if the weather holds flights'] },
      ] },
      { type: 'cta', title: 'Break the journey in Manthali', text: 'Drive down in daylight, stay with us and walk to the airport in the morning.' },
      { type: 'h2', id: 'arriving', text: 'Arriving in Manthali' },
      { type: 'p', text: 'We are on the Lamosangu–Ramechhap Highway at Manthali Bus Stand, about 300 m from the bus park and 500 m from the airport. See our [location page](/location) for the map and directions.' },
      { type: 'figure', photo: { src: IMG.ramechhapAirportAerial, alt: 'Manthali town beside Ramechhap Airport runway and the river' }, caption: 'Manthali from the hillside across the Tamakoshi River. The airport runway runs along the riverbank, with the town right beside it.' },
    ],
    sources: [
      { label: 'Ramechhap Airport (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ramechhap_Airport' },
      { label: 'BP Highway traffic diverted after floods (The Kathmandu Post, Oct 2025)', url: 'https://kathmandupost.com/nepali-diaspora/2025/10/06/bp-highway-traffic-diverted-after-floods-and-landslides-damage-road' },
    ],
  },
  {
    slug: 'lukla-flight-cancelled',
    title: 'Lukla Flight Delayed or Cancelled? What to Do in Manthali',
    heading: ['Lukla flight', 'cancelled?'],
    eyebrow: 'When the weather turns',
    description:
      'Why Lukla flights get delayed or cancelled, what to do at Ramechhap Airport, your options if the weather will not clear, how to spend a delay day in Manthali, and where to stay near the airport tonight.',
    hero: { src: IMG.viewValleyClouds, alt: 'Low cloud over the valley around Manthali' },
    published: '2026-09-30',
    updated: '2026-09-30',
    readMins: 6,
    facts: [
      ['Why', 'Cloud, wind or poor visibility at Lukla or on the route'],
      ['First step', 'Talk to your airline or agency about rebooking'],
      ['Options', 'Next flight, helicopter (extra cost) or another route'],
      ['Near the airport', 'We are 500 m from the terminal'],
    ],
    body: [
      { type: 'h2', id: 'why', text: 'Why Lukla flights get cancelled' },
      { type: 'p', text: 'Flights to Lukla fly by sight into a short mountain airstrip, so pilots need clear visibility at Lukla and along the route. Cloud or wind in the mountains can hold flights even when the sky over Manthali is blue. When a morning is lost, the backlog of passengers can take a day or more to clear.' },
      { type: 'figure', photo: { src: IMG.luklaAirportCloud, alt: 'Low cloud rolling over the runway at Lukla as a small Tara Air plane prepares to take off' }, caption: 'Cloud rolling in over Lukla\'s runway. When the airstrip or the route is covered, flights from Manthali wait until it clears.', credit: CREDIT.luklaCloud },
      { type: 'weather' },
      { type: 'h2', id: 'what-to-do', text: 'What to do if your flight is held' },
      { type: 'list', ordered: true, items: [
        'Stay in touch with your airline or agency. They announce new departure times and rebook passengers.',
        'Keep your ticket, ID and hand luggage with you while you wait.',
        'If flights are called off for the day, ask about your place on the next flights and find a bed close to the airport.',
        'Keep a spare day or two in your itinerary, for the flight back from Lukla too.',
      ] },
      { type: 'h2', id: 'options', text: 'If the weather will not clear' },
      { type: 'list', items: [
        '**Wait for the next flight:** usually the cheapest option.',
        '**Helicopter:** charter or shared seats cost more. Ask your agency, and check whether your travel insurance covers it.',
        '**Another route:** some agencies can arrange road transport into the Solukhumbu region instead. Ask yours.',
      ] },
      { type: 'h2', id: 'delay-day', text: 'Making the most of a delay day' },
      { type: 'p', text: 'Rebooked onto a later flight, or told there are no more flights today? Then the day is yours. If you are still on standby, keep your phone charged and switched on and stay within easy reach of the terminal: the airline may call you back at short notice when the weather clears. Here is an easy plan for a free day, all on foot from the hotel:' },
      { type: 'table', caption: 'A delay-day plan in Manthali', head: ['Time', 'What to do'], rows: [
        ['06:00–08:00', 'Walk into Manthali bazaar for a hot milk tea, and take out cash while you are there. The banks are about 1 km from the hotel: see them on our [area map](/location#map).'],
        ['08:30–09:30', 'Watch the airstrip from our rooftop, or ask us the way to **Selfie Danda**, a small hill near the runway with a view over the airport and the valley.'],
        ['10:00–13:00', 'Walk down past the runway to the wide bed of the **Tamakoshi River**, about 15 minutes away, and watch valley life along the water.'],
        ['13:30–15:00', 'Lunch in the bazaar, or dal bhat on our rooftop.'],
        ['16:00–18:30', 'Walk up the ridge behind the airport for sunset over the valley, and head back before the evening chill.'],
      ] },
      { type: 'p', text: '**Grounded for the whole day?** [Khandadevi Temple](/location#map), a hilltop temple and viewpoint, is about 1 hr 15 min away by hired jeep. Only go once your airline has confirmed there are no more flights today.' },
      { type: 'callout', title: 'Bring cash from Kathmandu', text: 'ATMs in Manthali can run out of cash in the busy trekking seasons, so carry enough rupees for your stay and for your trek.' },
      { type: 'h2', id: 'phrases', text: 'Useful Nepali phrases for the bazaar' },
      { type: 'p', text: 'Shopkeepers are used to trekkers, and a few words of Nepali go a long way:' },
      { type: 'table', caption: 'Useful Nepali phrases', head: ['English', 'Nepali', 'When to use it'], rows: [
        ['Hello', '**Namaste**', 'A greeting for anyone, at any time of day'],
        ['How much is this?', '**Yasko kati ho?**', 'Asking the price in a shop'],
        ['Where is the ATM?', '**ATM kaha cha?**', 'Finding a cash point'],
        ['Where is the pharmacy?', '**Medical kaha cha?**', 'Pharmacies are usually called “medical” in Nepal'],
        ['Is there water?', '**Paani cha?**', 'Buying bottled drinking water'],
        ['Thank you', '**Dhanyabaad**', 'Showing appreciation'],
        ['That’s very expensive!', '**Ekdam mahango bhayo!**', 'Friendly bargaining, with a smile'],
      ] },
      { type: 'cta', title: 'Need a room tonight?', text: 'Stay 500 m from the terminal: air-conditioned rooms, hot showers, free Wi-Fi to follow flight updates, a rooftop restaurant and luggage storage. Call or WhatsApp us to check what is free tonight.' },
      { type: 'h2', id: 'plan-ahead', text: 'Plan ahead for next time' },
      { type: 'p', text: 'Arriving in Manthali the day before your flight gives you a calmer start and a buffer if the weather is slow to clear. See [how to get from Kathmandu to Manthali](/guides/kathmandu-to-manthali) and our [Manthali to Lukla flight guide](/guides/manthali-to-lukla-flights).' },
    ],
    sources: [
      { label: 'Tenzing-Hillary Airport, Lukla (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Tenzing-Hillary_Airport' },
      { label: 'Ramechhap Airport (Wikipedia)', url: 'https://en.wikipedia.org/wiki/Ramechhap_Airport' },
    ],
  },
];

export const getGuide = (slug: string) => GUIDES.find((g) => g.slug === slug);
