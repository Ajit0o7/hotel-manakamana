'use client';

import Link from 'next/link';
import type { ComponentProps } from 'react';
import { useCurtain } from '@/components/layout/CurtainProvider';

/** next/link that plays the emblem curtain before client-side navigation.
 *  onNavigate only fires for plain same-origin SPA navigations (not Ctrl/Cmd-click, downloads or new tabs). */
export function TLink({ href, onNavigate, ...rest }: ComponentProps<typeof Link> & { 'data-magnetic'?: string }) {
  const { navigate } = useCurtain();
  return (
    <Link
      href={href}
      {...rest}
      onNavigate={(e) => {
        onNavigate?.(e);
        if (typeof href === 'string' && navigate(href)) e.preventDefault();
      }}
    />
  );
}
