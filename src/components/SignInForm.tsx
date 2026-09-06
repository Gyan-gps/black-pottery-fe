'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ApiClientError, post } from '@/lib/api';
import { useAuth, useCart, useWishlist } from '@/lib/store';
import type { User } from '@/lib/types';
import { Field, Notice, Spinner } from './ui';

/**
 * Sign in and create an account, in one screen.
 *
 * An account is optional throughout — guests can buy, save a wishlist locally and
 * track orders. This exists for people who want their addresses remembered, and
 * it says so rather than pretending an account is required.
 */
export function SignInForm() {
  const router = useRouter();
  const params = useSearchParams();
  const setSession = useAuth((s) => s.setSession);
  const loadCart = useCart((s) => s.load);
  const cartToken = useCart((s) => s.cart?.token);
  const mergeWishlist = useWishlist((s) => s.mergeIntoAccount);

  const [mode, setMode] = useState<'sign-in' | 'register'>('sign-in');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  const next = params.get('next') ?? '/account';

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);
    setFieldErrors({});

    try {
      const payload =
        mode === 'register'
          ? { email: email.trim().toLowerCase(), password, firstName: firstName.trim(), cartToken }
          : { email: email.trim().toLowerCase(), password, cartToken };

      const data = await post<{ user: User; accessToken: string }>(
        mode === 'register' ? '/auth/register' : '/auth/login',
        payload,
      );

      setSession(data.user, data.accessToken);
      // Bring across anything saved as a guest before navigating away.
      await mergeWishlist();
      await loadCart();
      router.push(next);
    } catch (err) {
      setBusy(false);
      if (err instanceof ApiClientError) {
        setFieldErrors(err.fieldErrors);
        if (!Object.keys(err.fieldErrors).length) setError(err.message);
      } else {
        setError('We could not sign you in just now. Please try again in a moment.');
      }
    }
  };

  return (
    <div className="shell py-section">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-display-md text-ink-900">
          {mode === 'sign-in' ? 'Sign in' : 'Create an account'}
        </h1>
        <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-ink-500">
          {mode === 'sign-in'
            ? 'For your saved addresses, order history and wishlist. You can also check out as a guest — an account is never required.'
            : 'So your addresses and orders are here next time. You can also check out as a guest — an account is never required.'}
        </p>

        <form onSubmit={submit} noValidate className="mt-10 space-y-5">
          {error && <Notice tone="error">{error}</Notice>}

          {mode === 'register' && (
            <Field
              id="first-name"
              label="First name"
              required
              autoComplete="given-name"
              value={firstName}
              onChange={(e) => setFirstName(e.target.value)}
              error={fieldErrors.firstName}
            />
          )}

          <Field
            id="email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={fieldErrors.email}
          />

          <Field
            id="password"
            label="Password"
            type="password"
            required
            autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            hint={mode === 'register' ? 'At least 10 characters. A short phrase works well.' : undefined}
            error={fieldErrors.password}
          />

          <button type="submit" disabled={busy} className="btn-primary w-full">
            {busy ? <Spinner className="h-4 w-4" /> : mode === 'sign-in' ? 'Sign in' : 'Create account'}
          </button>
        </form>

        <div className="mt-8 flex flex-wrap items-center justify-between gap-3 border-t border-ink-100 pt-6">
          <button
            type="button"
            onClick={() => {
              setMode(mode === 'sign-in' ? 'register' : 'sign-in');
              setError(null);
              setFieldErrors({});
            }}
            className="font-sans text-micro text-ink-600 underline underline-offset-4 hover:text-ink-900"
          >
            {mode === 'sign-in' ? 'Create an account instead' : 'I already have an account'}
          </button>

          {mode === 'sign-in' && (
            <Link href="/forgot-password" className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900">
              Forgotten your password?
            </Link>
          )}
        </div>

        <p className="mt-8 font-sans text-micro leading-relaxed text-ink-400">
          Just tracking an order?{' '}
          <Link href="/orders/track" className="underline underline-offset-4 hover:text-ink-900">
            Look it up
          </Link>{' '}
          with your order number and email — no account needed.
        </p>
      </div>
    </div>
  );
}
