import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { HOTEL, WHATSAPP_URL } from '@/content/hotel';

export function CtaBand() {
  return (
    <section className="cta-band">
      <div className="container">
        <div>
          <Eyebrow>Reservations</Eyebrow>
          <SplitHeading>Ready to rest before <em className="accent">your flight?</em></SplitHeading>
          <p className="reveal">Rooms from NPR 2,000 a night. Call or WhatsApp us to check availability.</p>
        </div>
        <div className="hero__ctas reveal">
          <Button href={`tel:${HOTEL.phoneTel}`} label="Call us" variant="gold" icon={<Icon name="phone" />} magnetic />
          <Button href={WHATSAPP_URL} label="WhatsApp" variant="light" magnetic />
        </div>
      </div>
    </section>
  );
}
