import { domToReact, htmlToDOM, type DOMNode, type HTMLReactParserOptions } from 'html-react-parser';
import type { ChildNode, Element } from 'domhandler';
import Image from 'next/image';
import { Fragment, type ReactNode } from 'react';
import { TLink } from '@/components/ui/TLink';
import { ManthaliNow } from '@/components/weather/ManthaliNow';
import type { Hotel } from '@/lib/cms/site';
import { AirlinesTable, GuideCta } from './GuideBlocks';

/* Renders a guide written in the CMS. The HTML was sanitized by the CMS; here it is mapped onto the same
   markup and components as the built-in guides:

   - a line "[airlines]", "[weather]", "[booking Title | Text]" or "[map Title | https://maps.google.com/…]"
     becomes that block, and "[compare]" … "[/compare]" turns H3 + list pairs into side-by-side boxes
     ("(recommended)" after an H3 highlights that box);
   - a quote becomes a tip box (a bold first line is its title);
   - an image becomes a figure: its title is the caption, and an italic "Photo: …" line right after it
     is the credit;
   - H2s get ids for the table of contents, and internal links use the page transition. */

const SHORTCODE = /^\[(airlines|weather|booking|map|compare|\/compare)(?:\s+([\s\S]*))?\]$/;
const CELLS = new Set(['li', 'td', 'th']);
const MAP_HOSTS = new Set(['maps.google.com', 'www.google.com', 'google.com']);

const isTag = (n: ChildNode | undefined, name?: string): n is Element =>
  !!n && n.type === 'tag' && (!name || (n as Element).name === name);

