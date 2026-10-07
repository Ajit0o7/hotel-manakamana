'use client';

import { useState, type FormEvent } from 'react';
import { useAuth } from './AuthProvider';

export function LoginForm() {
  const { signIn, status } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const err = await signIn(email, password);
    setBusy(false);
    if (err) setError(err);
  }

  return (
    <form className="cms-card cms-auth__card" onSubmit={submit}>
      <p className="cms-brand cms-brand--dark">Hotel Manakamana <span>CMS</span></p>
      <h1 className="cms-h1">Sign in</h1>
      <label className="cms-label">
        Email
        <input className="cms-input" type="email" autoComplete="username" required value={email} onChange={(e) => setEmail(e.target.value)} />
      </label>
      <label className="cms-label">
        Password
        <input className="cms-input" type="password" autoComplete="current-password" required value={password} onChange={(e) => setPassword(e.target.value)} />
      </label>
      {error && <p className="cms-error" role="alert">{error}</p>}
      <button className="cms-btn cms-btn--primary cms-btn--block" disabled={busy || status === 'loading'}>
        {busy ? 'Signing in…' : 'Sign in'}
      </button>
    </form>
  );
}
