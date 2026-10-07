import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { formatNPR } from '@/content/hotel';
import { getHotel, getPriceFrom } from '@/lib/cms/site';

export async function CtaBand() {
  const [hotel, priceFrom] = await Promise.all([getHotel(), getPriceFrom()]);
  return (
    <section className="cta-band">
      <div className="container">
        <div>
          <Eyebrow>Reservations</Eyebrow>
          <SplitHeading>Ready to rest before <em className="accent">your flight?</em></SplitHeading>
          <p className="reveal">Rooms from {formatNPR(priceFrom)} a night. Call or WhatsApp us to check availability.</p>
        </div>
        <div className="hero__ctas reveal">
          <Button href={`tel:${hotel.phoneTel}`} label="Call us" variant="gold" icon={<Icon name="phone" />} magnetic />
          <Button href={hotel.whatsappUrl} label="WhatsApp" variant="light" magnetic />
        </div>
      </div>
    </section>
  );
}
