import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

export const metadata: Metadata = { robots: { index: false, follow: false } };

/**
 * The link in the payment-failed email. It exists so that email can point at a
 * clean, permanent URL; the settlement screen does the actual work.
 */
export default async function RetryPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const [{ orderNumber }, { email }] = await Promise.all([params, searchParams]);
  const query = new URLSearchParams({ order: orderNumber });
  if (email) query.set('email', email);
  redirect(`/checkout/processing?${query}`);
}
