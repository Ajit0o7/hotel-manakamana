/* Airlines flying Manthali (Ramechhap) → Lukla.
   Phone numbers and websites checked on each airline's own website on 30 Sep 2026
   (Tara Air: head office 01-5719111, reservations 01-5719112 · Summit Air: 01-4117523/24 ·
   Sita Air: 01-4110710 / 4110642 / 4110682). Fleets: Tara Air Twin Otter & Dornier 228,
   Summit Air Let L-410, Sita Air Dornier 228. */

export type Airline = {
  name: string;
  about: string;
  aircraft: string;
  phoneDisplay: string;
  phoneTel: string;
  site: string;
  url: string;
};

export const AIRLINES: Airline[] = [
  {
    name: 'Tara Air',
    about: 'Mountain STOL airline of the Yeti Airlines group, built around short, steep airstrips like Lukla.',
    aircraft: 'Twin Otter & Dornier 228',
    phoneDisplay: '+977 1-5719112',
    phoneTel: '+97715719112',
    site: 'taraair.com',
    url: 'https://www.taraair.com',
  },
  {
    name: 'Summit Air',
    about: 'Flies the Let L-410, a rugged twin-turboprop made for short, high-altitude runways.',
    aircraft: 'Let L-410 Turbolet',
    phoneDisplay: '+977 1-4117523',
    phoneTel: '+97714117523',
    site: 'summitair.com.np',
    url: 'https://summitair.com.np',
  },
  {
    name: 'Sita Air',
    about: 'Operates a fleet of Dornier 228 twin-turboprops on Nepal’s mountain routes.',
    aircraft: 'Dornier 228',
    phoneDisplay: '+977 1-4110710',
    phoneTel: '+97714110710',
    site: 'sitaair.com.np',
    url: 'https://www.sitaair.com.np',
  },
];

/** Typical Lukla departure window (weather permitting). */
export const FLIGHT_WINDOW = '06:00–10:00';
