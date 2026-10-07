'use client';

import { useSearchParams } from 'next/navigation';
import { useMemo, useState, type FormEvent } from 'react';
import { ActionButton } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { useSiteData } from '@/components/layout/SiteData';
import { formatNPR } from '@/content/hotel';
import { whatsappLink } from '@/lib/cms/site';
import { addDaysISO, formatDateLong, nightsBetween } from '@/lib/dates';
import { useToday } from '@/lib/hooks';

type Errors = Partial<Record<'name' | 'phone' | 'checkout', string>>;

/** Booking enquiry → WhatsApp message, with a live nights × rooms × price estimate.
 *  Dates, guests and room can arrive in the URL (?checkin=…&checkout=…&guests=…&room=slug). */
export function EnquiryForm() {
  const { hotel, rooms: ROOMS } = useSiteData();
  const params = useSearchParams();
  const today = useToday();
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  // null = not edited yet: fall back to the link's values (?checkin=…&room=…), then to sensible defaults
  const [pickedIn, setPickedIn] = useState<string | null>(null);
  const [pickedOut, setPickedOut] = useState<string | null>(null);
  const [pickedGuests, setGuests] = useState<string | null>(null);
  const [pickedRooms, setRooms] = useState<string | null>(null);
  const [pickedRoom, setRoom] = useState<string | null>(null);
  const [message, setMessage] = useState('');
  const [errors, setErrors] = useState<Errors>({});
  const [sent, setSent] = useState(false);

  const paramRoom = params.get('room');
  const checkin = pickedIn ?? (params.get('checkin') || today);
  const checkout = pickedOut ?? (params.get('checkout') || (checkin ? addDaysISO(checkin, 1) : ''));
  const guests = pickedGuests ?? (params.get('guests') || '2');
  const rooms = pickedRooms ?? (params.get('rooms') || '1');
  const room = pickedRoom ?? (paramRoom && ROOMS.some((x) => x.slug === paramRoom) ? paramRoom : 'any');

  const nights = nightsBetween(checkin, checkout);
  const roomCount = Math.max(1, parseInt(rooms, 10) || 1);
  const guestCount = parseInt(guests, 10) || 1;
  const selected = ROOMS.find((r) => r.slug === room);

  const estimate = useMemo(() => {
    if (!nights) return null;
    if (selected) return { text: formatNPR(selected.price * nights * roomCount), detail: `${nights} night${nights > 1 ? 's' : ''} × ${roomCount} room${roomCount > 1 ? 's' : ''} × ${formatNPR(selected.price)}` };
    const lo = Math.min(...ROOMS.map((r) => r.price)) * nights * roomCount;
    const hi = Math.max(...ROOMS.map((r) => r.price)) * nights * roomCount;
    return { text: `${formatNPR(lo)} – ${formatNPR(hi)}`, detail: `${nights} night${nights > 1 ? 's' : ''} × ${roomCount} room${roomCount > 1 ? 's' : ''}, depending on the room` };
  }, [nights, roomCount, selected, ROOMS]);

  const tooMany = guestCount > roomCount * 2;

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const next: Errors = {};
    if (!name.trim()) next.name = 'Please add your name';
    if (phone.replace(/\D/g, '').length < 7) next.phone = 'Please add a phone number we can reach';
    if (!nights) next.checkout = 'Check-out must be after check-in';
    setErrors(next);
    if (Object.keys(next).length) return;
    const lines = [
      'Namaste! I would like to book a room.',
      `Name: ${name.trim()}`,
      `Phone: ${phone.trim()}`,
      `Check-in: ${formatDateLong(checkin)}`,
      `Check-out: ${formatDateLong(checkout)} (${nights} night${nights > 1 ? 's' : ''})`,
      `Guests: ${guestCount} · Rooms: ${roomCount}`,
      `Room: ${selected ? selected.name : 'Any room'}`,
      estimate ? `Estimate shown on the website: ${estimate.text} (room only)` : '',
      message.trim() ? `Note: ${message.trim()}` : '',
    ].filter(Boolean);
    window.open(whatsappLink(hotel, lines.join('\n')), '_blank', 'noopener');
    setSent(true);
  };

  const field = (key: keyof Errors) => ({ className: `field${errors[key] ? ' is-invalid' : ''}` });

  return (
    <form className="form-grid" onSubmit={submit} noValidate>
      <label {...field('name')}>
        Full name
        <input type="text" name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} aria-invalid={!!errors.name} />
        {errors.name && <span className="field-error">{errors.name}</span>}
      </label>
      <label {...field('phone')}>
        Phone
        <input type="tel" name="phone" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} aria-invalid={!!errors.phone} />
        {errors.phone && <span className="field-error">{errors.phone}</span>}
      </label>
      <label className="field">
        Check-in
        <input type="date" name="checkin" min={today || undefined} value={checkin}
          onChange={(e) => {
            setPickedIn(e.target.value);
            if (!checkout || checkout <= e.target.value) setPickedOut(addDaysISO(e.target.value, 1));
          }} />
      </label>
      <label {...field('checkout')}>
        Check-out
        <input type="date" name="checkout" min={checkin ? addDaysISO(checkin, 1) : undefined} value={checkout} onChange={(e) => setPickedOut(e.target.value)} aria-invalid={!!errors.checkout} />
        {errors.checkout && <span className="field-error">{errors.checkout}</span>}
      </label>
      <label className="field">
        Guests
        <select name="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
          {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>)}
        </select>
      </label>
      <label className="field">
        Rooms
        <select name="rooms" value={rooms} onChange={(e) => setRooms(e.target.value)}>
          {Array.from({ length: 6 }, (_, i) => i + 1).map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Room' : 'Rooms'}</option>)}
        </select>
      </label>
      <label className="field full">
        Room type
        <select name="room" value={room} onChange={(e) => setRoom(e.target.value)}>
          <option value="any">Any room</option>
          {ROOMS.map((r) => <option key={r.slug} value={r.slug}>{r.name} · {formatNPR(r.price)} / night</option>)}
        </select>
      </label>
      {tooMany && <p className="form-hint full">Each room sleeps up to 2 guests, so {guestCount} guests need {Math.ceil(guestCount / 2)} rooms.</p>}
      <div className="estimate full" aria-live="polite">
        <span>
          <span className="estimate__label">Estimated total · room only</span>
          <span className="estimate__detail">{estimate ? estimate.detail : 'Choose your dates to see an estimate'}</span>
        </span>
        <strong>{estimate ? estimate.text : '—'}</strong>
      </div>
      <label className="field full">
        Message
        <textarea name="message" placeholder="Flight time, special requests, group size…" value={message} onChange={(e) => setMessage(e.target.value)} />
      </label>
      <ActionButton type="submit" label="Send via WhatsApp" variant="dark" block icon={<Icon name="wa" />} className="full" />
      {sent && (
        <p className="form-status full" role="status">
          <Icon name="check" /> WhatsApp opened with your message. If it didn&apos;t, call us on{' '}
          <a href={`tel:${hotel.phoneTel}`}>{hotel.phoneDisplay}</a>.
        </p>
      )}
    </form>
  );
}
