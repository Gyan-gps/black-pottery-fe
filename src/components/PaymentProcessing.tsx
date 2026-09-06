'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { get, post, ApiClientError } from '@/lib/api';
import { useCart, usePreferences } from '@/lib/store';
import { formatMoney } from '@/lib/format';
import type { Order } from '@/lib/types';
import { IconAlert, IconCheck, Notice, Spinner } from './ui';

/**
 * The settlement screen.
 *
 * This is where a customer lands after an off-site gateway, and where an inline
 * payment confirms. Both paths need the same thing: poll our own API until the
 * order reaches a terminal state, because the webhook and the browser return
 * race each other and neither is reliably first.
 *
 * If payment failed, the order is preserved and retryable — this page never
 * dead-ends.
 */

const POLL_INTERVAL_MS = 2000;
// Roughly a minute. Beyond that, a bank redirect has almost certainly stalled.
const MAX_ATTEMPTS = 30;

type StatusResponse = {
  order: Order;
  paymentStatus: string;
  canRetryPayment: boolean;
  failureMessage: string | null;
  isSettled: boolean;
};

export function PaymentProcessing() {
  const router = useRouter();
  const params = useSearchParams();
  const currency = usePreferences((s) => s.currency);
  const loadCart = useCart((s) => s.load);

  const orderNumber = params.get('order');
  const email = params.get('email') ?? '';

  const [state, setState] = useState<'checking' | 'failed' | 'timeout' | 'missing'>('checking');
  const [result, setResult] = useState<StatusResponse | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [retryError, setRetryError] = useState<string | null>(null);
  const attempts = useRef(0);

  const query = `?email=${encodeURIComponent(email)}`;

  useEffect(() => {
    if (!orderNumber) {
      setState('missing');
      return;
    }

    let cancelled = false;
    let timer: number;

    const check = async () => {
      attempts.current += 1;

      try {
        const data = await get<StatusResponse>(`/checkout/orders/${orderNumber}/status${query}`, {
          currency,
          revalidate: false,
        });
        if (cancelled) return;

        setResult(data);

        if (data.paymentStatus === 'paid' || data.paymentStatus === 'cod-pending') {
          // The basket has been converted; refresh so the badge empties.
          void loadCart();
          router.replace(`/checkout/confirmation/${orderNumber}${query}`);
          return;
        }

        if (data.paymentStatus === 'failed' || data.paymentStatus === 'cancelled') {
          setState('failed');
          return;
        }

        if (attempts.current >= MAX_ATTEMPTS) {
          setState('timeout');
          return;
        }

        timer = window.setTimeout(check, POLL_INTERVAL_MS);
      } catch (error) {
        if (cancelled) return;
        // A transient network blip should not abandon a payment mid-flight.
        if (attempts.current >= MAX_ATTEMPTS) {
          setState('timeout');
          return;
        }
        timer = window.setTimeout(check, POLL_INTERVAL_MS);
      }
    };

    void check();

    return () => {
      cancelled = true;
      window.clearTimeout(timer);
    };
  }, [orderNumber, query, currency, router, loadCart]);

  const retry = useCallback(async () => {
    if (!orderNumber) return;
    setRetrying(true);
    setRetryError(null);

    try {
      const payment = await post<{ clientSecret: string | null; redirectUrl: string | null }>(
        `/checkout/orders/${orderNumber}/payment${query}`,
        {},
        { currency },
      );

      if (payment.redirectUrl) {
        window.location.href = payment.redirectUrl;
        return;
      }
      // Reset and poll again for an inline retry.
      attempts.current = 0;
      setState('checking');
    } catch (error) {
      setRetryError(
        error instanceof ApiClientError
          ? error.message
          : 'We could not restart the payment. Please try again in a moment.',
      );
    } finally {
      setRetrying(false);
    }
  }, [orderNumber, query, currency]);

  if (state === 'missing') {
    return (
      <Shell title="We could not find that order">
        <p className="prose-craft">
          The link seems to be incomplete. If you have an order number, you can look it up directly.
        </p>
        <div className="mt-8 flex flex-wrap gap-3">
          <Link href="/orders/track" className="btn-primary">
            Track an order
          </Link>
          <Link href="/shop" className="btn-secondary">
            Back to the shop
          </Link>
        </div>
      </Shell>
    );
  }

  if (state === 'checking') {
    return (
      <Shell title="Confirming your payment" icon={<Spinner className="h-8 w-8 text-ink-400" />}>
        <p className="prose-craft">
          This usually takes a few seconds. Please do not close this window or press back — your order{' '}
          {result?.order.orderNumber && (
            <span className="font-medium text-ink-900">{result.order.orderNumber}</span>
          )}{' '}
          is safe either way.
        </p>
      </Shell>
    );
  }

  if (state === 'failed') {
    return (
      <Shell title="Your payment did not go through" icon={<IconAlert className="h-8 w-8 text-danger" strokeWidth={1.2} />}>
        <Notice tone="error">
          {result?.failureMessage ?? 'The payment was not completed. Nothing has been charged.'}
        </Notice>

        <p className="prose-craft mt-6">
          Your order <span className="font-medium text-ink-900">{orderNumber}</span> is saved and the pieces are still
          held for you. You can try again with the same or a different method.
        </p>

        {result?.order.totals.total && (
          <p className="mt-4 font-sans text-[0.9375rem] text-ink-600">
            Amount due: <span className="tabular-nums text-ink-900">{formatMoney(result.order.totals.total)}</span>
          </p>
        )}

        {retryError && (
          <div className="mt-6">
            <Notice tone="error">{retryError}</Notice>
          </div>
        )}

        <div className="mt-8 flex flex-wrap gap-3">
          <button type="button" onClick={retry} disabled={retrying} className="btn-primary">
            {retrying ? <Spinner className="h-4 w-4" /> : 'Try payment again'}
          </button>
          <Link href="/cart" className="btn-secondary">
            Back to basket
          </Link>
        </div>

        <p className="mt-8 font-sans text-micro leading-relaxed text-ink-400">
          If this keeps happening, email{' '}
          <a href="mailto:hello@nizamabadblackpottery.com" className="underline underline-offset-4">
            hello@nizamabadblackpottery.com
          </a>{' '}
          quoting {orderNumber} and we will take the payment another way.
        </p>
      </Shell>
    );
  }

  // Timed out — genuinely unknown, so say so rather than guessing either way.
  return (
    <Shell title="This is taking longer than usual" icon={<IconAlert className="h-8 w-8 text-warning" strokeWidth={1.2} />}>
      <p className="prose-craft">
        We have not had confirmation from the payment provider yet. This does not necessarily mean it failed — payments
        sometimes settle a few minutes later.
      </p>
      <p className="prose-craft mt-4">
        Your order <span className="font-medium text-ink-900">{orderNumber}</span> is saved. Check its status below
        before trying again, so you are not charged twice.
      </p>

      <div className="mt-8 flex flex-wrap gap-3">
        <Link href={`/orders/${orderNumber}${query}`} className="btn-primary">
          Check order status
        </Link>
        <button type="button" onClick={retry} disabled={retrying} className="btn-secondary">
          {retrying ? <Spinner className="h-4 w-4" /> : 'Try payment again'}
        </button>
      </div>
    </Shell>
  );
}

function Shell({ title, icon, children }: { title: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div className="shell flex min-h-[70vh] items-center py-section">
      <div className="mx-auto max-w-xl text-center">
        {icon && <div className="mb-8 flex justify-center">{icon}</div>}
        <h1 className="font-serif text-display-md text-ink-900">{title}</h1>
        <div className="mt-6 [&_.prose-craft]:mx-auto [&_.prose-craft]:text-center">{children}</div>
      </div>
    </div>
  );
}
