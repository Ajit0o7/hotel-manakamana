import { PagodaMark } from '@/components/brand/PagodaMark';
import { TLink } from '@/components/ui/TLink';
import { HOTEL, NAV } from '@/content/hotel';
import { getGuides, getHotel, getRooms } from '@/lib/cms/site';
import { BackToTop } from './BackToTop';

/* Hand-picked guide links, shown only while the guide exists in the CMS. */
const FOOTER_GUIDES = [
  { slug: 'manthali-to-lukla-flights', label: 'Lukla flight guide' },
  { slug: 'lukla-flight-cancelled', label: 'Flight cancelled?' },
];

export async function Footer() {
  const [hotel, rooms, guides] = await Promise.all([getHotel(), getRooms(), getGuides()]);
  return (
    <footer className="footer">
      <div className="container footer__grid">
        <div>
          <TLink href="/" className="logo">
            <span className="logo__mark"><PagodaMark /></span>
            <span className="logo__text">
              <span className="logo__name">{HOTEL.shortName}</span>
              <span className="logo__tag">{HOTEL.tagline}</span>
            </span>
          </TLink>
          <p>
            A friendly, family-run hotel 500 m from Manthali (Ramechhap) Airport. Air-conditioned rooms with balconies,
            free Wi-Fi, home-cooked Nepali food and <em className="accent">rooftop valley views</em>.
          </p>
        </div>
        <div className="footer__links">
          <h4>Explore</h4>
          {NAV.map((n) => <TLink key={n.href} href={n.href}>{n.label}</TLink>)}
        </div>
        <div className="footer__links">
          <h4>Stay</h4>
          {rooms.map((r) => <TLink key={r.slug} href={`/rooms/${r.slug}`}>{r.name}</TLink>)}
          <TLink href="/dining">Rooftop Restaurant</TLink>
          {FOOTER_GUIDES.filter((l) => guides.some((g) => g.slug === l.slug)).map((l) => (
            <TLink key={l.slug} href={`/guides/${l.slug}`}>{l.label}</TLink>
          ))}
        </div>
        <div>
          <h4>Contact</h4>
          <address>{hotel.address}</address>
          <p style={{ marginTop: 14 }}>
            <a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a>
            <br />
            <a href={hotel.whatsappUrl} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            <br />
            <a href={hotel.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
          </p>
          <p style={{ marginTop: 14 }}>
            <a href={hotel.profiles.facebook} target="_blank" rel="noopener noreferrer">Facebook</a>
            {' · '}
            <a href={hotel.profiles.tripadvisor} target="_blank" rel="noopener noreferrer">Tripadvisor</a>
            {' · '}
            <a href={hotel.profiles.google} target="_blank" rel="noopener noreferrer">Google reviews</a>
          </p>
        </div>
      </div>
      <div className="footer__wordmark" aria-hidden="true">Manakamana</div>
      <div className="container footer__bottom">
        <span>© {new Date().getFullYear()} {HOTEL.name} · Manthali, Ramechhap, Nepal</span>
        <BackToTop />
      </div>
    </footer>
  );
}
