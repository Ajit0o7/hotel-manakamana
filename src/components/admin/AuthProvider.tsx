'use client';

import type { Session } from '@supabase/supabase-js';
import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import { api, ApiError } from '@/lib/cms/api';
import { supabase } from '@/lib/cms/supabase';
import type { Principal } from '@/lib/cms/types';

type Status = 'loading' | 'signed-out' | 'signed-in';

interface AuthValue {
  status: Status;
  email: string;
  /** Set once the CMS has confirmed this account is an admin. */
  principal: Principal | null;
  /** Why the CMS refused the signed-in account, if it did. */
  accessError: string | null;
  signIn: (email: string, password: string) => Promise<string | null>;
  signOut: () => Promise<void>;
  recheck: () => void;
}

const AuthContext = createContext<AuthValue | null>(null);

export function useAuth(): AuthValue {
  const v = useContext(AuthContext);
  if (!v) throw new Error('useAuth outside AuthProvider');
  return v;
}

function explain(err: unknown): string {
  if (err instanceof ApiError) {
    if (err.status === 403)
      return 'You are signed in, but this account is not a CMS admin. Ask the site owner to give it the admin role.';
    if (err.status === 401)
      return 'The CMS server did not accept your sign-in. In Supabase, check that the project signs tokens with the new JWT signing keys (Settings → JWT Keys).';
    return err.message;
  }
  return 'Something went wrong while checking your account.';
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<Status>('loading');
  const [email, setEmail] = useState('');
  const [principal, setPrincipal] = useState<Principal | null>(null);
  const [accessError, setAccessError] = useState<string | null>(null);
  const [checkCount, setCheckCount] = useState(0);

  // Follow Supabase's session (sign-in, sign-out, other tabs). The callback only records the
  // session; Supabase asks that no other Supabase calls are made from inside it.
  const [session, setSession] = useState<Session | null | undefined>(undefined);
  useEffect(() => {
    const { data } = supabase().auth.onAuthStateChange((event, s) => {
      if (event === 'TOKEN_REFRESHED') return;
      setSession(s);
    });
    return () => data.subscription.unsubscribe();
  }, []);

  // Whenever the session changes (sign-in, sign-out, another user), ask the CMS whether this
  // account is an admin. Token refreshes are ignored above, so this runs rarely.
  useEffect(() => {
    if (session === undefined) return;
    let cancelled = false;
    Promise.resolve().then(async () => {
      if (cancelled) return;
      if (!session) {
        setStatus('signed-out');
        setEmail('');
        setPrincipal(null);
        setAccessError(null);
        return;
      }
      setStatus('signed-in');
      setEmail(session.user.email ?? '');
      setAccessError(null);
      try {
        const p = await api<Principal>('/api/v1/admin/me');
        if (!cancelled) setPrincipal(p);
      } catch (err) {
        if (!cancelled) {
          setPrincipal(null);
          setAccessError(explain(err));
        }
      }
    });
    return () => {
      cancelled = true;
    };
  }, [session, checkCount]);

  const signIn = useCallback(async (mail: string, password: string) => {
    const { error } = await supabase().auth.signInWithPassword({ email: mail.trim(), password });
    if (!error) return null;
    if (/invalid login credentials/i.test(error.message)) return 'Wrong email or password.';
    if (/email not confirmed/i.test(error.message)) return 'This email address has not been confirmed yet.';
    return error.message;
  }, []);

  const signOut = useCallback(async () => {
    await supabase().auth.signOut();
  }, []);

  const recheck = useCallback(() => setCheckCount((n) => n + 1), []);

  const value = useMemo(
    () => ({ status, email, principal, accessError, signIn, signOut, recheck }),
    [status, email, principal, accessError, signIn, signOut, recheck],
  );
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}
