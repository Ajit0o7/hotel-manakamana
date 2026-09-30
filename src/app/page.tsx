import type { CSSProperties } from 'react';
import Image from 'next/image';
import { BookingBar } from '@/components/home/BookingBar';
import { HeroSlideshow, type Slide } from '@/components/home/HeroSlideshow';
import { StayStory, type StoryStep } from '@/components/home/StayStory';
import { PhotoGrid } from '@/components/gallery/PhotoGrid';
import { FlightBoard } from '@/components/home/FlightBoard';
import { CtaBand } from '@/components/sections/CtaBand';
import { JsonLd } from '@/components/seo/JsonLd';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { TLink } from '@/components/ui/TLink';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import { AMENITIES, HOTEL, SITE_URL, formatNPR } from '@/content/hotel';
import { IMG } from '@/content/images';
import { ROOMS } from '@/content/rooms';

export const metadata = { alternates: { canonical: '/' } };

const SLIDES: Slide[] = [
  { src: IMG.heroValleyView, alt: 'Green hills and Manthali valley seen from the hotel terrace', caption: 'The valley from our terrace' },
  { src: IMG.fbAirportRunway, alt: 'Manthali (Ramechhap) Airport runway lights at night', caption: 'Manthali Airport runway at night' },
  { src: IMG.ebnRooftopTerrace, alt: 'Rooftop terrace with tables and a view of the hills', caption: 'Our rooftop terrace' },
  { src: IMG.fbHotelExterior, alt: 'Hotel Manakamana Airport View lit up at night', caption: 'Our hotel, lit up at night', tall: true },
];

const STORY: StoryStep[] = [
  { step: '01 · Arrive', title: 'Drop your bags', text: 'After the drive from Kathmandu (about 4½ hours), check in at Manthali. We can store your luggage.', src: IMG.ebnExteriorDay, alt: 'Hotel Manakamana Airport View by day' },
  { step: '02 · Unwind', title: 'Your own balcony', text: 'An air-conditioned room with a flat-screen TV, free Wi-Fi, a hot shower and a balcony over the hills.', src: IMG.ebnRoomSofa, alt: 'Deluxe Double Room with seating area' },
  { step: '03 · Dine', title: 'Dal bhat on the roof', text: 'Home-cooked Nepali thali on the rooftop terrace, or room service if you would rather stay in.', src: IMG.foodThali, alt: 'Nepali thali set' },
  { step: '04 · Rest', title: 'Runway lights', text: 'An early night, with Manthali Airport’s runway just beyond the rooftops.', src: IMG.fbAirportRunway, alt: 'Manthali Airport runway at night' },
  { step: '05 · Fly', title: '500 m to the terminal', text: 'Wake up close to the airport and start your Everest journey rested.', src: IMG.heroValleyView, alt: 'Morning over the Manthali valley' },
];

const MARQUEE = ['Rest well', 'Fly early', 'Dal bhat power', 'Rooftop evenings', 'Manthali', 'Ramechhap'];

const hotelLd = {
  '@context': 'https://schema.org',
  '@type': 'Hotel',
  name: HOTEL.name,
  url: SITE_URL,
  description: 'Family-run hotel 500 m from Manthali (Ramechhap) Airport with air-conditioned rooms, balconies, free Wi-Fi and a rooftop restaurant.',
  telephone: HOTEL.phoneDisplay,
  image: `${SITE_URL}/opengraph-image.jpg`,
  address: { '@type': 'PostalAddress', streetAddress: HOTEL.street, addressLocality: HOTEL.locality, addressRegion: HOTEL.region, postalCode: HOTEL.postalCode, addressCountry: 'NP' },
  geo: { '@type': 'GeoCoordinates', latitude: HOTEL.geo.lat, longitude: HOTEL.geo.lng },
  priceRange: 'NPR 2,000–2,500',
  petsAllowed: false,
  amenityFeature: AMENITIES.map((a) => ({ '@type': 'LocationFeatureSpecification', name: a.label, value: true })),
};

