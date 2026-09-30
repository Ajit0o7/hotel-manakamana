'use client';

import { useState, type CSSProperties, type FormEvent } from 'react';
import { ActionButton } from '@/components/ui/Button';
import { useCurtain } from '@/components/layout/CurtainProvider';
import { addDaysISO } from '@/lib/dates';
import { useToday } from '@/lib/hooks';
import { useRouter } from 'next/navigation';

/** Check-in / check-out / guests → carries the dates over to the booking enquiry on /contact. */
export function BookingBar() {
  const { navigate } = useCurtain();
  const router = useRouter();
  const today = useToday(); // visitor's clock; '' until hydrated
  const [pickedIn, setPickedIn] = useState<string | null>(null);
  const [pickedOut, setPickedOut] = useState<string | null>(null);
  const [guests, setGuests] = useState('2');
  const checkin = pickedIn ?? today;
  const checkout = pickedOut ?? (checkin ? addDaysISO(checkin, 1) : '');

  const minOut = checkin ? addDaysISO(checkin, 1) : undefined;
  const onCheckin = (v: string) => {
    setPickedIn(v);
    if (!checkout || checkout <= v) setPickedOut(addDaysISO(v, 1));
  };

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const href = `/contact?${new URLSearchParams({ checkin, checkout, guests }).toString()}#enquiry`;
    if (!navigate(href)) router.push(href);
  };

  return (
    <div className="container booking" data-hero="" style={{ '--h': 7 } as CSSProperties}>
      <form className="booking__form" onSubmit={submit}>
        <label className="field">
          Check-in
          <input type="date" name="checkin" required min={today || undefined} value={checkin} onChange={(e) => onCheckin(e.target.value)} />
        </label>
        <label className="field">
          Check-out
          <input type="date" name="checkout" required min={minOut} value={checkout} onChange={(e) => setPickedOut(e.target.value)} />
        </label>
        <label className="field">
          Guests
          <select name="guests" value={guests} onChange={(e) => setGuests(e.target.value)}>
            {Array.from({ length: 8 }, (_, i) => i + 1).map((n) => (
              <option key={n} value={n}>{n} {n === 1 ? 'Guest' : 'Guests'}</option>
            ))}
          </select>
        </label>
        <ActionButton type="submit" label="Check availability" variant="dark" arrow />
      </form>
    </div>
  );
}
