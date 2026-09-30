import { Children, cloneElement, createElement, isValidElement, type CSSProperties, type ReactElement, type ReactNode } from 'react';

/* Renders a heading with every word wrapped for the word-by-word reveal
   (.sw > span, animated in globals.css when the heading gets .is-split-in).
   Nested elements such as <em className="accent"> keep their own words split too. */

type Props = { as?: 'h1' | 'h2' | 'h3'; className?: string; children: ReactNode };

function textOf(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(textOf).join('');
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    return el.type === 'br' ? ' ' : textOf(el.props.children);
  }
  return '';
}

function split(node: ReactNode, counter: { i: number }, keyBase: string): ReactNode {
  if (node == null || typeof node === 'boolean') return node;
  if (typeof node === 'string' || typeof node === 'number') {
    const parts = String(node).split(/(\s+)/);
    return parts.map((part, idx) => {
      if (!part) return null;
      if (/^\s+$/.test(part)) return ' ';
      const i = counter.i++;
      return (
        <span className="sw" aria-hidden="true" key={`${keyBase}-${idx}`}>
          <span style={{ '--wi': i } as CSSProperties}>{part}</span>
        </span>
      );
    });
  }
  if (Array.isArray(node)) return node.map((n, i) => split(n, counter, `${keyBase}.${i}`));
  if (isValidElement(node)) {
    const el = node as ReactElement<{ children?: ReactNode }>;
    if (el.props.children == null) return el;
    return cloneElement(el, { key: keyBase }, Children.toArray(el.props.children).map((c, i) => split(c, counter, `${keyBase}.${i}`)));
  }
  return node;
}

export function SplitHeading({ as = 'h2', className, children }: Props) {
  const label = textOf(children).replace(/\s+/g, ' ').trim();
  return createElement(as, { className, 'data-split': '', 'aria-label': label }, split(children, { i: 0 }, 'w'));
}
