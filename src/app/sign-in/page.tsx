import type { Metadata } from 'next';
import { Suspense } from 'react';
import { SignInForm } from '@/components/SignInForm';
import { Spinner } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Sign In',
  robots: { index: false, follow: true },
};

export default function SignInPage() {
  return (
    <Suspense
      fallback={
        <div className="shell flex min-h-[60vh] items-center justify-center">
          <Spinner className="h-6 w-6 text-ink-400" />
        </div>
      }
    >
      <SignInForm />
    </Suspense>
  );
}
