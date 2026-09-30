/* Static imports give next/image the real size and an automatic blur placeholder. */
import bathroom from '@/assets/images/bathroom.jpg';
import ebnExteriorDay from '@/assets/images/ebn-exterior-day.jpg';
import ebnRooftopTerrace from '@/assets/images/ebn-rooftop-terrace.jpg';
import ebnRoomBath from '@/assets/images/ebn-room-bath.jpg';
import ebnRoomLeaf from '@/assets/images/ebn-room-leaf.jpg';
import ebnRoomMural from '@/assets/images/ebn-room-mural.jpg';
import ebnRoomSofa from '@/assets/images/ebn-room-sofa.jpg';
import ebnRoomTeal from '@/assets/images/ebn-room-teal.jpg';
import exterior from '@/assets/images/exterior.jpg';
import fbAirportRunway from '@/assets/images/fb-airport-runway.jpg';
import fbHotelExterior from '@/assets/images/fb-hotel-exterior.jpg';
import fbRooftopDining from '@/assets/images/fb-rooftop-dining.jpg';
import fbRooftopTerrace from '@/assets/images/fb-rooftop-terrace.jpg';
import fbRoomDoubleSingle from '@/assets/images/fb-room-double-single.jpg';
import fbRoomTwoBeds from '@/assets/images/fb-room-two-beds.jpg';
import foodBreakfast from '@/assets/images/food-breakfast.jpg';
import foodDalBhat from '@/assets/images/food-dal-bhat.jpg';
import foodSandwich from '@/assets/images/food-sandwich.jpg';
import foodThali from '@/assets/images/food-thali.jpg';
import heroValleyView from '@/assets/images/hero-valley-view.jpg';
import rooftopDining from '@/assets/images/rooftop-dining.jpg';
import rooftopEvening from '@/assets/images/rooftop-evening.jpg';
import roomDeluxe from '@/assets/images/room-deluxe.jpg';
import roomStandard from '@/assets/images/room-standard.jpg';
import viewManthaliTown from '@/assets/images/view-manthali-town.jpg';
import viewValleyClouds from '@/assets/images/view-valley-clouds.jpg';

export const IMG = {
  bathroom, ebnExteriorDay, ebnRooftopTerrace, ebnRoomBath, ebnRoomLeaf, ebnRoomMural, ebnRoomSofa, ebnRoomTeal,
  exterior, fbAirportRunway, fbHotelExterior, fbRooftopDining, fbRooftopTerrace, fbRoomDoubleSingle, fbRoomTwoBeds,
  foodBreakfast, foodDalBhat, foodSandwich, foodThali, heroValleyView, rooftopDining, rooftopEvening, roomDeluxe,
  roomStandard, viewManthaliTown, viewValleyClouds,
};

export type Photo = { src: (typeof IMG)[keyof typeof IMG]; alt: string };
