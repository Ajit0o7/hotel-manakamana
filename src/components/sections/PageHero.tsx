import Image from 'next/image';
import type { CSSProperties, ReactNode } from 'react';
import { Eyebrow } from '@/components/ui/Eyebrow';
import { SplitHeading } from '@/components/ui/SplitHeading';
import { TLink } from '@/components/ui/TLink';
import type { Photo } from '@/content/images';

type Crumb = { href?: string; label: string };

/** Inner-page hero: parallax photo, breadcrumb, eyebrow, split title, intro line. */
export function PageHero({ photo, eyebrow, title, text, crumbs, position }: {
  photo: Photo; eyebrow: string; title: ReactNode; text: ReactNode; crumbs: Crumb[]; position?: string;
}) {
  return (
    <section className="page-hero">
      <div className="page-hero__media" data-parallax="0.2">
        <Image src={photo.src} alt={photo.alt} fill preload sizes="100vw" placeholder="blur" style={position ? { objectPosition: position } : undefined} />
      </div>
      <div className="container">
        <p className="crumbs" data-hero="" style={{ '--h': 0 } as CSSProperties}>
          <TLink href="/">Home</TLink>
          {crumbs.map((c) => (
            <span key={c.label}>
              &nbsp;/&nbsp;{c.href ? <TLink href={c.href}>{c.label}</TLink> : c.label}
            </span>
          ))}
        </p>
        <Eyebrow hero={1}>{eyebrow}</Eyebrow>
        <SplitHeading as="h1">{title}</SplitHeading>
        <p data-hero="" style={{ '--h': 4 } as CSSProperties}>{text}</p>
      </div>
    </section>
  );
}
