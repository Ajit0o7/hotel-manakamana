import type { CSSProperties } from 'react';
import { Button } from '@/components/ui/Button';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { Icon, type IconName } from '@/components/ui/Icon';
import { SplitHeading } from '@/components/ui/SplitHeading';
import type { Guide } from '@/content/guides';
import type { Photo } from '@/content/images';
import type { Room } from '@/content/rooms';
import type { Background, SectionButton } from '@/content/sections';
import type { Hotel } from '@/lib/cms/site';
import { heading } from '../text';

/** What sections need besides their own content. */
export type SectionContext = { hotel: Hotel; rooms: Room[]; guides: Guide[]; pageTitle: string };

export const isPhoto = (p: unknown): p is Photo => !!p && typeof p === 'object' && 'src' in p && 'alt' in p;

/** "section", plus the background class. */
export const sectionClass = (bg?: Background, extra = '') =>
  ['section', bg === 'sand' && 'section--sand', bg === 'pine' && 'section--pine', extra].filter(Boolean).join(' ');

/** Small label + heading, as at the top of most sections. */
export function Head({ eyebrow, number, text }: { eyebrow?: string; number?: string; text?: string }) {
  return (
    <>
      {eyebrow && <Eyebrow num={number || undefined}>{eyebrow}</Eyebrow>}
      {text && <SplitHeading>{heading(text)}</SplitHeading>}
    </>
  );
}

function SectionButtonLink({ b, magnetic, className }: { b: SectionButton; magnetic?: boolean; className?: string }) {
  if (!b.label || !b.link) return null;
  const icon = b.icon && b.icon !== 'arrow' ? <Icon name={b.icon as IconName} /> : undefined;
  return <Button href={b.link} label={b.label} variant={b.style ?? 'dark'} arrow={b.icon === 'arrow'} icon={icon} magnetic={magnetic} className={className} />;
}

/** Buttons in a row. `alone` renders a single button without the row (as in text columns); `hero` is the
    position in a hero's intro sequence. */
export function Buttons({ buttons, magnetic, rowClass = 'hero__ctas reveal', rowStyle, alone, hero }: {
  buttons?: SectionButton[]; magnetic?: boolean; rowClass?: string; rowStyle?: CSSProperties; alone?: boolean; hero?: number;
}) {
  const list = (buttons ?? []).filter((b) => b.label && b.link);
  if (!list.length) return null;
  if (alone && list.length === 1) return <SectionButtonLink b={list[0]} className="reveal" />;
  const heroProps = hero === undefined ? {} : { 'data-hero': '' };
  const style = hero === undefined ? rowStyle : ({ ...rowStyle, '--h': hero } as CSSProperties);
  return (
    <div className={rowClass} style={style} {...heroProps}>
      {list.map((b, i) => <SectionButtonLink key={i} b={b} magnetic={magnetic} />)}
    </div>
  );
}

/** Grid class for n cards. */
export const gridFor = (n: number) => `grid grid--${n >= 4 ? 4 : n === 3 ? 3 : 2}`;
