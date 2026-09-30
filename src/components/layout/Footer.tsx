import { PagodaMark } from '@/components/brand/PagodaMark';
import { TLink } from '@/components/ui/TLink';
import { HOTEL, NAV, WHATSAPP_URL } from '@/content/hotel';
import { ROOMS } from '@/content/rooms';
import { BackToTop } from './BackToTop';

export function Footer() {
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
          {ROOMS.map((r) => <TLink key={r.slug} href={`/rooms/${r.slug}`}>{r.name}</TLink>)}
          <TLink href="/dining">Rooftop Restaurant</TLink>
          <TLink href="/guides/manthali-to-lukla-flights">Lukla flight guide</TLink>
          <TLink href="/guides/lukla-flight-cancelled">Flight cancelled?</TLink>
        </div>
        <div>
          <h4>Contact</h4>
          <address>{HOTEL.address}</address>
          <p style={{ marginTop: 14 }}>
            <a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a>
            <br />
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
            <br />
            <a href={HOTEL.mapsUrl} target="_blank" rel="noopener noreferrer">Open in Google Maps</a>
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
