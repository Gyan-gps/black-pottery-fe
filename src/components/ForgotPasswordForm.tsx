'use client';

import { useState } from 'react';
import Link from 'next/link';
import { post } from '@/lib/api';
import { Field, IconCheck, Notice, Spinner } from './ui';

/**
 * Password reset request.
 *
 * The confirmation is deliberately identical whether or not an account exists —
 * this endpoint must not become a way to check who has an account here.
 */
export function ForgotPasswordForm() {
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await post('/auth/forgot-password', { email: email.trim().toLowerCase() });
      setSent(true);
    } catch {
      setError('We could not send that just now. Please try again in a moment.');
    } finally {
      setBusy(false);
    }
  };

  if (sent) {
    return (
      <div className="shell py-section">
        <div className="mx-auto max-w-md text-center">
          <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
            <IconCheck className="h-7 w-7" strokeWidth={1.5} />
          </span>
          <h1 className="font-serif text-display-md text-ink-900">Check your email</h1>
          <p className="mt-5 font-serif text-[1.0625rem] leading-relaxed text-ink-500">
            If an account exists for <span className="text-ink-900">{email}</span>, we have sent a link to reset the
            password. It expires in an hour.
          </p>
          <p className="mt-6 font-sans text-micro leading-relaxed text-ink-400">
            Nothing arrived? Check your spam folder, or write to{' '}
            <a href="mailto:hello@nizamabadblackpottery.com" className="underline underline-offset-4">
              hello@nizamabadblackpottery.com
            </a>
            .
          </p>
          <Link href="/sign-in" className="btn-secondary mt-10">
            Back to sign in
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="shell py-section">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-display-md text-ink-900">Reset your password</h1>
        <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-ink-500">
          Enter the email you signed up with and we will send you a link.
        </p>

        <form onSubmit={submit} noValidate className="mt-10 space-y-5">
          {error && <Notice tone="error">{error}</Notice>}

          <Field
            id="reset-email"
            label="Email"
            type="email"
            required
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />

          <button type="submit" disabled={busy || !email.trim()} className="btn-primary w-full">
            {busy ? <Spinner className="h-4 w-4" /> : 'Send reset link'}
          </button>
        </form>

        <p className="mt-8 font-sans text-micro text-ink-400">
          Remembered it?{' '}
          <Link href="/sign-in" className="underline underline-offset-4 hover:text-ink-900">
            Sign in
          </Link>
        </p>
      </div>
    </div>
  );
}
