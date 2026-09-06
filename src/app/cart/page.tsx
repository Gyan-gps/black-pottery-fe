import type { Metadata } from 'next';
import { CartView } from '@/components/CartView';

export const metadata: Metadata = {
  title: 'Your Basket',
  // A basket is per-shopper and worthless in an index.
  robots: { index: false, follow: true },
};

export default function CartPage() {
  return <CartView />;
}
