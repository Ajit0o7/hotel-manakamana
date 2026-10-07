'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, type ReactNode } from 'react';
import { AuthProvider, useAuth } from './AuthProvider';
import { SlowBanner } from './SlowBanner';
import { Spinner } from './Spinner';
import { Toaster } from './Toaster';
import { TypesProvider, useContentTypes } from './TypesProvider';

/** Everything around an admin page: sign-in gate, sidebar, notifications. */
export function AdminApp({ children }: { children: ReactNode }) {
  return (
    <div className="cms">
      <AuthProvider>
        <Toaster>
          <SlowBanner />
          <Gate>{children}</Gate>
        </Toaster>
      </AuthProvider>
    </div>
  );
}

function Gate({ children }: { children: ReactNode }) {
  const { status, principal, accessError, email, signOut, recheck } = useAuth();
  const pathname = usePathname();
  const router = useRouter();
  const onLogin = pathname === '/admin/login';

  useEffect(() => {
    if (status === 'signed-out' && !onLogin) {
      router.replace(`/admin/login?next=${encodeURIComponent(pathname)}`);
    } else if (status === 'signed-in' && principal && onLogin) {
      const next = new URLSearchParams(window.location.search).get('next');
      router.replace(next && next.startsWith('/admin') ? next : '/admin');
    }
  }, [status, principal, onLogin, pathname, router]);

  if (onLogin) {
    return (
      <div className="cms-auth">
        {children}
        {accessError && <AccessProblem message={accessError} email={email} onRetry={recheck} onSignOut={signOut} />}
      </div>
    );
  }
  if (status !== 'signed-in') return <Spinner label="Loading…" />;
  if (accessError)
    return (
      <div className="cms-auth">
        <AccessProblem message={accessError} email={email} onRetry={recheck} onSignOut={signOut} />
      </div>
    );
  if (!principal) return <Spinner label="Checking your account…" />;

  return (
    <TypesProvider>
      <div className="cms-layout">
        <Sidebar />
        <main className="cms-main">{children}</main>
      </div>
    </TypesProvider>
  );
}

function AccessProblem(props: { message: string; email: string; onRetry: () => void; onSignOut: () => void }) {
  return (
    <div className="cms-card cms-auth__card" role="alert">
      <h1 className="cms-h1">Can&apos;t open the CMS</h1>
      <p>{props.message}</p>
      {props.email && <p className="cms-muted">Signed in as {props.email}</p>}
      <div className="cms-row">
        <button className="cms-btn cms-btn--primary" onClick={props.onRetry}>Try again</button>
        <button className="cms-btn" onClick={props.onSignOut}>Sign out</button>
      </div>
    </div>
  );
}

function NavLink({ href, label, exact = false }: { href: string; label: string; exact?: boolean }) {
  const pathname = usePathname();
  const active = exact ? pathname === href : pathname === href || pathname.startsWith(href + '/');
  return (
    <Link href={href} className={`cms-nav__link${active ? ' is-active' : ''}`} aria-current={active ? 'page' : undefined}>
      {label}
    </Link>
  );
}

function Sidebar() {
  const { email, signOut } = useAuth();
  const { types } = useContentTypes();
  return (
    <aside className="cms-sidebar">
      <Link href="/admin" className="cms-brand">
        Hotel Manakamana <span>CMS</span>
      </Link>
      <nav className="cms-nav" aria-label="CMS">
        <NavLink href="/admin" label="Dashboard" exact />
        {types?.map((t) => <NavLink key={t.name} href={`/admin/content/${t.name}`} label={t.label_plural} />)}
        <NavLink href="/admin/media" label="Media library" />
      </nav>
      <div className="cms-sidebar__foot">
        <a href="/" target="_blank" rel="noreferrer" className="cms-nav__link">View website ↗</a>
        <p className="cms-sidebar__user" title={email}>{email}</p>
        <button className="cms-btn cms-btn--ghost" onClick={signOut}>Sign out</button>
      </div>
    </aside>
  );
}
