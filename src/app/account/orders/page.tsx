import { redirect } from 'next/navigation';

/** Orders live on the account page itself; this keeps the obvious URL working. */
export default function AccountOrdersPage() {
  redirect('/account');
}
