import Image from 'next/image';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import type { Block } from '@/content/guides';
import type { Hotel } from '@/lib/cms/site';
import { AirlinesTable, GuideCta } from './GuideBlocks';
import { RichText } from './RichText';

/** Renders a built-in guide's content blocks (see src/content/guides.ts). Guides written in the CMS
    go through GuideHtml instead. */
export function GuideBody({ blocks, hotel }: { blocks: Block[]; hotel: Hotel }) {
  return (
    <div className="guide-body">
      {blocks.map((b, i) => {
        switch (b.type) {
          case 'h2':
            return <h2 key={i} id={b.id}>{b.text}</h2>;
          case 'p':
            return <p key={i}><RichText text={b.text} /></p>;
          case 'list': {
            const items = b.items.map((it, j) => <li key={j}><RichText text={it} /></li>);
            return b.ordered ? <ol key={i}>{items}</ol> : <ul key={i}>{items}</ul>;
          }
          case 'callout':
            return (
              <aside key={i} className="guide-callout">
                <strong>{b.title}</strong>
                <p>{b.text}</p>
              </aside>
            );
          case 'compare':
            return (
              <div key={i} className="guide-compare">
                {b.items.map((c) => (
                  <div key={c.title} className={c.tone === 'good' ? 'is-good' : undefined}>
                    <h3>{c.title}</h3>
                    <ul>{c.points.map((pt) => <li key={pt}>{pt}</li>)}</ul>
                  </div>
                ))}
              </div>
            );
          case 'airlines':
            return <AirlinesTable key={i} />;
          case 'table':
            return (
              <table key={i} className="guide-table">
                <caption className="visually-hidden">{b.caption}</caption>
                <thead>
                  <tr>{b.head.map((h) => <th scope="col" key={h}>{h}</th>)}</tr>
                </thead>
                <tbody>
                  {b.rows.map((row, j) => (
                    <tr key={j}>{row.map((cell, k) => <td key={k}><RichText text={cell} /></td>)}</tr>
                  ))}
                </tbody>
              </table>
            );
          case 'weather':
            return <div key={i} className="guide-weather"><ManthaliNow tone="light" /></div>;
          case 'map':
            return <iframe key={i} className="guide-map" title={b.title} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={b.src} />;
          case 'figure':
            return (
              <figure key={i} className="guide-figure">
                <Image src={b.photo.src} alt={b.photo.alt} sizes="(max-width: 900px) 100vw, 720px" placeholder="blur" />
                <figcaption>
                  {b.caption}
                  {b.credit && (
                    <span className="guide-figure__credit">
                      Photo: <a href={b.credit.sourceUrl} target="_blank" rel="noopener noreferrer">{b.credit.author}</a>,{' '}
                      <a href={b.credit.licenseUrl} target="_blank" rel="noopener noreferrer license">{b.credit.license}</a>
                    </span>
                  )}
                </figcaption>
              </figure>
            );
          case 'cta':
            return <GuideCta key={i} title={b.title} text={b.text} hotel={hotel} />;
        }
      })}
    </div>
  );
}
