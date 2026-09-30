import Image from 'next/image';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import { AIRLINES } from '@/content/airlines';
import type { Block } from '@/content/guides';
import { HOTEL, WHATSAPP_URL } from '@/content/hotel';
import { RichText } from './RichText';

/** Renders a guide's content blocks (see src/content/guides.ts). */
export function GuideBody({ blocks }: { blocks: Block[] }) {
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
            return (
              <table key={i} className="guide-airlines">
                <caption className="visually-hidden">Airlines flying Manthali (Ramechhap) to Lukla</caption>
                <thead>
                  <tr><th scope="col">Airline</th><th scope="col">Aircraft</th><th scope="col">Phone</th><th scope="col">Website</th></tr>
                </thead>
                <tbody>
                  {AIRLINES.map((a) => (
                    <tr key={a.name}>
                      <td>{a.name}</td>
                      <td>{a.aircraft}</td>
                      <td><a href={`tel:${a.phoneTel}`}>{a.phoneDisplay}</a></td>
                      <td><a href={a.url} target="_blank" rel="noopener noreferrer">{a.site}</a></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            );
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
            return (
              <aside key={i} className="guide-cta">
                <h3>{b.title}</h3>
                <p>{b.text}</p>
                <div className="hero__ctas">
                  <Button href="/contact#enquiry" label="Check availability" variant="gold" arrow />
                  <Button href={`tel:${HOTEL.phoneTel}`} label="Call us" variant="light" icon={<Icon name="phone" />} />
                  <Button href={WHATSAPP_URL} label="WhatsApp" variant="light" />
                </div>
              </aside>
            );
        }
      })}
    </div>
  );
}
