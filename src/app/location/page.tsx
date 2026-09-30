import type { Metadata } from 'next';
import Image from 'next/image';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import { HOTEL, NEARBY } from '@/content/hotel';
import { IMG } from '@/content/images';

export const metadata: Metadata = {
  title: 'Location & Getting Here',
  description: '500 m from Manthali (Ramechhap) Airport and 300 m from Manthali Bus Park: an easy base for Lukla flights.',
  alternates: { canonical: '/location' },
};

export default function LocationPage() {
  return (
    <>
      <PageHero
        photo={{ src: IMG.viewValleyClouds, alt: 'Valley around Manthali' }}
        eyebrow="Location"
        title={<>Getting <em className="accent">here</em></>}
        text="500 m from Manthali (Ramechhap) Airport and 300 m from the bus park, on the Lamosangu–Ramechhap Highway."
        crumbs={[{ label: 'Location' }]}
      />

      <section className="section">
        <div className="container split">
          <iframe className="map reveal" title="Map showing Hotel Manakamana Airport View" loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={HOTEL.mapEmbed} />
          <div data-stagger="">
            <Eyebrow>Address</Eyebrow>
            <SplitHeading>Find us in <em className="accent">Manthali</em></SplitHeading>
            <p className="reveal">{HOTEL.address}</p>
            <dl className="info reveal">
              <dt>Phone</dt><dd><a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a></dd>
              <dt>Airport</dt><dd>Manthali (Ramechhap) Airport, 500 m</dd>
              <dt>Bus park</dt><dd>Manthali Bus Park, 300 m</dd>
            </dl>
            <Button href={HOTEL.mapsUrl} label="Open in Google Maps" variant="dark" icon={<Icon name="pin" />} className="reveal" />
          </div>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow>Travel times</Eyebrow>
              <SplitHeading>How to <em className="accent">reach us</em></SplitHeading>
            </div>
          </div>
          <div className="grid grid--3" data-stagger="">
            <div className="route reveal"><div className="route__time">~4½ hrs</div><h3>From Kathmandu</h3><p>By road via the BP Highway and Lamosangu–Ramechhap Highway. Tourist jeeps and buses run daily.</p></div>
            <div className="route reveal"><div className="route__time">500 m</div><h3>From the airport</h3><p>Manthali (Ramechhap) Airport is about 500 m away, an easy walk or a very short ride. Ask us about getting to your early flight.</p></div>
            <div className="route reveal"><div className="route__time">300 m</div><h3>From the bus park</h3><p>Manthali Bus Park is about 300 m away, a short walk with your bags.</p></div>
          </div>
        </div>
      </section>

      <section className="section" id="flights">
        <div className="container split split--reverse">
          <div className="split__media split__media--wide">
            <div className="reveal-img">
              <Image src={IMG.fbAirportRunway} alt="Manthali (Ramechhap) Airport runway lights at night" sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
            </div>
          </div>
          <div data-stagger="">
            <Eyebrow>Lukla flights</Eyebrow>
            <SplitHeading>Flying to Lukla from <em className="accent">Ramechhap</em></SplitHeading>
            <p className="reveal">
              During the busy trekking seasons, many Lukla flights for the Everest region leave from Manthali (Ramechhap)
              Airport rather than Kathmandu. Flights usually go early in the morning, when the weather is clearest.
            </p>
            <ul className="checks reveal">
              <li>Drive from Kathmandu the day before</li>
              <li>Stay the night with us, 500 m from the airport</li>
              <li>Eat an early breakfast, then head to the terminal</li>
            </ul>
            <ManthaliNow tone="light" />
            <p className="muted reveal" style={{ marginTop: 20 }}>Always check your flight time and departure airport with your airline or trekking agency.</p>
            <div className="hero__ctas reveal" style={{ marginTop: 0 }}>
              <Button href="/contact#enquiry" label="Book your night before" variant="dark" arrow />
              <Button href="/guides/manthali-to-lukla-flights" label="Read the flight guide" variant="outline" />
            </div>
          </div>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container container--narrow">
          <Eyebrow>Explore nearby</Eyebrow>
          <SplitHeading>Places worth <em className="accent">the drive</em></SplitHeading>
          <ul className="nearby" data-stagger="">
            {NEARBY.map((n) => (
              <li className="reveal" key={n.name}>
                <span><strong>{n.name}</strong> · {n.note}</span>
                <span>{n.time}</span>
              </li>
            ))}
          </ul>
          <p className="muted reveal" style={{ marginTop: 18 }}>Distances and driving times are approximate.</p>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
