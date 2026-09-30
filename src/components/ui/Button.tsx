import type { ReactNode } from 'react';
import { TLink } from './TLink';

type Variant = 'gold' | 'dark' | 'light' | 'outline';

type Common = {
  label: string;
  variant?: Variant;
  arrow?: boolean;
  magnetic?: boolean;
  icon?: ReactNode;
  block?: boolean;
  className?: string;
};

/** Label that rolls up on hover while the fill slides in (see .btn__label in globals.css). */
function Label({ text }: { text: string }) {
  return (
    <span className="btn__label">
      <span className="btn__roll" data-text={text}>{text}</span>
    </span>
  );
}

function cls({ variant = 'dark', arrow, block, className }: Common) {
  return ['btn', `btn--${variant}`, 'has-roll', arrow && 'btn--arrow', block && 'btn--block', className].filter(Boolean).join(' ');
}

/** Internal link (with the curtain page transition), external link, or tel:/wa links. */
export function Button(props: Common & { href: string; external?: boolean }) {
  const { href, external, label, icon, magnetic } = props;
  const inner = (<>{icon}<Label text={label} /></>);
  const magnet = magnetic ? { 'data-magnetic': '' } : {};
  if (external || /^(https?:|tel:|mailto:)/.test(href)) {
    const newTab = /^https?:/.test(href);
    return (
      <a href={href} className={cls(props)} {...magnet} {...(newTab ? { target: '_blank', rel: 'noopener noreferrer' } : {})}>
        {inner}
      </a>
    );
  }
  return (
    <TLink href={href} className={cls(props)} {...magnet}>
      {inner}
    </TLink>
  );
}

/** <button> with the same look (forms). */
export function ActionButton(props: Common & { type?: 'button' | 'submit'; onClick?: () => void; disabled?: boolean }) {
  const { type = 'button', onClick, disabled, label, icon, magnetic } = props;
  return (
    <button type={type} className={cls(props)} onClick={onClick} disabled={disabled} {...(magnetic ? { 'data-magnetic': '' } : {})}>
      {icon}
      <Label text={label} />
    </button>
  );
}
