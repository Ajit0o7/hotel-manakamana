import { Emblem } from '@/components/brand/Emblem';
import { Button } from '@/components/ui/Button';

export const metadata = { title: 'Page not found' };

export default function NotFound() {
  return (
    <section className="notfound">
      <div>
        <Emblem idPrefix="notfound" />
        <p className="eyebrow" style={{ justifyContent: 'center', color: 'var(--gold-light)' }}>Error 404</p>
        <h1>This page has <em className="accent">flown</em></h1>
        <p>We couldn&apos;t find that page. It may have moved, or the link may be old.</p>
        <div className="hero__ctas">
          <Button href="/" label="Back to home" variant="gold" arrow />
          <Button href="/rooms" label="See our rooms" variant="light" />
        </div>
      </div>
    </section>
  );
}
