import { Emblem } from '@/components/brand/Emblem';
import { Button } from '@/components/ui/Button';

/* The body of the 404 page. app/not-found.tsx (unknown URLs) wraps it in the site chrome itself;
   app/(site)/not-found.tsx (notFound() inside a public page) is already inside the (site) layout. */
export function NotFoundContent() {
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
