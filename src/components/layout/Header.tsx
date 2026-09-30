'use client';

import { usePathname } from 'next/navigation';
import { useEffect, useRef, useState, type CSSProperties } from 'react';
import { PagodaMark } from '@/components/brand/PagodaMark';
import { Button } from '@/components/ui/Button';
import { Icon } from '@/components/ui/Icon';
import { TLink } from '@/components/ui/TLink';
import { HOTEL, NAV, WHATSAPP_URL } from '@/content/hotel';
import { lockScroll } from '@/lib/scroll-lock';

export function Header() {
  const pathname = usePathname();
  const [solid, setSolid] = useState(false);
  const [hidden, setHidden] = useState(false);
  const [open, setOpen] = useState(false);
  const openRef = useRef(false);
  const burgerRef = useRef<HTMLButtonElement>(null);

  // solid after 40px, tucked away while scrolling down, back on scroll up
  useEffect(() => {
    let lastY = window.scrollY;
    let ticking = false;
    const frame = () => {
      ticking = false;
      const y = window.scrollY;
      setSolid(y > 40);
      if (!openRef.current && y > 520 && y > lastY + 4) setHidden(true);
      else if (y < lastY - 4 || y <= 520) setHidden(false);
      lastY = y;
    };
    const onScroll = () => {
      if (!ticking) {
        ticking = true;
        requestAnimationFrame(frame);
      }
    };
    frame();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('header-hidden', hidden);
  }, [hidden]);

  // mobile menu open/close side effects
  useEffect(() => {
    openRef.current = open;
    document.body.classList.toggle('menu-open', open);
    if (!open) return;
    lockScroll(true);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        burgerRef.current?.focus();
      }
    };
    const mq = window.matchMedia('(min-width: 961px)');
    const onMq = (e: MediaQueryListEvent) => e.matches && setOpen(false);
    document.addEventListener('keydown', onKey);
    mq.addEventListener('change', onMq);
    return () => {
      lockScroll(false);
      document.removeEventListener('keydown', onKey);
      mq.removeEventListener('change', onMq);
    };
  }, [open]);

  // close the menu when the page changes (state reset during render, as React recommends)
  const [menuPath, setMenuPath] = useState(pathname);
  if (menuPath !== pathname) {
    setMenuPath(pathname);
    setOpen(false);
  }

  const isActive = (href: string) => (href === '/' ? pathname === '/' : pathname.startsWith(href));
  const cls = ['header', solid && 'is-solid', hidden && 'is-hidden', open && 'menu-open'].filter(Boolean).join(' ');

  return (
    <header className={cls} id="header">
      <div className="container header__inner">
        <TLink href="/" className="logo" aria-label={`${HOTEL.name} — home`}>
          <span className="logo__mark"><PagodaMark /></span>
          <span className="logo__text">
            <span className="logo__name">{HOTEL.shortName}</span>
            <span className="logo__tag">{HOTEL.tagline}</span>
          </span>
        </TLink>
        <nav className={`nav${open ? ' is-open' : ''}`} id="nav" aria-label="Primary">
          {NAV.map((item, i) => (
            <TLink
              key={item.href}
              href={item.href}
              className={isActive(item.href) ? 'is-active' : undefined}
              aria-current={isActive(item.href) ? 'page' : undefined}
              style={{ '--i': i } as CSSProperties}
              onClick={() => setOpen(false)}
            >
              {item.label}
            </TLink>
          ))}
          <div className="nav__extra" style={{ '--i': NAV.length } as CSSProperties}>
            <a href={`tel:${HOTEL.phoneTel}`}>{HOTEL.phoneDisplay}</a>
            <a href={WHATSAPP_URL} target="_blank" rel="noopener noreferrer">WhatsApp us</a>
          </div>
        </nav>
        <div className="header__actions">
          <a href={`tel:${HOTEL.phoneTel}`} className="header__phone">
            <Icon name="phone" /> {HOTEL.phoneDisplay}
          </a>
          <Button href="/contact" label="Book now" variant="dark" magnetic />
          <button
            ref={burgerRef}
            className="burger"
            id="burger"
            aria-label={open ? 'Close menu' : 'Open menu'}
            aria-expanded={open}
            aria-controls="nav"
            onClick={() => {
              setOpen((o) => !o);
              setHidden(false);
            }}
          >
            <span /><span /><span />
          </button>
        </div>
      </div>
    </header>
  );
}
