import { IMG, type Photo } from './images';

export type GalleryItem = Photo & { cat: 'rooms' | 'food' | 'rooftop' | 'views' | 'hotel' };

export const GALLERY_FILTERS = [
  { key: 'all', label: 'All' },
  { key: 'rooms', label: 'Rooms' },
  { key: 'food', label: 'Food' },
  { key: 'rooftop', label: 'Rooftop' },
  { key: 'views', label: 'Views' },
  { key: 'hotel', label: 'Hotel' },
] as const;

export const GALLERY: GalleryItem[] = [
  { src: IMG.heroValleyView, alt: 'Valley view from the terrace', cat: 'views' },
  { src: IMG.fbHotelExterior, alt: 'Hotel lit up at night', cat: 'hotel' },
  { src: IMG.fbAirportRunway, alt: 'Airport runway at night', cat: 'views' },
  { src: IMG.ebnRooftopTerrace, alt: 'Rooftop terrace by day', cat: 'rooftop' },
  { src: IMG.ebnRoomSofa, alt: 'Deluxe Double Room', cat: 'rooms' },
  { src: IMG.exterior, alt: 'Hotel building', cat: 'hotel' },
  { src: IMG.roomDeluxe, alt: 'Room with sofa seating', cat: 'rooms' },
  { src: IMG.foodThali, alt: 'Nepali thali', cat: 'food' },
  { src: IMG.rooftopDining, alt: 'Rooftop dining', cat: 'rooftop' },
  { src: IMG.fbRoomTwoBeds, alt: 'Room with two beds', cat: 'rooms' },
  { src: IMG.ebnRoomLeaf, alt: 'Double Room', cat: 'rooms' },
  { src: IMG.fbRooftopDining, alt: 'Dinner on the rooftop', cat: 'rooftop' },
  { src: IMG.roomStandard, alt: 'Room with peacock mural', cat: 'rooms' },
  { src: IMG.ebnRoomMural, alt: 'Room with mountain mural', cat: 'rooms' },
  { src: IMG.viewManthaliTown, alt: 'Manthali town', cat: 'views' },
  { src: IMG.foodDalBhat, alt: 'Dal bhat', cat: 'food' },
  { src: IMG.bathroom, alt: 'Private bathroom', cat: 'rooms' },
  { src: IMG.ebnRoomTeal, alt: 'Air-conditioned room', cat: 'rooms' },
  { src: IMG.ebnExteriorDay, alt: 'Hotel by day', cat: 'hotel' },
  { src: IMG.rooftopEvening, alt: 'Evening on the rooftop', cat: 'rooftop' },
  { src: IMG.foodBreakfast, alt: 'Breakfast', cat: 'food' },
  { src: IMG.fbRoomDoubleSingle, alt: 'Room interior', cat: 'rooms' },
  { src: IMG.ebnRoomBath, alt: 'Room with private bathroom', cat: 'rooms' },
  { src: IMG.fbRooftopTerrace, alt: 'Rooftop at night', cat: 'rooftop' },
  { src: IMG.viewValleyClouds, alt: 'Clouds over the valley', cat: 'views' },
  { src: IMG.foodSandwich, alt: 'Sandwich & fries', cat: 'food' },
];
