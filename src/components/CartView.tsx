'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useCart } from '@/lib/store';
import { formatMoney } from '@/lib/format';
import { CartLine } from './CartDrawer';
import { CouponForm } from './CouponForm';
import { EmptyState, IconBag, Notice, ProductCardSkeleton, Spinner } from './ui';

/**
 * The full basket page. Same data as the drawer, with room for saved-for-later
 * items, the discount code field and a proper order summary.
 */
export function CartView() {
  const { cart, status, updateItem, removeItem, saveForLater, pendingItemId, notices, dismissNotices, error } = useCart();

  if (status === 'idle' || status === 'loading') {
    return (
      <div className="shell py-section">
        <div className="h-8 w-48 skeleton" />
        <div className="mt-10 space-y-8">
          {Array.from({ length: 2 }).map((_, i) => (
            <div key={i} className="flex gap-6">
              <div className="skeleton h-24 w-24 shrink-0" />
              <div className="flex-1 space-y-3">
                <div className="skeleton h-4 w-1/2" />
                <div className="skeleton h-3 w-1/4" />
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (status === 'error') {
    return (
      <div className="shell py-section">
        <EmptyState
          title="We could not load your basket"
          description="This is usually a connection problem rather than anything lost — your basket is saved. Refresh the page to try again."
          action={
            <button type="button" onClick={() => window.location.reload()} className="btn-primary">
              Try again
            </button>
          }
        />
      </div>
    );
  }

  const items = cart?.items ?? [];
  const saved = cart?.savedForLater ?? [];

  if (!items.length && !saved.length) {
    return (
      <div className="shell py-section">
        <EmptyState
          icon={<IconBag className="h-12 w-12" strokeWidth={0.8} />}
          title="Your basket is empty"
          description="Pieces are thrown by hand in small batches, so what is in the workshop changes. Have a look at what is available now."
          action={
            <Link href="/shop" className="btn-primary">
              Explore the collection
            </Link>
          }
        />
      </div>
    );
  }

  const totals = cart!.totals;
  // A line the shopper must fix before checkout is possible.
  const overStocked = items.some((item) => item.quantity > item.maxQuantity);

  return (
    <div className="shell py-10 lg:py-16">
      <h1 className="font-serif text-display-md text-ink-900">Your basket</h1>

      {(notices.length > 0 || error) && (
        <div className="mt-8 space-y-3">
          {error && <Notice tone="error">{error}</Notice>}
          {notices.map((notice, index) => (
            <Notice
              key={`${notice.type}-${index}`}
              tone={notice.type === 'item-removed' ? 'warning' : 'info'}
              onDismiss={dismissNotices}
            >
              {notice.message}
            </Notice>
          ))}
        </div>
      )}

      <div className="mt-10 lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-16">
        <div className="min-w-0">
          {items.length > 0 ? (
            <ul className="divide-y divide-ink-100 border-y border-ink-100">
              {items.map((item) => (
                <CartLine
                  key={item.id}
                  item={item}
                  pending={pendingItemId === item.id}
                  onQuantityChange={(qty) => void updateItem(item.id, qty)}
                  onRemove={() => void removeItem(item.id)}
                  onSaveForLater={() => void saveForLater(item.id, true)}
                />
              ))}
            </ul>
          ) : (
            <p className="border-y border-ink-100 py-10 text-center font-serif text-lg text-ink-500">
              Nothing in the basket — but you have {saved.length} piece{saved.length === 1 ? '' : 's'} saved below.
            </p>
          )}

          {saved.length > 0 && (
            <section className="mt-12">
              <h2 className="font-serif text-display-sm text-ink-900">Saved for later</h2>
              <ul className="mt-6 divide-y divide-ink-100 border-y border-ink-100">
                {saved.map((item) => (
                  <CartLine
                    key={item.id}
                    item={item}
                    compact
                    pending={pendingItemId === item.id}
                    onQuantityChange={(qty) => void updateItem(item.id, qty)}
                    onRemove={() => void removeItem(item.id)}
                    onSaveForLater={() => void saveForLater(item.id, false)}
                  />
                ))}
              </ul>
            </section>
          )}

          <Link href="/shop" className="mt-8 inline-block font-sans text-micro uppercase tracking-[0.1em] text-ink-500 underline underline-offset-4 hover:text-ink-900">
            ← Continue shopping
          </Link>
        </div>

        {/* Summary */}
        <aside className="mt-12 lg:sticky lg:top-28 lg:mt-0">
          <div className="border border-ink-100 bg-white p-6">
            <h2 className="font-serif text-lg text-ink-900">Order summary</h2>

            <dl className="mt-6 space-y-3">
              <div className="flex justify-between font-sans text-[0.875rem]">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums text-ink-900">{formatMoney(totals.subtotal)}</dd>
              </div>

              {totals.discount?.amount > 0 && (
                <div className="flex justify-between font-sans text-[0.875rem] text-success">
                  <dt>Discount{cart?.coupon && ` (${cart.coupon.code})`}</dt>
                  <dd className="tabular-nums">−{formatMoney(totals.discount)}</dd>
                </div>
              )}

              <div className="flex justify-between font-sans text-[0.875rem]">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="text-ink-500">
                  {cart?.selectedShipping ? formatMoney(totals.shipping) : 'Calculated at checkout'}
                </dd>
              </div>

              {totals.duties?.amount > 0 && (
                <div className="flex justify-between font-sans text-[0.875rem]">
                  <dt className="text-ink-500">Estimated duties</dt>
                  <dd className="tabular-nums text-ink-500">{formatMoney(totals.duties)}</dd>
                </div>
              )}

              <div className="flex justify-between border-t border-ink-100 pt-4 font-sans text-base">
                <dt className="text-ink-900">Total</dt>
                <dd className="tabular-nums text-ink-900">{formatMoney(totals.total)}</dd>
              </div>
            </dl>

            <div className="mt-6 border-t border-ink-100 pt-6">
              <CouponForm />
            </div>

            {overStocked && (
              <div className="mt-6">
                <Notice tone="warning">
                  One or more quantities are higher than we have available. Please adjust them before checking out.
                </Notice>
              </div>
            )}

            <Link
              href="/checkout"
              aria-disabled={!items.length || overStocked}
              className={`btn-primary mt-6 w-full ${!items.length || overStocked ? 'pointer-events-none opacity-45' : ''}`}
            >
              Checkout
            </Link>

            <p className="mt-4 text-center font-sans text-micro leading-relaxed text-ink-400">
              Shipping and any import duties are calculated at the next step, once you tell us where it is going.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
