'use client';

import { useState } from 'react';
import { loadStripe } from '@stripe/stripe-js';
import { Elements, PaymentElement, useElements, useStripe } from '@stripe/react-stripe-js';
import { Notice, Spinner } from './ui';

const key = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY;
const stripePromise = key ? loadStripe(key) : null;

export function StripePaymentForm({ clientSecret, returnUrl, onConfirmed }: { clientSecret: string; returnUrl: string; onConfirmed: () => void }) {
  if (!stripePromise) return <Notice tone="error">Card payments are unavailable. Please contact us with your order number.</Notice>;
  return <Elements stripe={stripePromise} options={{ clientSecret }}><PaymentForm returnUrl={returnUrl} onConfirmed={onConfirmed} /></Elements>;
}

function PaymentForm({ returnUrl, onConfirmed }: { returnUrl: string; onConfirmed: () => void }) {
  const stripe = useStripe();
  const elements = useElements();
  const [busy, setBusy] = useState(false);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  return <form className="mt-8 space-y-5 text-left" onSubmit={async (event) => {
    event.preventDefault();
    if (!stripe || !elements || busy) return;
    setBusy(true); setError(null);
    try {
      const result = await stripe.confirmPayment({ elements, confirmParams: { return_url: returnUrl }, redirect: 'if_required' });
      if (result.error) setError(result.error.message ?? 'Payment could not be completed. Please check your details.');
      else onConfirmed();
    } catch {
      setError('We could not confirm the payment. Please check your connection and try again.');
    } finally { setBusy(false); }
  }}>
    <PaymentElement onReady={() => setReady(true)} onLoadError={() => setError('The payment form could not load. Please refresh this page.')} />
    {error && <Notice tone="error">{error}</Notice>}
    <button className="btn-primary w-full" disabled={!stripe || !elements || !ready || busy}>{busy ? <Spinner className="h-4 w-4" /> : 'Confirm payment'}</button>
  </form>;
}
