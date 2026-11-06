import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountTokenForm } from '@/components/AccountTokenForm';
export const metadata: Metadata = { title: 'Confirm your email', robots: { index: false, follow: false } };
export default function Page() { return <Suspense><AccountTokenForm mode="verify" /></Suspense>; }
