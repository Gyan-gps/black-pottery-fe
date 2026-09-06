import type { Metadata } from 'next';
import { CheckoutFlow } from '@/components/CheckoutFlow';

export const metadata: Metadata = {
  title: 'Checkout',
  // Checkout is per-shopper and must never be indexed.
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return <CheckoutFlow />;
}