function textOf(n: ChildNode): string {
  if (n.type === 'text') return (n as unknown as { data: string }).data;
  if (isTag(n)) return n.children.map(textOf).join('');
  return '';
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize('NFKD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/[^\p{L}\p{N}]+/gu, '-')
    .replace(/^-+|-+$/g, '');
}

/** The guide's H2 headings with the ids the renderer gives them, for the table of contents. */
export function guideToc(html: string): { id: string; text: string }[] {
  const seen = new Map<string, number>();
  return (htmlToDOM(html) as ChildNode[])
    .filter((n): n is Element => isTag(n, 'h2'))
    .map((h) => {
      const text = textOf(h).trim();
      return { id: uniqueId(slugify(text) || 'section', seen), text };
    });
}

function uniqueId(base: string, seen: Map<string, number>) {
  const n = seen.get(base) ?? 0;
  seen.set(base, n + 1);
  return n ? `${base}-${n + 1}` : base;
}

/** Link and inline-image handling inside paragraphs, lists, tables… */
const inline: HTMLReactParserOptions = {
  replace(node) {
    if (!isTag(node as ChildNode)) return undefined;
    const el = node as Element;
    // The editor wraps each list item and table cell in a paragraph; drop it so they keep their spacing.
    if (el.name === 'p' && isTag(el.parent as ChildNode, undefined) && CELLS.has((el.parent as Element).name)) {
      const siblings = (el.parent as Element).children.filter((c) => isTag(c));
      const children = domToReact(el.children as DOMNode[], inline);
      return siblings.length === 1 ? <>{children}</> : <span className="guide-cell-p">{children}</span>;
    }
    if (el.name === 'a') {
      const href = el.attribs.href ?? '';
      const children = domToReact(el.children as DOMNode[], inline);
      if (href.startsWith('/')) return <TLink href={href}>{children}</TLink>;
      return (
        <a href={href} target="_blank" rel="noopener noreferrer">
          {children}
        </a>
      );
    }
    return undefined;
  },
};

const render = (nodes: ChildNode[]) => domToReact(nodes as DOMNode[], inline);

function Figure({ img, credit }: { img: Element; credit?: Element }) {
  const { src = '', alt = '', title = '' } = img.attribs;
  const width = Number(img.attribs.width);
  const height = Number(img.attribs.height);
  return (
    <figure className="guide-figure">
      {width > 0 && height > 0 ? (
        <Image src={src} alt={alt} width={width} height={height} sizes="(max-width: 900px) 100vw, 720px" />
      ) : (
        // eslint-disable-next-line @next/next/no-img-element -- size unknown, so next/image can't lay it out
        <img src={src} alt={alt} loading="lazy" />
      )}
      {(title || credit) && (
        <figcaption>
          {title}
          {credit && <span className="guide-figure__credit">{render(credit.children)}</span>}
        </figcaption>
      )}
    </figure>
  );
}

function Callout({ quote }: { quote: Element }) {
  const blocks = quote.children.filter((c) => isTag(c));
  const first = blocks[0];
  const hasTitle =
    isTag(first, 'p') && first.children.filter((c) => textOf(c).trim()).every((c) => isTag(c, 'strong'));
  return (
    <aside className="guide-callout">
      {hasTitle && <strong>{textOf(first).trim()}</strong>}
      {blocks.slice(hasTitle ? 1 : 0).map((b, i) => (
        <p key={i}>{render(isTag(b, 'p') ? b.children : [b])}</p>
      ))}
    </aside>
  );
}

function Compare({ nodes }: { nodes: ChildNode[] }) {
  const boxes: { title: string; good: boolean; items: Element[] }[] = [];
  for (const n of nodes) {
    if (isTag(n, 'h3')) {
      const raw = textOf(n).trim();
      const good = /\(recommended\)\s*$/i.test(raw);
      boxes.push({ title: raw.replace(/\s*\(recommended\)\s*$/i, ''), good, items: [] });
    } else if (boxes.length && isTag(n)) {
      boxes[boxes.length - 1].items.push(n);
    }
  }
  return (
    <div className="guide-compare">
      {boxes.map((b) => (
        <div key={b.title} className={b.good ? 'is-good' : undefined}>
          <h3>{b.title}</h3>
          {b.items.map((it, i) =>
            it.name === 'ul' || it.name === 'ol' ? <ul key={i}>{render(it.children)}</ul> : <p key={i}>{render(it.children)}</p>,
          )}
        </div>
      ))}
    </div>
  );
}

/** A table; the editor keeps its header row in the body, so a first row of header cells moves to <thead>. */
function Table({ table }: { table: Element }) {
  const rows = table.children
    .filter((c): c is Element => isTag(c))
    .flatMap((c) => (c.name === 'tr' ? [c] : c.children.filter((r): r is Element => isTag(r, 'tr'))));
  const cells = (r: Element) => r.children.filter((c): c is Element => isTag(c));
  const head = rows[0] && cells(rows[0]).every((c) => c.name === 'th') ? rows[0] : undefined;
  const body = head ? rows.slice(1) : rows;
  return (
    <table className="guide-table">
      {head && (
        <thead>
          <tr>{cells(head).map((c, i) => <th key={i} scope="col">{render(c.children)}</th>)}</tr>
        </thead>
      )}
      <tbody>
        {body.map((r, i) => (
          <tr key={i}>{render(cells(r))}</tr>
        ))}
      </tbody>
    </table>
  );
}

function MapEmbed({ args }: { args: string }) {
  const [title, src] = args.split('|').map((s) => s.trim());
  try {
    const u = new URL(src);
    if (u.protocol !== 'https:' || !MAP_HOSTS.has(u.hostname)) return null;
  } catch {
    return null;
  }
  return <iframe className="guide-map" title={title || 'Map'} loading="lazy" referrerPolicy="no-referrer-when-downgrade" src={src} />;
}

export function GuideHtml({ html, hotel }: { html: string; hotel: Hotel }) {
  const nodes = (htmlToDOM(html) as ChildNode[]).filter((n) => isTag(n) || textOf(n).trim());
  const out: ReactNode[] = [];
  const seen = new Map<string, number>();

  for (let i = 0; i < nodes.length; i++) {
    const n = nodes[i];
    if (!isTag(n)) continue;
    const key = `b${i}`;
    const code = n.name === 'p' ? textOf(n).trim().match(SHORTCODE) : null;

    if (code) {
      const [, name, args = ''] = code;
      if (name === 'airlines') out.push(<AirlinesTable key={key} />);
      else if (name === 'weather') out.push(<div key={key} className="guide-weather"><ManthaliNow tone="light" /></div>);
      else if (name === 'booking') {
        const [title, text] = args.split('|').map((s) => s.trim());
        out.push(<GuideCta key={key} title={title || 'Stay with us'} text={text ?? ''} hotel={hotel} />);
      } else if (name === 'map') out.push(<MapEmbed key={key} args={args} />);
      else if (name === 'compare') {
        const end = nodes.findIndex((m, j) => j > i && isTag(m, 'p') && textOf(m).trim() === '[/compare]');
        const stop = end === -1 ? nodes.length : end;
        out.push(<Compare key={key} nodes={nodes.slice(i + 1, stop)} />);
        i = stop;
      }
      continue;
    }

    switch (n.name) {
      case 'h2': {
        const text = textOf(n).trim();
        out.push(<h2 key={key} id={uniqueId(slugify(text) || 'section', seen)}>{render(n.children)}</h2>);
        break;
      }
      case 'img': {
        const next = nodes[i + 1];
        const em = isTag(next, 'p') ? next.children.find((c) => isTag(c)) : undefined;
        const credit = isTag(em, 'em') && /^photo:/i.test(textOf(em).trim()) ? em : undefined;
        out.push(<Figure key={key} img={n} credit={credit} />);
        if (credit) i++;
        break;
      }
      case 'blockquote':
        out.push(<Callout key={key} quote={n} />);
        break;
      case 'table':
        out.push(<Table key={key} table={n} />);
        break;
      default:
        out.push(<Fragment key={key}>{domToReact([n] as DOMNode[], inline)}</Fragment>);
    }
  }
  return <div className="guide-body">{out}</div>;
}
