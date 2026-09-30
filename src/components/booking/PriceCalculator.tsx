'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { HOTEL, formatNPR, whatsappWith } from '@/content/hotel';
import type { Room } from '@/content/rooms';
import { addDaysISO, formatDateLong, nightsBetween } from '@/lib/dates';
import { useToday } from '@/lib/hooks';

/** Sticky booking card on a room page: dates + rooms → live total, then WhatsApp or the full enquiry form. */
export function PriceCalculator({ room }: { room: Pick<Room, 'slug' | 'name' | 'price' | 'maxGuests'> }) {
  const today = useToday();
  const [pickedIn, setPickedIn] = useState<string | null>(null);
  const [pickedOut, setPickedOut] = useState<string | null>(null);
  const [rooms, setRooms] = useState(1);
  // until the visitor picks dates: tonight → tomorrow
  const checkin = pickedIn ?? today;
  const checkout = pickedOut ?? (checkin ? addDaysISO(checkin, 1) : '');

  const nights = nightsBetween(checkin, checkout);
  const total = nights * rooms * room.price;
  const message = [
    `Namaste! I would like to book the ${room.name}.`,
    nights ? `Dates: ${formatDateLong(checkin)} → ${formatDateLong(checkout)} (${nights} night${nights > 1 ? 's' : ''})` : '',
    `Rooms: ${rooms}`,
    nights ? `Estimate shown on the website: ${formatNPR(total)} (room only)` : '',
  ].filter(Boolean).join('\n');
  const query = new URLSearchParams({ room: room.slug, checkin, checkout, rooms: String(rooms), guests: String(Math.min(rooms * room.maxGuests, 10)) });

  return (
    <div className="calc">
      <p className="calc__price"><strong>{formatNPR(room.price)}</strong> / night <span>· room only</span></p>
      <div className="calc__grid">
        <label className="field">
          Check-in
          <input type="date" min={today || undefined} value={checkin}
            onChange={(e) => {
              setPickedIn(e.target.value);
              if (!checkout || checkout <= e.target.value) setPickedOut(addDaysISO(e.target.value, 1));
            }} />
        </label>
        <label className="field">
          Check-out
          <input type="date" min={checkin ? addDaysISO(checkin, 1) : undefined} value={checkout} onChange={(e) => setPickedOut(e.target.value)} />
        </label>
        <label className="field calc__full">
          Rooms
          <select value={rooms} onChange={(e) => setRooms(parseInt(e.target.value, 10))}>
            {[1, 2, 3, 4, 5].map((n) => <option key={n} value={n}>{n} {n === 1 ? 'Room' : 'Rooms'} · up to {n * room.maxGuests} guests</option>)}
          </select>
        </label>
      </div>
      <div className="calc__total" aria-live="polite">
        <span>{nights ? `${nights} night${nights > 1 ? 's' : ''} × ${rooms} room${rooms > 1 ? 's' : ''}` : 'Choose your dates'}</span>
        <strong>{nights ? formatNPR(total) : '—'}</strong>
      </div>
      <div className="calc__actions">
        <Button href={whatsappWith(message)} label="Enquire on WhatsApp" variant="dark" block icon={<Icon name="wa" />} />
        <Button href={`/contact?${query.toString()}#enquiry`} label="Full booking form" variant="outline" block />
      </div>
      <p className="calc__note">
        Estimate only. Prices can change, so we&apos;ll confirm your rate. Prefer to talk? <a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a>
      </p>
    </div>
  );
}
