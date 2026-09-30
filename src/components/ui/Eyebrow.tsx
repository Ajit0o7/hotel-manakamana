import type { CSSProperties, ReactNode } from 'react';

/** Small gold label above headings: "—— 01 WELCOME".
 *  `hero` = position in the hero intro sequence (uses data-hero instead of the scroll reveal). */
export function Eyebrow({ children, num, hero }: { children: ReactNode; num?: string; hero?: number }) {
  const heroProps = hero === undefined ? {} : { 'data-hero': '', style: { '--h': hero } as CSSProperties };
  return (
    <p className={hero === undefined ? 'eyebrow reveal' : 'eyebrow'} {...heroProps}>
      {num && <span className="eyebrow__num">{num}</span>}
      {children}
    </p>
  );
}
