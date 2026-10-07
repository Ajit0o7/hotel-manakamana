import { Fragment, type ReactNode } from 'react';
import { RichText } from '@/components/guides/RichText';

/* How section texts written in the CMS become markup (the conventions are explained to editors in the CMS):
   - headings: *stars* → gold italics, a new line → a line break;
   - texts: a blank line → a new paragraph, **bold** and [label](href) → bold and links;
   - {placeholders} → current values (see fillPlaceholders). */

/** A heading with *accent* words and line breaks, as children of <SplitHeading>. */
export function heading(text: string | undefined): ReactNode {
  if (!text) return null;
  const lines = text.split('\n');
  return lines.map((line, i) => (
    <Fragment key={i}>
      {i > 0 && <br />}
      {line.split(/\*([^*]+)\*/).map((part, j) => (j % 2 ? <em key={j} className="accent">{part}</em> : part || null))}
    </Fragment>
  ));
}

/** The paragraphs of a text, each as <p className={className}>. */
export function Paragraphs({ text, className }: { text?: string; className?: string }) {
  if (!text?.trim()) return null;
  return (
    <>
      {text
        .split(/\n\s*\n/)
        .map((p) => p.trim())
        .filter(Boolean)
        .map((p, i) => (
          <p key={i} className={className}>
            <RichText text={p} />
          </p>
        ))}
    </>
  );
}

/** A single line of inline text (bold and links), without a paragraph. */
export function Inline({ text }: { text?: string }) {
  return text ? <RichText text={text} /> : null;
}

/** Replaces {name} placeholders in every string of a section; photos are left alone. */
export function fillPlaceholders<T>(value: T, vars: Record<string, string>): T {
  const fill = (v: unknown): unknown => {
    if (typeof v === 'string') return v.replace(/\{([a-z_]+)\}/g, (m, name: string) => vars[name] ?? m);
    if (Array.isArray(v)) return v.map(fill);
    if (v && typeof v === 'object') {
      if ('src' in v && 'alt' in v) return v; // a photo
      return Object.fromEntries(Object.entries(v).map(([k, x]) => [k, fill(x)]));
    }
    return v;
  };
  return fill(value) as T;
}
