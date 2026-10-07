import { Icon } from '@/components/ui/Icon';
import { getHotel } from '@/lib/cms/site';

/** Floating WhatsApp / call buttons (hidden while the home hero fills the screen, see .hero-in-view). */
export async function FloatActions() {
  const hotel = await getHotel();
  return (
    <div className="float-actions">
      <a href={hotel.whatsappUrl} target="_blank" rel="noopener noreferrer" className="float-wa" aria-label="Chat on WhatsApp" data-tip="WhatsApp">
        <Icon name="wa" />
      </a>
      <a href={`tel:${hotel.phoneTel}`} className="float-call" aria-label="Call the hotel" data-tip="Call us">
        <Icon name="phone" />
      </a>
    </div>
  );
}
