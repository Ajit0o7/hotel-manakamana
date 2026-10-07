import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { AIRLINES } from '@/content/airlines';
import type { Hotel } from '@/lib/cms/site';

/** The airlines flying Manthali to Lukla, with phone numbers and websites. */
export function AirlinesTable() {
  return (
    <table className="guide-airlines">
      <caption className="visually-hidden">Airlines flying Manthali (Ramechhap) to Lukla</caption>
      <thead>
        <tr><th scope="col">Airline</th><th scope="col">Aircraft</th><th scope="col">Phone</th><th scope="col">Website</th></tr>
      </thead>
      <tbody>
        {AIRLINES.map((a) => (
          <tr key={a.name}>
            <td>{a.name}</td>
            <td>{a.aircraft}</td>
            <td><a href={`tel:${a.phoneTel}`}>{a.phoneDisplay}</a></td>
            <td><a href={a.url} target="_blank" rel="noopener noreferrer">{a.site}</a></td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

/** A booking box: check availability, call or WhatsApp the hotel. */
export function GuideCta({ title, text, hotel }: { title: string; text: string; hotel: Pick<Hotel, 'phoneTel' | 'whatsappUrl'> }) {
  return (
    <aside className="guide-cta">
      <h3>{title}</h3>
      {text && <p>{text}</p>}
      <div className="hero__ctas">
        <Button href="/contact#enquiry" label="Check availability" variant="gold" arrow />
        <Button href={`tel:${hotel.phoneTel}`} label="Call us" variant="light" icon={<Icon name="phone" />} />
        <Button href={hotel.whatsappUrl} label="WhatsApp" variant="light" />
      </div>
    </aside>
  );
}
