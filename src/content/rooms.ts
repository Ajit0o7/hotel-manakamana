import type { CmsHead } from '@/lib/cms/site';
import { IMG, type Photo } from './images';

export type Room = {
  slug: string;
  anchor: string;
  num: string;
  name: string;
  tag: string;
  price: number; // NPR per night, room only (eBooking Nepal listing, Sep 2026)
  maxGuests: number;
  beds: string;
  image: Photo;
  summary: string;
  description: string;
  features: string[];
  photos: Photo[]; // representative photos of our rooms
  head?: CmsHead; // SEO settings from the CMS, when the room comes from there
};

export const ROOMS: Room[] = [
  {
    slug: 'deluxe-double-room',
    anchor: 'deluxe',
    num: '01',
    name: 'Deluxe Double Room',
    tag: 'Deluxe',
    price: 2500,
    maxGuests: 2,
    beds: '1 double bed',
    image: { src: IMG.ebnRoomSofa, alt: 'Deluxe Double Room at Hotel Manakamana Airport View, Manthali, with a double bed and sofa' },
    summary: 'Double bed, seating space, air conditioning, flat-screen TV and a private balcony. Sleeps 2.',
    description:
      'Our best room, with a comfortable double bed and its own seating area for relaxing after a long drive. It has air conditioning, a flat-screen TV, a private balcony and a private bathroom with hot shower. There is even a socket by the bed for charging up before an early flight.',
    features: ['Air conditioning', 'Flat-screen TV', 'Balcony', 'Socket near the bed', 'Seating space', 'In-room slippers', 'Free Wi-Fi'],
    photos: [
      { src: IMG.ebnRoomSofa, alt: 'Deluxe Double Room with sofa seating' },
      { src: IMG.roomDeluxe, alt: 'Room with double bed and armchair' },
      { src: IMG.ebnRoomBath, alt: 'Room with attached private bathroom' },
      { src: IMG.fbRoomTwoBeds, alt: 'Spacious room with seating area' },
      { src: IMG.bathroom, alt: 'Private bathroom with shower' },
    ],
  },
  {
    slug: 'double-room',
    anchor: 'double',
    num: '02',
    name: 'Double Room',
    tag: 'Best value',
    price: 2000,
    maxGuests: 2,
    beds: '1 double bed',
    image: { src: IMG.ebnRoomLeaf, alt: 'Double Room at Hotel Manakamana Airport View, Manthali, with a double bed and armchair' },
    summary: 'A comfortable double bed, air conditioning, flat-screen TV, seating space and balcony. Sleeps 2.',
    description:
      'Everything you need for a good night before an early flight: a comfortable double bed, air conditioning, a flat-screen TV, a seating space and your own balcony, plus a private bathroom with hot shower.',
    features: ['Air conditioning', 'Flat-screen TV', 'Balcony', 'Seating space', 'In-room slippers', 'Free Wi-Fi'],
    photos: [
      { src: IMG.ebnRoomLeaf, alt: 'Double Room with armchair' },
      { src: IMG.ebnRoomTeal, alt: 'Air-conditioned room with patterned wallpaper' },
      { src: IMG.roomStandard, alt: 'Room with hand-painted peacock mural' },
      { src: IMG.ebnRoomMural, alt: 'Room with Himalayan mountain mural and wall TV' },
      { src: IMG.bathroom, alt: 'Private bathroom with shower' },
    ],
  },
];

export const getRoom = (slug: string) => ROOMS.find((r) => r.slug === slug);
