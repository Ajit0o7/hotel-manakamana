import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { getHotel, getPriceFrom, placeholders } from '@/lib/cms/site';
import { fillPlaceholders, heading, Inline } from './text';

/** The green "Call us / WhatsApp" band at the bottom of pages. Texts can be set per page in the CMS. */
export async function CtaBand({
  eyebrow = 'Reservations',
  heading: title = 'Ready to rest before *your flight?*',
  text = 'Rooms from {price_from} a night. Call or WhatsApp us to check availability.',
}: { eyebrow?: string; heading?: string; text?: string }) {
  const [hotel, priceFrom] = await Promise.all([getHotel(), getPriceFrom()]);
  const t = fillPlaceholders({ eyebrow, title, text }, placeholders(hotel, priceFrom));
  return (
    <section className="cta-band">
      <div className="container">
        <div>
          {t.eyebrow && <Eyebrow>{t.eyebrow}</Eyebrow>}
          {t.title && <SplitHeading>{heading(t.title)}</SplitHeading>}
          {t.text && <p className="reveal"><Inline text={t.text} /></p>}
        </div>
        <div className="hero__ctas reveal">
          <Button href={`tel:${hotel.phoneTel}`} label="Call us" variant="gold" icon={<Icon name="phone" />} magnetic />
          <Button href={hotel.whatsappUrl} label="WhatsApp" variant="light" magnetic />
        </div>
      </div>
    </section>
  );
}