export default function HomePage() {
  const marquee = (run: string) =>
    MARQUEE.flatMap((w) => [<span key={`${run}-${w}`}>{w}</span>, <span key={`${run}-${w}-sep`} className="sep">✦</span>]);
  return (
    <>
      <JsonLd data={hotelLd} />

      {/* ===== HERO ===== */}
      <HeroSlideshow slides={SLIDES}>
        <Eyebrow hero={0}>Manthali · Ramechhap · Nepal</Eyebrow>
        <SplitHeading as="h1">Rest well, <br /><em className="accent">fly early.</em></SplitHeading>
        <p className="lead" data-hero="" style={{ '--h': 3 } as CSSProperties}>
          A warm, family-run hotel just 500 m from Manthali (Ramechhap) Airport, with air-conditioned rooms, private
          balconies, free Wi-Fi and a rooftop restaurant looking over the valley.
        </p>
        <div className="hero__ctas" data-hero="" style={{ '--h': 4 } as CSSProperties}>
          <Button href="/contact" label="Check availability" variant="gold" arrow magnetic />
          <Button href="/rooms" label="Explore rooms" variant="light" magnetic />
        </div>
        <p className="hero__rating" data-hero="" style={{ '--h': 5 } as CSSProperties}>
          <span className="stars" aria-hidden="true">★★★★☆</span> <strong>{HOTEL.rating.value}</strong>{' '}
          <span>· {HOTEL.rating.count} Google reviews</span>
        </p>
      </HeroSlideshow>

      <BookingBar />

      {/* ===== QUICK FACTS ===== */}
      <div className="container">
        <div className="facts" data-stagger="">
          <div className="fact reveal"><span className="fact__num"><span data-count="4.1" data-decimals="1">4.1</span><small>★</small></span><span className="fact__label">Google rating</span></div>
          <div className="fact reveal"><span className="fact__num"><span data-count="54">54</span></span><span className="fact__label">Guest reviews</span></div>
          <div className="fact reveal"><span className="fact__num"><span data-count="4.5" data-decimals="1">4.5</span><small>hrs</small></span><span className="fact__label">From Kathmandu by road</span></div>
          <div className="fact reveal"><span className="fact__num"><span data-count="500">500</span><small>m</small></span><span className="fact__label">To Manthali Airport</span></div>
        </div>
      </div>

      {/* ===== MARQUEE ===== */}
      <div className="marquee" aria-hidden="true"><div className="marquee__track">{marquee('a')}{marquee('b')}</div></div>

      {/* ===== INTRO ===== */}
      <section className="section">
        <div className="container split">
          <div className="split__media">
            <div className="reveal-img">
              <Image src={IMG.fbHotelExterior} alt="Hotel Manakamana Airport View lit up at night" sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
            </div>
            <div className="split__badge reveal" style={{ '--d': '.7s' } as CSSProperties}>
              <strong>4.1★</strong><span>Rated &quot;Very good&quot; by 54 guests on Google</span>
            </div>
          </div>
          <div data-stagger="">
            <Eyebrow num="01">Welcome</Eyebrow>
            <SplitHeading>A warm Nepali welcome, <em className="accent">minutes</em> from your flight</SplitHeading>
            <p className="lead reveal">Hotel Manakamana Airport View is a friendly, family-run hotel in Manthali, Ramechhap: 500 m from the airport and 300 m from the bus park.</p>
            <p className="reveal">
              Many trekkers stay here before flying from Manthali to Lukla. Others stop on the Lamosangu–Ramechhap
              highway on the way through. Either way, you get a clean, air-conditioned room with its own balcony, a hot
              shower, a good plate of dal bhat and tea on the rooftop.
            </p>
            <ul className="checks reveal">
              <li>Private balconies over the runway and green hills</li>
              <li>Air conditioning, flat-screen TV and free Wi-Fi</li>
              <li>Private bathrooms with plenty of hot water</li>
              <li>Rooftop restaurant, room service and kind, helpful hosts</li>
            </ul>
            <Button href="/rooms" label="Explore our rooms" variant="outline" arrow className="reveal" />
          </div>
        </div>
      </section>

      {/* ===== WHY STAY ===== */}
      <section className="section section--pine">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow num="02">Why guests choose us</Eyebrow>
              <SplitHeading>Everything you need, <em className="accent">nothing</em> you don&apos;t</SplitHeading>
            </div>
          </div>
          <div className="grid grid--4" data-stagger="">
            {([
              { icon: 'plane', title: 'Close to the airport', text: 'Just 500 m from Manthali Airport, so an early Lukla flight is easy.' },
              { icon: 'shower', title: 'Clean & comfortable', text: 'Air-conditioned rooms with a balcony, flat-screen TV and a proper hot shower after a long road.' },
              { icon: 'food', title: 'Home-cooked food', text: 'Nepali thali, dal bhat, breakfasts, snacks and hot tea, all made fresh.' },
              { icon: 'heart', title: 'Friendly service', text: "Guests keep telling us they felt at home. We'll mind your luggage and help with travel plans." },
            ] satisfies { icon: IconName; title: string; text: string }[]).map((f, i) => (
              <div className="feature reveal" key={f.title}>
                <span className="feature__num">0{i + 1}</span>
                <div className="feature__icon"><Icon name={f.icon} /></div>
                <h3>{f.title}</h3>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ===== YOUR STAY, STEP BY STEP (new) ===== */}
      <StayStory
        steps={STORY}
        head={
          <>
            <div>
              <Eyebrow num="03">Your stay</Eyebrow>
              <SplitHeading>From the road to <em className="accent">the runway</em></SplitHeading>
            </div>
            <p className="reveal">One easy night between Kathmandu and the mountains. Scroll to follow your stay, step by step.</p>
          </>
        }
      />

      {/* ===== ROOMS PREVIEW ===== */}
      <section className="section">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow num="04">Stay</Eyebrow>
              <SplitHeading>Our rooms</SplitHeading>
              <p className="reveal">Air-conditioned rooms with private balconies and free Wi-Fi. Rates are room only and can change, so call or WhatsApp to confirm.</p>
            </div>
            <TLink href="/rooms" className="link reveal">All rooms &amp; amenities →</TLink>
          </div>
          <div className="grid grid--2" data-stagger="">
            {ROOMS.map((r) => (
              <article className="card reveal" key={r.slug}>
                <TLink href={`/rooms/${r.slug}`} className="card__media" aria-label={`${r.name} details`}>
                  <Image src={r.image.src} alt={r.image.alt} fill sizes="(max-width: 680px) 100vw, 580px" placeholder="blur" />
                  <span className="tag">{r.tag}</span>
                </TLink>
                <div className="card__body">
                  <h3>{r.name}</h3>
                  <p>{r.summary}</p>
                  <div className="card__foot">
                    <span className="price">From <strong>{formatNPR(r.price)}</strong> / night</span>
                    <TLink href={`/rooms/${r.slug}`} className="link">Details →</TLink>
                  </div>
                </div>
              </article>
            ))}
          </div>
        </div>
      </section>

      {/* ===== DINING ===== */}
      <section className="section section--sand">
        <div className="container split split--reverse">
          <div className="split__media split__media--wide">
            <div className="reveal-img">
              <Image src={IMG.rooftopDining} alt="Guests dining together on the rooftop terrace with hill views" sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
            </div>
          </div>
          <div data-stagger="">
            <Eyebrow num="05">Rooftop restaurant</Eyebrow>
            <SplitHeading>Dal bhat <em className="accent">with a view</em></SplitHeading>
            <p className="reveal">Our rooftop terrace is where guests meet. Trekking groups share stories there over a Nepali thali, and the hills turn golden in the evening.</p>
            <ul className="checks reveal">
              <li>Traditional Nepali thali &amp; dal bhat</li>
              <li>Breakfast, sandwiches &amp; snacks</li>
              <li>Tea and coffee all day</li>
            </ul>
            <Button href="/dining" label="See the menu" variant="outline" arrow className="reveal" />
          </div>
        </div>
      </section>

      {/* ===== LUKLA BANNER (+ live weather) ===== */}
      <section className="banner">
        <div className="banner__media" data-parallax="0.12">
          <Image src={IMG.fbAirportRunway} alt="Manthali (Ramechhap) Airport runway lights at night" fill sizes="100vw" placeholder="blur" />
        </div>
        <div className="container">
          <Eyebrow num="06">Flying to Lukla?</Eyebrow>
          <SplitHeading>Start your Everest journey <em className="accent">rested</em></SplitHeading>
          <p className="reveal">
            In peak trekking season, many Lukla flights leave from Manthali (Ramechhap) Airport. Drive in from Kathmandu
            the day before and stay with us. Then it&apos;s a short trip to the airport in the morning.
          </p>
          <div className="hero__ctas reveal">
            <Button href="/location#flights" label="Getting here" variant="gold" arrow magnetic />
            <Button href="/contact" label="Book your night" variant="light" magnetic />
          </div>
          <ManthaliNow />
        </div>
      </section>

      {/* ===== FLIGHT BOARD ===== */}
      <FlightBoard />

      {/* ===== REVIEW ===== */}
      <section className="section">
        <div className="container container--narrow center testimonial">
          <div className="rating reveal"><span className="stars">★★★★☆</span> {HOTEL.rating.value} · {HOTEL.rating.count} Google reviews</div>
          <blockquote className="quote reveal">“{HOTEL.review.quote}”</blockquote>
          <p className="quote__by reveal">— {HOTEL.review.author}, {HOTEL.review.source}</p>
        </div>
      </section>

      {/* ===== GALLERY TEASER ===== */}
      <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow num="07">Gallery</Eyebrow>
              <SplitHeading>A glimpse of <em className="accent">your stay</em></SplitHeading>
            </div>
            <TLink href="/gallery" className="link reveal">View all photos →</TLink>
          </div>
          <PhotoGrid
            variant="mosaic"
            shapes={['big', '', '', 'wide']}
            items={[
              { src: IMG.viewManthaliTown, alt: 'View over Manthali town and green hills' },
              { src: IMG.foodThali, alt: 'Nepali thali set' },
              { src: IMG.fbRooftopDining, alt: 'Guests at dinner on the rooftop at night' },
              { src: IMG.fbRoomTwoBeds, alt: 'Spacious room with sofa and attached bathroom' },
            ]}
          />
        </div>
      </section>

      {/* ===== LOCATION TEASER ===== */}
      <section className="section">
        <div className="container split">
          <iframe className="map reveal" title="Map showing Hotel Manakamana Airport View" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={HOTEL.mapEmbed} />
          <div data-stagger="">
            <Eyebrow num="08">Find us</Eyebrow>
            <SplitHeading>500 m from Manthali <em className="accent">Airport</em></SplitHeading>
            <p className="reveal">{HOTEL.address}</p>
            <dl className="info reveal">
              <dt>Airport</dt><dd>Manthali (Ramechhap) Airport, 500 m</dd>
              <dt>Bus park</dt><dd>Manthali Bus Park, 300 m</dd>
              <dt>Kathmandu</dt><dd>{HOTEL.distances.kathmandu}</dd>
            </dl>
            <Button href="/location" label="Directions & nearby" variant="outline" arrow className="reveal" />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
