'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { get, post, request } from '@/lib/api';
import { useAuth, usePreferences } from '@/lib/store';
import { formatMoney, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';
import { EmptyState, IconBag, Notice, Spinner } from './ui';
import { ProductThumb } from './ProductImage';

/**
 * The account area: who you are, your addresses, and your orders.
 *
 * Deliberately small. A D2C craft brand does not need a portal; it needs a place
 * to check an order and correct an address.
 */
export function AccountView() {
  const router = useRouter();
  const { user, accessToken, status, clear } = useAuth();
  const currency = usePreferences((s) => s.currency);

  const [orders, setOrders] = useState<Order[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);

  useEffect(() => {
    if (status === 'anonymous') router.replace('/sign-in?next=/account');
  }, [status, router]);

  useEffect(() => {
    if (!accessToken) return;
    let cancelled = false;

    (async () => {
      try {
        const data = await get<Order[]>('/orders', { accessToken, currency });
        if (!cancelled) setOrders(data);
      } catch {
        if (!cancelled) setOrders([]);
      } finally {
        if (!cancelled) setLoadingOrders(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [accessToken, currency]);

  const signOut = async () => {
    try {
      await post('/auth/logout');
    } catch {
      /* Clearing local state is what matters; the cookie expires regardless. */
    }
    clear();
    router.push('/');
  };

  if (status === 'idle' || status === 'loading' || !user) {
    return (
      <div className="shell flex min-h-[60vh] items-center justify-center">
        <Spinner className="h-6 w-6 text-ink-400" />
      </div>
    );
  }

  return (
    <div className="shell py-10 lg:py-14">
      <header className="mb-12 flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="eyebrow">Your account</p>
          <h1 className="mt-3 font-serif text-display-md text-ink-900">
            {user.firstName ? `Hello, ${user.firstName}` : user.email}
          </h1>
        </div>
        <button
          type="button"
          onClick={signOut}
          className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          Sign out
        </button>
      </header>

      {!user.emailVerifiedAt && (
        <div className="mb-10">
          <Notice tone="info" title="Confirm your email">
            We sent a confirmation link to {user.email}. Confirming it means you will reliably get order updates.
          </Notice>
        </div>
      )}

      <div className="grid gap-12 lg:grid-cols-[1fr_20rem] lg:gap-16">
        {/* Orders */}
        <section aria-labelledby="orders-heading">
          <h2 id="orders-heading" className="font-serif text-display-sm text-ink-900">
            Your orders
          </h2>

          {loadingOrders ? (
            <div className="mt-6 space-y-4">
              {Array.from({ length: 2 }).map((_, i) => (
                <div key={i} className="skeleton h-28 w-full" />
              ))}
            </div>
          ) : orders.length === 0 ? (
            <div className="mt-6 border border-ink-100">
              <EmptyState
                icon={<IconBag className="h-10 w-10" strokeWidth={0.9} />}
                title="No orders yet"
                description="When you order something, it will appear here with its tracking."
                action={
                  <Link href="/shop" className="btn-primary">
                    Explore the collection
                  </Link>
                }
              />
            </div>
          ) : (
            <ul className="mt-6 space-y-4">
              {orders.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/orders/${order.orderNumber}?email=${encodeURIComponent(order.email)}`}
                    className="block border border-ink-100 bg-white p-5 transition-colors hover:border-ink-300"
                  >
                    <div className="flex flex-wrap items-baseline justify-between gap-3">
                      <span className="font-sans text-micro uppercase tracking-[0.1em] text-ink-500">
                        {order.orderNumber}
                      </span>
                      <span className="font-sans text-micro text-ink-400">{formatDate(order.placedAt)}</span>
                    </div>

                    <div className="mt-4 flex items-center gap-3">
                      <div className="flex -space-x-3">
                        {order.items.slice(0, 4).map((item) => (
                          <ProductThumb
                            key={item.id}
                            image={item.image ? { ...item.image } : null}
                            size={44}
                            className="ring-2 ring-white"
                          />
                        ))}
                      </div>
                      {order.items.length > 4 && (
                        <span className="font-sans text-micro text-ink-400">+{order.items.length - 4}</span>
                      )}
                    </div>

                    <div className="mt-4 flex flex-wrap items-baseline justify-between gap-3">
                      <span
                        className={`font-sans text-[0.8125rem] ${
                          order.status === 'delivered'
                            ? 'text-success'
                            : order.status === 'cancelled' || order.status === 'refunded'
                              ? 'text-ink-400'
                              : 'text-ink-900'
                        }`}
                      >
                        {statusLabel(order)}
                      </span>
                      <span className="font-sans text-[0.875rem] tabular-nums text-ink-900">
                        {formatMoney(order.totals.total)}
                      </span>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Details */}
        <aside className="space-y-10">
          <section aria-labelledby="details-heading">
            <h2 id="details-heading" className="eyebrow mb-4">
              Your details
            </h2>
            <dl className="space-y-3 border-t border-ink-100 pt-4 font-sans text-[0.875rem]">
              <div>
                <dt className="text-ink-400">Email</dt>
                <dd className="mt-0.5 text-ink-900">{user.email}</dd>
              </div>
              {user.phone && (
                <div>
                  <dt className="text-ink-400">Phone</dt>
                  <dd className="mt-0.5 text-ink-900">{user.phone}</dd>
                </div>
              )}
            </dl>
          </section>

          <section aria-labelledby="addresses-heading">
            <h2 id="addresses-heading" className="eyebrow mb-4">
              Saved addresses
            </h2>

            {user.addresses?.length ? (
              <ul className="space-y-4 border-t border-ink-100 pt-4">
                {user.addresses.map((address, index) => (
                  <li key={index}>
                    <address className="not-italic font-serif text-[0.9375rem] leading-relaxed text-ink-600">
                      {[address.firstName, address.lastName].filter(Boolean).join(' ')}
                      <br />
                      {address.line1}
                      <br />
                      {[address.city, address.region, address.postalCode].filter(Boolean).join(' ')}
                      <br />
                      {address.countryCode}
                    </address>
                    {index === (user.defaultShippingAddressIndex ?? 0) && (
                      <span className="mt-1 inline-block font-sans text-[0.625rem] uppercase tracking-[0.1em] text-ink-400">
                        Default
                      </span>
                    )}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="border-t border-ink-100 pt-4 font-sans text-[0.875rem] leading-relaxed text-ink-400">
                No addresses saved yet. The address you use at your next checkout will be kept here.
              </p>
            )}
          </section>

          <section aria-labelledby="links-heading">
            <h2 id="links-heading" className="eyebrow mb-4">
              Elsewhere
            </h2>
            <ul className="space-y-2 border-t border-ink-100 pt-4">
              <li>
                <Link href="/wishlist" className="font-sans text-[0.875rem] text-ink-600 hover:text-ink-900">
                  Your wishlist
                </Link>
              </li>
              <li>
                <Link href="/returns" className="font-sans text-[0.875rem] text-ink-600 hover:text-ink-900">
                  Returns policy
                </Link>
              </li>
              <li>
                <a
                  href="mailto:hello@nizamabadblackpottery.com"
                  className="font-sans text-[0.875rem] text-ink-600 hover:text-ink-900"
                >
                  Contact us
                </a>
              </li>
            </ul>
          </section>
        </aside>
      </div>
    </div>
  );
}

function statusLabel(order: Order): string {
  if (order.status === 'cancelled') return 'Cancelled';
  if (order.status === 'refunded') return 'Refunded';
  if (order.status === 'delivered') return 'Delivered';
  if (order.status === 'shipped') return 'On its way';
  if (order.paymentStatus === 'paid' || order.paymentStatus === 'cod-pending') return 'Being packed';
  if (order.canRetryPayment) return 'Payment incomplete';
  return 'Processing';
}
