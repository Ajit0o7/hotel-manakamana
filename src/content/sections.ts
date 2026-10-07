/* The building blocks of the website's pages. A page is a list of sections, edited in the CMS (Pages → Sections);
   each section has a layout and that layout's content. The layouts mirror cms/internal/content/sections.go.

   Text conventions (see src/components/sections/text.tsx):
   - headings: *stars* around words make them gold italics, a new line is a line break;
   - texts: a blank line starts a new paragraph, **bold** and [link text](/page) work;
   - {placeholders} such as {phone} or {price_from} show the current value from Hotel settings and Rooms. */
import type { GalleryItem } from './gallery';
import type { Photo } from './images';

export type ButtonStyle = 'gold' | 'dark' | 'light' | 'outline';
export type ButtonIcon = 'arrow' | 'phone' | 'pin' | 'wa';
export type SectionButton = { label?: string; link?: string; style?: ButtonStyle; icon?: ButtonIcon };
export type Background = 'light' | 'sand' | 'pine';
export type Card = { icon?: string; title?: string; text?: string };

type Head = { eyebrow?: string; number?: string; heading?: string };

export type Section =
  | { layout: 'hero_slideshow'; eyebrow?: string; heading?: string; text?: string; buttons?: SectionButton[]; show_rating?: boolean;
      slides?: { photo?: Photo; caption?: string; tall?: boolean }[] }
  | { layout: 'page_hero'; photo?: Photo; eyebrow?: string; heading?: string; text?: string; crumb?: string }
  | { layout: 'booking_bar' }
  | { layout: 'facts'; items?: { value?: string; suffix?: string; label?: string }[] }
  | { layout: 'marquee'; words?: string[] }
  | (Head & {
      layout: 'split'; background?: Background; media?: 'photo' | 'map'; photo?: Photo; photo_side?: 'left' | 'right';
      badge_value?: string; badge_text?: string; lead?: string; text?: string; details?: { term?: string; detail?: string }[];
      show_policies?: boolean; checks?: string[]; show_weather?: boolean; note?: string; buttons?: SectionButton[]; anchor?: string;
    })
  | (Head & { layout: 'features'; background?: Background; items?: Card[]; anchor?: string })
  | (Head & { layout: 'stay_story'; text?: string; steps?: { step?: string; title?: string; text?: string; photo?: Photo }[] })
  | (Head & { layout: 'rooms_preview'; text?: string; link_label?: string })
  | { layout: 'rooms_list'; note?: string }
  | (Head & { layout: 'banner'; photo?: Photo; text?: string; buttons?: SectionButton[]; show_weather?: boolean; anchor?: string })
  | { layout: 'flight_board'; note?: string; tips?: Card[]; guides_eyebrow?: string; guides_heading?: string }
  | { layout: 'review' }
  | (Head & { layout: 'photo_mosaic'; background?: Background; link_label?: string; link?: string; photos?: Photo[] })
  | (Head & { layout: 'amenities'; background?: Background })
  | (Head & { layout: 'menu_cards'; background?: Background; items?: { photo?: Photo; tag?: string; title?: string; text?: string }[] })
  | { layout: 'gallery'; photos?: { photo?: Photo; category?: GalleryItem['cat']; caption?: string }[] }
  | { layout: 'guides_grid' }
  | { layout: 'enquiry'; form_heading?: string; form_text?: string; side_eyebrow?: string; side_heading?: string; rooms_text?: string; anchor?: string }
  | (Head & { layout: 'faq'; background?: Background })
  | (Head & { layout: 'area_map'; background?: Background; text?: string; anchor?: string })
  | (Head & { layout: 'routes'; background?: Background; items?: { time?: string; title?: string; text?: string }[]; anchor?: string })
  | (Head & { layout: 'nearby'; background?: Background; note?: string })
  | (Head & { layout: 'text'; background?: Background; content?: string; anchor?: string })
  | { layout: 'cta_band'; eyebrow?: string; heading?: string; text?: string };

export type Layout = Section['layout'];
