import type { Metadata } from 'next';
import { AccountView } from '@/components/AccountView';

export const metadata: Metadata = {
  title: 'Your Account',
  robots: { index: false, follow: false },
};

export default function AccountPage() {
  return <AccountView />;
}
