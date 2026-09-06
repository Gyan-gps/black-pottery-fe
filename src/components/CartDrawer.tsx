'use client';

import Link from 'next/link';
import { useCart } from '@/lib/store';
import { formatMoney } from '@/lib/format';
import type { CartItem } from '@/lib/types';
import { EmptyState, IconBag, IconClose, Notice, Overlay, QuantityStepper, Spinner } from './ui';
import { ProductThumb } from './ProductImage';

/**
 * The basket drawer. Opens on add-to-cart so the shopper gets confirmation
 * without losing their place on the page they were browsing.
 */
export function CartDrawer() {
  const { cart, isDrawerOpen, closeDrawer, updateItem, removeItem, pendingItemId, notices, dismissNotices, error } =
    useCart();

  const items = cart?.items ?? [];
  const isEmpty = !items.length;

  return (
    <Overlay open={isDrawerOpen} onClose={closeDrawer} labelledBy="cart-drawer-title" side="right">
      <div className="flex items-center justify-between border-b border-ink-100 px-gutter py-5">
        <h2 id="cart-drawer-title" className="font-serif text-lg text-ink-900">
          Your basket
          {cart?.totals.itemCount ? <span className="ml-2 text-ink-400">({cart.totals.itemCount})</span> : null}
        </h2>
        <button type="button" onClick={closeDrawer} className="-mr-2 p-2 text-ink-500 hover:text-ink-900" aria-label="Close basket">
          <IconClose />
        </button>
      </div>

      {(notices.length > 0 || error) && (
        <div className="space-y-2 border-b border-ink-100 px-gutter py-4">
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

      <div className="min-h-0 flex-1 overflow-y-auto">
        {isEmpty ? (
          <EmptyState
            icon={<IconBag className="h-10 w-10" strokeWidth={1} />}
            title="Your basket is empty"
            description="Every piece is thrown by hand in small batches. Have a look at what is in the workshop right now."
            action={
              <Link href="/shop" onClick={closeDrawer} className="btn-primary">
                Explore the collection
              </Link>
            }
          />
        ) : (
          <ul className="divide-y divide-ink-100 px-gutter">
            {items.map((item) => (
              <CartLine
                key={item.id}
                item={item}
                pending={pendingItemId === item.id}
                onQuantityChange={(qty) => void updateItem(item.id, qty)}
                onRemove={() => void removeItem(item.id)}
                onNavigate={closeDrawer}
              />
            ))}
          </ul>
        )}
      </div>

      {!isEmpty && cart && (
        <div className="border-t border-ink-100 px-gutter py-5">
          <div className="flex items-baseline justify-between">
            <span className="font-sans text-[0.9375rem] text-ink-600">Subtotal</span>
            <span className="font-sans text-lg tabular-nums text-ink-900">{formatMoney(cart.totals.subtotal)}</span>
          </div>

          {cart.coupon && (
            <div className="mt-1.5 flex items-baseline justify-between font-sans text-[0.8125rem] text-success">
              <span>Discount ({cart.coupon.code})</span>
              <span className="tabular-nums">−{formatMoney(cart.coupon.discount)}</span>
            </div>
          )}

          {/* Shipping is quoted at checkout, where the destination is known. */}
          <p className="mt-2 font-sans text-micro text-ink-400">
            Shipping and any import duties are calculated at checkout, once you tell us where it is going.
          </p>

          <Link href="/checkout" onClick={closeDrawer} className="btn-primary mt-5 w-full">
            Checkout
          </Link>
          <Link href="/cart" onClick={closeDrawer} className="btn-ghost mt-2 w-full">
            View full basket
          </Link>
        </div>
      )}
    </Overlay>
  );
}

export function CartLine({
  item,
  pending,
  onQuantityChange,
  onRemove,
  onSaveForLater,
  onNavigate,
  compact = false,
}: {
  item: CartItem;
  pending: boolean;
  onQuantityChange: (quantity: number) => void;
  onRemove: () => void;
  onSaveForLater?: () => void;
  onNavigate?: () => void;
  compact?: boolean;
}) {
  const availability = item.availability;
  const lowStock = availability?.isLowStock && !availability.isOutOfStock;
  // The server caps the line at whatever is actually available.
  const overStock = item.quantity > item.maxQuantity;

  return (
    <li className={`flex gap-4 py-5 ${pending ? 'opacity-55' : ''}`}>
      <Link href={`/products/${item.slug}`} onClick={onNavigate} className="shrink-0" tabIndex={-1} aria-hidden="true">
        <ProductThumb image={item.image} size={compact ? 72 : 88} />
      </Link>

      <div className="min-w-0 flex-1">
        <div className="flex justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-serif text-[0.9375rem] leading-snug text-ink-900">
              <Link href={`/products/${item.slug}`} onClick={onNavigate} className="hover:underline hover:underline-offset-4">
                {item.name}
              </Link>
            </h3>
            {item.variantName && <p className="mt-0.5 font-sans text-micro text-ink-500">{item.variantName}</p>}
            <p className="mt-0.5 font-sans text-[0.6875rem] text-ink-300">{item.sku}</p>
          </div>

          <div className="shrink-0 text-right">
            <p className="font-sans text-[0.875rem] tabular-nums text-ink-900">{formatMoney(item.lineTotal)}</p>
            {item.quantity > 1 && (
              <p className="mt-0.5 font-sans text-[0.6875rem] tabular-nums text-ink-400">
                {formatMoney(item.unitPrice)} each
              </p>
            )}
          </div>
        </div>

        {(lowStock || overStock) && (
          <p className="mt-2 font-sans text-micro text-warning">
            {overStock
              ? `Only ${item.maxQuantity} available — please reduce the quantity.`
              : `Only ${availability?.available} left`}
          </p>
        )}

        <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
          <QuantityStepper
            value={item.quantity}
            max={Math.max(1, item.maxQuantity)}
            onChange={onQuantityChange}
            disabled={pending}
            label={`Quantity of ${item.name}`}
          />

          <div className="flex items-center gap-3">
            {pending && <Spinner className="h-3.5 w-3.5 text-ink-400" />}
            {onSaveForLater && (
              <button
                type="button"
                onClick={onSaveForLater}
                disabled={pending}
                className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900"
              >
                {item.savedForLater ? 'Move to basket' : 'Save for later'}
              </button>
            )}
            <button
              type="button"
              onClick={onRemove}
              disabled={pending}
              className="font-sans text-micro text-ink-400 underline underline-offset-4 hover:text-danger"
            >
              Remove
            </button>
          </div>
        </div>
      </div>
    </li>
  );
}
