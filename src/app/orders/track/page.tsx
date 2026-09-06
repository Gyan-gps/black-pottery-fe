import type { Metadata } from 'next';
import { OrderTracker } from '@/components/OrderTracker';

export const metadata: Metadata = {
  title: 'Track an Order',
  description: 'Look up your Nizamabad Black Pottery order with your order number and email address.',
  robots: { index: true, follow: true },
};

export default function TrackOrderPage() {
  return <OrderTracker />;
}
