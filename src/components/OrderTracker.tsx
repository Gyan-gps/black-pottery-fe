'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ApiClientError, post } from '@/lib/api';
import { usePreferences } from '@/lib/store';
import { Field, Notice, Spinner } from './ui';

/**
 * Guest order lookup: order number plus the email it was placed with.
 *
 * The API returns the same message whether the number is wrong or the email is,
 * so this cannot be used to check whether an order exists.
 */
export function OrderTracker() {
  const router = useRouter();
  const currency = usePreferences((s) => s.currency);

  const [orderNumber, setOrderNumber] = useState('');
  const [email, setEmail] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setBusy(true);
    setError(null);

    try {
      await post('/orders/lookup', { orderNumber: orderNumber.trim(), email: email.trim().toLowerCase() }, { currency });
      router.push(`/orders/${orderNumber.trim().toUpperCase()}?email=${encodeURIComponent(email.trim().toLowerCase())}`);
    } catch (err) {
      setError(
        err instanceof ApiClientError
          ? err.message
          : 'We could not look that up just now. Please try again in a moment.',
      );
      setBusy(false);
    }
  };

  return (
    <div className="shell py-section">
      <div className="mx-auto max-w-md">
        <h1 className="font-serif text-display-md text-ink-900">Track an order</h1>
        <p className="mt-4 font-serif text-[1.0625rem] leading-relaxed text-ink-500">
          Enter your order number and the email you used, and we will show you where it is.
        </p>

        <form onSubmit={submit} noValidate className="mt-10 space-y-5">
          {error && <Notice tone="error">{error}</Notice>}

          <Field
            id="track-order-number"
            label="Order number"
            required
            value={orderNumber}
            onChange={(e) => setOrderNumber(e.target.value.toUpperCase())}
            placeholder="NBP-260904-123456"
            autoComplete="off"
            hint="It is at the top of your confirmation email."
          />

          <Field
            id="track-email"
            label="Email"
            type="email"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            autoComplete="email"
          />

          <button type="submit" disabled={busy || !orderNumber.trim() || !email.trim()} className="btn-primary w-full">
            {busy ? <Spinner className="h-4 w-4" /> : 'Find my order'}
          </button>
        </form>

        <p className="mt-8 font-sans text-micro leading-relaxed text-ink-400">
          Have an account?{' '}
          <Link href="/account/orders" className="underline underline-offset-4 hover:text-ink-900">
            See all your orders
          </Link>
          . Cannot find the email? Write to{' '}
          <a href="mailto:hello@nizamabadblackpottery.com" className="underline underline-offset-4 hover:text-ink-900">
            hello@nizamabadblackpottery.com
          </a>
          .
        </p>
      </div>
    </div>
  );
}
