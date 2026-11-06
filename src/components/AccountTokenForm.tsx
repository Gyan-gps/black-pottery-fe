'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { ApiClientError, post } from '@/lib/api';
import { useAuth } from '@/lib/store';
import { Field, Notice, Spinner } from './ui';

export function AccountTokenForm({ mode }: { mode: 'reset' | 'verify' }) {
  const token = useSearchParams().get('token');
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const reset = mode === 'reset';
  return <div className="shell py-section"><div className="mx-auto max-w-md">
    <h1 className="font-serif text-display-md text-ink-900">{done ? reset ? 'Password updated' : 'Email confirmed' : reset ? 'Choose a new password' : 'Confirm your email'}</h1>
    {done ? <><p className="mt-5 prose-craft">{reset ? 'Your password has been updated. Sign in with your new password.' : 'Your email address is now confirmed.'}</p><Link className="btn-primary mt-8" href="/sign-in">Sign in</Link></> : !token ? <div className="mt-6"><Notice tone="error">This link is incomplete. Please use the link in your email.</Notice><Link className="btn-secondary mt-6" href={reset ? '/forgot-password' : '/account'}>Go back</Link></div> :
    <form className="mt-8 space-y-5" onSubmit={async (event) => {
      event.preventDefault(); setError(null);
      if (reset && password !== confirmation) { setError('The passwords do not match.'); return; }
      setBusy(true);
      try {
        await post(reset ? '/auth/reset-password' : '/auth/verify-email', reset ? { token, password } : { token });
        if (reset) useAuth.getState().clear();
        else await useAuth.getState().refresh();
        setDone(true);
      } catch (error) { setError(error instanceof ApiClientError ? error.message : 'Please try again.'); }
      finally { setBusy(false); }
    }}>
      {error && <Notice tone="error">{error}</Notice>}
      {reset && <><Field id="new-password" label="New password" type="password" autoComplete="new-password" required minLength={10} value={password} onChange={(e) => setPassword(e.target.value)} hint="At least 10 characters." /><Field id="confirm-password" label="Confirm password" type="password" autoComplete="new-password" required minLength={10} value={confirmation} onChange={(e) => setConfirmation(e.target.value)} /></>}
      <button className="btn-primary w-full" disabled={busy}>{busy ? <Spinner className="h-4 w-4" /> : reset ? 'Update password' : 'Confirm email'}</button>
    </form>}
  </div></div>;
}
