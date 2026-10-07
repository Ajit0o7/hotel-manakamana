import type { Metadata } from 'next';
import Image from 'next/image';
import { notFound } from 'next/navigation';
import { PriceCalculator } from '@/components/booking/PriceCalculator';
import { PhotoGrid } from '@/components/gallery/PhotoGrid';
import { CtaBand } from '@/components/sections/CtaBand';
import { PageHero } from '@/components/sections/PageHero';
import { JsonLd } from '@/components/seo/JsonLd';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { TLink } from '@/components/ui/TLink';
import { formatNPR } from '@/content/hotel';
import { roomLd } from '@/content/schema';
import { getHotel, getRoom, getRooms, headMetadata } from '@/lib/cms/site';

export async function generateStaticParams() {
  return (await getRooms()).map((r) => ({ slug: r.slug }));
}

export async function generateMetadata({ params }: PageProps<'/rooms/[slug]'>): Promise<Metadata> {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) return {};
  if (room.head) return headMetadata(room.head, `/rooms/${room.slug}`);
  return {
    title: `${room.name} · ${formatNPR(room.price)} a night`,
    description: `${room.summary} Room only, ${formatNPR(room.price)} per night, 500 m from Manthali (Ramechhap) Airport.`,
    alternates: { canonical: `/rooms/${room.slug}` },
  };
}

export default async function RoomPage({ params }: PageProps<'/rooms/[slug]'>) {
  const { slug } = await params;
  const room = await getRoom(slug);
  if (!room) notFound();
  const [hotel, rooms] = await Promise.all([getHotel(), getRooms()]);
  const other = rooms.find((r) => r.slug !== room.slug);

  return (
    <>
      <JsonLd data={roomLd(room)} />
      <PageHero
        photo={room.image}
        eyebrow={room.tag}
        title={<>{room.name.replace(/ Room$/, '')} <em className="accent">Room</em></>}
        text={`${formatNPR(room.price)} a night, room only · up to ${room.maxGuests} guests · ${room.beds}`}
        crumbs={[{ href: '/rooms', label: 'Rooms' }, { label: room.name }]}
      />

      <section className="section">
        <div className="container room-page">
          <div className="room-copy">
            <PhotoGrid variant="room" items={room.photos} />
            <p className="photo-note">Photos show our rooms; furnishings vary slightly from room to room.</p>

            <Eyebrow num={room.num}>The room</Eyebrow>
            <SplitHeading>Rest well before <em className="accent">your flight</em></SplitHeading>
            <p className="lead reveal">{room.description}</p>
            <ul className="pill-list reveal">{room.features.map((f) => <li key={f}>{f}</li>)}</ul>

            <dl className="room-details reveal">
              <dt>Price</dt><dd>{formatNPR(room.price)} per room per night · room only</dd>
              <dt>Guests</dt><dd>Up to {room.maxGuests}</dd>
              <dt>Bed</dt><dd>{room.beds}</dd>
              <dt>Bathroom</dt><dd>Private, with hot shower</dd>
              <dt>Location</dt><dd>500 m from Manthali Airport · 300 m from the bus park</dd>
            </dl>

            <Eyebrow>Good to know</Eyebrow>
            <dl className="info reveal">
              {hotel.policies.map((p) => [<dt key={`t-${p.term}`}>{p.term}</dt>, <dd key={`d-${p.term}`}>{p.detail}</dd>])}
            </dl>
          </div>

          <aside className="room-aside reveal" aria-label={`Book the ${room.name}`}>
            <PriceCalculator room={{ slug: room.slug, name: room.name, price: room.price, maxGuests: room.maxGuests }} />
          </aside>
        </div>
      </section>

      {other && <section className="section section--sand">
        <div className="container">
          <div className="section__head">
            <div>
              <Eyebrow>Also available</Eyebrow>
              <SplitHeading>The <em className="accent">{other.name}</em></SplitHeading>
            </div>
            <TLink href="/rooms" className="link reveal">Compare all rooms →</TLink>
          </div>
          <article className="card card--row reveal">
            <TLink href={`/rooms/${other.slug}`} className="card__media" aria-label={`${other.name} details`}>
              <Image src={other.image.src} alt={other.image.alt} fill sizes="(max-width: 680px) 100vw, 560px" placeholder="blur" />
              <span className="tag">{other.tag}</span>
            </TLink>
            <div className="card__body">
              <h3>{other.name}</h3>
              <p>{other.summary}</p>
              <div className="card__foot">
                <span className="price">From <strong>{formatNPR(other.price)}</strong> / night</span>
                <TLink href={`/rooms/${other.slug}`} className="link">View room <Icon name="arrowRight" className="link__icon" /></TLink>
              </div>
            </div>
          </article>
        </div>
      </section>}

      <CtaBand />
    </>
  );
}
