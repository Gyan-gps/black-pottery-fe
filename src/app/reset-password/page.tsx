import { Suspense } from 'react';
import type { Metadata } from 'next';
import { AccountTokenForm } from '@/components/AccountTokenForm';
export const metadata: Metadata = { title: 'Choose a new password', robots: { index: false, follow: false } };
export default function Page() { return <Suspense><AccountTokenForm mode="reset" /></Suspense>; }
