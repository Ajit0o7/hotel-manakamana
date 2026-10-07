import type { ReactNode } from 'react';
import { TLink } from '@/components/ui/TLink';

/** Tiny inline formatter for guide and section copy: **bold** and [label](href). Internal links use the curtain
    transition; web links open in a new tab. */
export function RichText({ text }: { text: string }) {
  const out: ReactNode[] = [];
  const re = /\*\*(.+?)\*\*|\[(.+?)\]\((.+?)\)/g;
  let last = 0;
  let m: RegExpExecArray | null;
  let k = 0;
  while ((m = re.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index));
    if (m[1]) out.push(<strong key={k++}>{m[1]}</strong>);
    else if (m[3].startsWith('/')) out.push(<TLink key={k++} href={m[3]}>{m[2]}</TLink>);
    else if (/^https?:/.test(m[3])) out.push(<a key={k++} href={m[3]} target="_blank" rel="noopener noreferrer">{m[2]}</a>);
    else out.push(<a key={k++} href={m[3]}>{m[2]}</a>); // tel:, mailto:, #anchor
    last = re.lastIndex;
  }
  if (last < text.length) out.push(text.slice(last));
  return <>{out}</>;
}
