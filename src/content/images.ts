/* Static imports give next/image the real size and an automatic blur placeholder. */
import bathroom from '@/assets/images/bathroom.jpg';
import bpHighwayBeniGhat from '@/assets/images/bp-highway-beni-ghat.jpg';
import bpHighwayMulkot from '@/assets/images/bp-highway-mulkot.jpg';
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
import luklaAirportCloud from '@/assets/images/lukla-airport-cloud.jpg';
import luklaAirportTakeoff from '@/assets/images/lukla-airport-takeoff.jpg';
import ramechhapAirportAerial from '@/assets/images/ramechhap-airport-aerial.jpg';
import ramechhapAirportTaraAir from '@/assets/images/ramechhap-airport-tara-air.jpg';
import ramechhapAirportTerminal from '@/assets/images/ramechhap-airport-terminal.jpg';
import rooftopDining from '@/assets/images/rooftop-dining.jpg';
import rooftopEvening from '@/assets/images/rooftop-evening.jpg';
import roomDeluxe from '@/assets/images/room-deluxe.jpg';
import roomStandard from '@/assets/images/room-standard.jpg';
import summitAirLet410 from '@/assets/images/summit-air-let-410.jpg';
import viewManthaliTown from '@/assets/images/view-manthali-town.jpg';
import viewValleyClouds from '@/assets/images/view-valley-clouds.jpg';

export const IMG = {
  bathroom, bpHighwayBeniGhat, bpHighwayMulkot, ebnExteriorDay, ebnRooftopTerrace, ebnRoomBath, ebnRoomLeaf,
  ebnRoomMural, ebnRoomSofa, ebnRoomTeal, exterior, fbAirportRunway, fbHotelExterior, fbRooftopDining,
  fbRooftopTerrace, fbRoomDoubleSingle, fbRoomTwoBeds, foodBreakfast, foodDalBhat, foodSandwich, foodThali,
  heroValleyView, luklaAirportCloud, luklaAirportTakeoff, ramechhapAirportAerial, ramechhapAirportTaraAir,
  ramechhapAirportTerminal, rooftopDining, rooftopEvening, roomDeluxe, roomStandard, summitAirLet410,
  viewManthaliTown, viewValleyClouds,
};

export type Photo = { src: (typeof IMG)[keyof typeof IMG]; alt: string };
