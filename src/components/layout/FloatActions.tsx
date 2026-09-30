import { Icon } from '@/components/ui/Icon';
import { HOTEL, WHATSAPP_URL } from '@/content/hotel';

/** Floating WhatsApp / call buttons (hidden while the home hero fills the screen, see .hero-in-view). */
export function FloatActions() {
  return (
    <div className="float-actions">
      <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer" className="float-wa" aria-label="Chat on WhatsApp" data-tip="WhatsApp">
        <Icon name="wa" />
      </a>
      <a href={`tel:${HOTEL.phoneTel}`} className="float-call" aria-label="Call the hotel" data-tip="Call us">
        <Icon name="phone" />
      </a>
    </div>
  );
}
