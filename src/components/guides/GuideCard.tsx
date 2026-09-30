import Image from 'next/image';
import { TLink } from '@/components/ui/TLink';
import type { Guide } from '@/content/guides';

export function GuideCard({ guide, className = 'reveal' }: { guide: Guide; className?: string }) {
  return (
    <TLink href={`/guides/${guide.slug}`} className={`guide-card ${className}`}>
      <span className="guide-card__media">
        <Image src={guide.hero.src} alt="" fill sizes="(max-width: 680px) 100vw, 400px" placeholder="blur" />
      </span>
      <span className="guide-card__body">
        <span className="tag">{guide.eyebrow}</span>
        <h3>{guide.title}</h3>
        <p>{guide.description}</p>
        <span className="guide-card__foot">
          <span>{guide.readMins} min read</span>
          <span>Read guide →</span>
        </span>
      </span>
    </TLink>
  );
}
