import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentProcessing } from '@/components/PaymentProcessing';
import { Spinner } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Confirming your payment',
  robots: { index: false, follow: false },
};

export default function ProcessingPage() {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[70vh] items-center justify-center">
          <Spinner className="h-8 w-8 text-ink-400" />
        </div>
      }
    >
      <PaymentProcessing />
    </Suspense>
  );
}
