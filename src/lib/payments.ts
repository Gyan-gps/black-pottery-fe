import { post } from './api';
import type { PaymentMethod } from './types';

export type PaymentProvider = PaymentMethod['provider'];
export type PaymentAttempt = {
  provider: PaymentProvider;
  status: string;
  clientSecret: string | null;
  redirectUrl: string | null;
};

export function paymentProvider(value: string | null): PaymentProvider | undefined {
  return value === 'phonepe' || value === 'stripe' || value === 'cod' ? value : undefined;
}

export function defaultPaymentProvider(methods: PaymentMethod[]): PaymentProvider | null {
  return methods.find((method) => method.provider === 'phonepe')?.provider ?? methods[0]?.provider ?? null;
}

export function processingPath(orderNumber: string, email: string, provider?: PaymentProvider, clientSecret?: string | null) {
  const query = new URLSearchParams({ order: orderNumber, email: email.trim().toLowerCase() });
  if (provider) query.set('provider', provider);
  if (clientSecret) query.set('cs', clientSecret);
  return `/checkout/processing?${query}`;
}

/** Both initial checkout and retry use the same provider and guest return context. */
export function startOrderPayment({ orderNumber, email, provider, currency, origin }: {
  orderNumber: string; email: string; provider?: PaymentProvider; currency: string; origin: string;
}) {
  return post<PaymentAttempt>(
    `/checkout/orders/${encodeURIComponent(orderNumber)}/payment?email=${encodeURIComponent(email.trim().toLowerCase())}`,
    { provider, returnUrl: `${origin}${processingPath(orderNumber, email, provider)}` },
    { currency },
  );
}

export function paymentDestination(payment: PaymentAttempt, orderNumber: string, email: string) {
  if (payment.redirectUrl) {
    const url = new URL(payment.redirectUrl);
    if (payment.provider !== 'phonepe' || url.protocol !== 'https:' ||
        !(url.hostname === 'phonepe.com' || url.hostname.endsWith('.phonepe.com'))) {
      throw new Error('We could not open the secure payment page. Please try again.');
    }
    return { external: true, url: url.href };
  }
  // A redirect return or a pending API response never means payment succeeded.
  // Processing polls the backend before it opens the order confirmation page.
  return { external: false, url: processingPath(orderNumber, email, payment.provider, payment.clientSecret) };
}
