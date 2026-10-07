import type { Metadata } from 'next';
import Image from 'next/image';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { formatNPR } from '@/content/hotel';
import { IMG } from '@/content/images';
import { getHotel, getPriceFrom, getRooms, pageMetadata } from '@/lib/cms/site';

export async function generateMetadata(): Promise<Metadata> {
  return pageMetadata('rooms', '/rooms', {
    title: 'Rooms & Rates',
    description: `Deluxe Double and Double rooms with air conditioning, balcony, flat-screen TV and free Wi-Fi, 500 m from Manthali (Ramechhap) Airport. From ${formatNPR(await getPriceFrom())} a night.`,
    alternates: { canonical: '/rooms' },
  });
}

export default async function RoomsPage() {
  const [hotel, rooms] = await Promise.all([getHotel(), getRooms()]);
  return (
    <>
      <PageHero
        photo={{ src: IMG.ebnRoomMural, alt: 'Room with a Himalayan mountain mural' }}
        eyebrow="Stay"
        title={<>Rooms &amp; <em className="accent">amenities</em></>}
        text={`${hotel.roomCount} air-conditioned rooms with private balconies, flat-screen TVs and free Wi-Fi, 500 m from Manthali Airport.`}
        crumbs={[{ label: 'Rooms' }]}
      />

      <section className="section">
        <div className="container">
          {rooms.map((r, i) => (
            <article className={`room${i % 2 ? ' room--reverse' : ''}`} id={r.anchor} key={r.slug}>
              <div className="room__media">
                <div className="reveal-img">
                  <Image src={r.image.src} alt={r.image.alt} sizes="(max-width: 960px) 100vw, 640px" placeholder="blur" />
                </div>
              </div>
              <div data-stagger="">
                <span className="room__num reveal" aria-hidden="true">{r.num}</span>
                <span className="tag reveal">{r.tag}</span>
                <SplitHeading>{r.name}</SplitHeading>
                <p className="room__price reveal"><strong>{formatNPR(r.price)}</strong> / night <span>· room only</span></p>
                <div className="room__meta reveal">
                  <span><Icon name="users" /> Up to {r.maxGuests} guests</span>
                  <span><Icon name="bed" /> {r.beds}</span>
                  <span><Icon name="shower" /> Private bathroom</span>
                </div>
                <p className="reveal">{r.description}</p>
                <ul className="pill-list reveal">{r.features.map((f) => <li key={f}>{f}</li>)}</ul>
                <div className="hero__ctas reveal" style={{ marginTop: 0 }}>
                  <Button href={`/rooms/${r.slug}`} label="Room details" variant="dark" arrow />
                  <Button href={`/contact?room=${r.slug}#enquiry`} label="Enquire & book" variant="outline" />
                </div>
              </div>
            </article>
          ))}
          <p className="muted reveal" style={{ marginTop: 8 }}>
            Prices are per room per night, room only, as listed in September 2026. They can change, so please confirm when you book.
          </p>
        </div>
      </section>

      <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow>Amenities</Eyebrow>
              <SplitHeading>At the <em className="accent">hotel</em></SplitHeading>
            </div>
          </div>
          <div className="amenities" data-stagger="">
            {hotel.amenities.map((a) => (
              <div className="amenity reveal" key={a.label}><Icon name={a.icon as IconName} /> {a.label}</div>
            ))}
          </div>
        </div>
      </section>

      <section className="section">
        <div className="container split">
          <div className="split__media">
            <div className="reveal-img">
              <Image src={IMG.bathroom} alt="Clean private bathroom with shower" sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
            </div>
          </div>
          <div data-stagger="">
            <Eyebrow>Good to know</Eyebrow>
            <SplitHeading>Before you <em className="accent">arrive</em></SplitHeading>
            <dl className="info reveal">
              {hotel.policies.map((p) => [<dt key={`t-${p.term}`}>{p.term}</dt>, <dd key={`d-${p.term}`}>{p.detail}</dd>])}
            </dl>
            <Button href="/contact#enquiry" label="Send an enquiry" variant="dark" arrow className="reveal" />
          </div>
        </div>
      </section>

      <CtaBand />
    </>
  );
}
