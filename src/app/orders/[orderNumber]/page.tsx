import type { Metadata } from 'next';
import Link from 'next/link';
import { get } from '@/lib/api';
import { storefrontContext } from '@/lib/server';
import { formatMoney, formatDate, formatDeliveryWindow, formatRelative } from '@/lib/format';
import type { Order } from '@/lib/types';
import { ProductThumb } from '@/components/ProductImage';
import { EmptyState, IconCheck, IconTruck, Notice } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Your order',
  robots: { index: false, follow: false },
};

/**
 * Order status and tracking.
 *
 * The stage indicator is derived from the order's own state rather than stored as
 * display text, so it can never claim "Delivered" while the shipment says
 * otherwise.
 */

const STAGES = [
  { key: 'confirmed', label: 'Confirmed' },
  { key: 'processing', label: 'Being packed' },
  { key: 'shipped', label: 'On its way' },
  { key: 'delivered', label: 'Delivered' },
] as const;

const stageIndex = (status: Order['status']) => {
  const map: Record<string, number> = { pending: -1, confirmed: 0, processing: 1, shipped: 2, delivered: 3 };
  return map[status] ?? -1;
};

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ email?: string }>;
}) {
  const [{ orderNumber }, { email }, context] = await Promise.all([params, searchParams, storefrontContext()]);

  let order: Order | null = null;
  try {
    order = await get<Order>(
      `/orders/${encodeURIComponent(orderNumber)}${email ? `?email=${encodeURIComponent(email)}` : ''}`,
      { ...context, revalidate: false },
    );
  } catch {
    order = null;
  }

  if (!order) {
    return (
      <div className="shell py-section">
        <EmptyState
          title="We could not open that order"
          description="For your security, an order can only be viewed with the email address it was placed with. Look it up with both and we will show you where it is."
          action={
            <Link href="/orders/track" className="btn-primary">
              Look up an order
            </Link>
          }
        />
      </div>
    );
  }

  const current = stageIndex(order.status);
  const cancelled = order.status === 'cancelled' || order.status === 'refunded';
  const shipment = order.shipments?.[0];

  return (
    <div className="shell py-12 lg:py-16">
      <div className="mx-auto max-w-3xl">
        <header>
          <p className="eyebrow">Order {order.orderNumber}</p>
          <h1 className="mt-3 font-serif text-display-md text-ink-900">
            {cancelled
              ? order.status === 'refunded'
                ? 'This order was refunded'
                : 'This order was cancelled'
              : order.status === 'delivered'
                ? 'Delivered'
                : order.status === 'shipped'
                  ? 'On its way to you'
                  : order.paymentStatus === 'paid' || order.paymentStatus === 'cod-pending'
                    ? 'We are packing your order'
                    : 'Awaiting payment'}
          </h1>
          <p className="mt-3 font-sans text-[0.875rem] text-ink-500">Placed {formatDate(order.placedAt)}</p>
        </header>

        {order.canRetryPayment && (
          <div className="mt-8">
            <Notice tone="warning" title="Payment not completed">
              Your pieces are still held.{' '}
              <Link
                href={`/checkout/processing?order=${order.orderNumber}&email=${encodeURIComponent(order.email)}`}
                className="underline underline-offset-4"
              >
                Complete payment
              </Link>
            </Notice>
          </div>
        )}

        {/* Progress */}
        {!cancelled && current >= 0 && (
          <ol className="mt-10 grid grid-cols-4 gap-2" aria-label="Order progress">
            {STAGES.map((stage, index) => {
              const done = index <= current;
              return (
                <li key={stage.key} className="min-w-0">
                  <span
                    className={`block h-1 ${done ? 'bg-ink-900' : 'bg-ink-200'}`}
                    aria-hidden="true"
                  />
                  <span
                    className={`mt-3 flex items-center gap-1.5 font-sans text-micro ${done ? 'text-ink-900' : 'text-ink-300'}`}
                  >
                    {done && <IconCheck className="h-3 w-3 shrink-0" />}
                    <span className="truncate">{stage.label}</span>
                  </span>
                  <span className="sr-only">{done ? 'Complete' : 'Not yet'}</span>
                </li>
              );
            })}
          </ol>
        )}

        {/* Tracking */}
        {shipment && (
          <div className="mt-10 border border-ink-100 bg-white">
            <div className="flex flex-wrap items-start justify-between gap-4 border-b border-ink-100 p-5">
              <div className="flex items-start gap-3">
                <IconTruck className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
                <div>
                  <p className="font-sans text-[0.9375rem] text-ink-900">
                    {shipment.carrier}
                    {shipment.trackingNumber && (
                      <span className="ml-2 font-mono text-[0.8125rem] tracking-wide text-ink-500">
                        {shipment.trackingNumber}
                      </span>
                    )}
                  </p>
                  {shipment.estimatedDeliveryFrom && shipment.estimatedDeliveryTo && !shipment.deliveredAt && (
                    <p className="mt-1 font-sans text-micro text-ink-500">
                      Estimated arrival{' '}
                      {formatDeliveryWindow(shipment.estimatedDeliveryFrom, shipment.estimatedDeliveryTo)}
                    </p>
                  )}
                  {shipment.deliveredAt && (
                    <p className="mt-1 font-sans text-micro text-success">
                      Delivered {formatDate(shipment.deliveredAt)}
                    </p>
                  )}
                </div>
              </div>

              {shipment.trackingUrl && (
                <a href={shipment.trackingUrl} target="_blank" rel="noopener noreferrer" className="btn-secondary btn-sm">
                  Track with {shipment.carrier}
                </a>
              )}
            </div>

            {shipment.events.length > 0 && (
              <ol className="divide-y divide-ink-100">
                {shipment.events.map((event, index) => (
                  <li key={`${event.at}-${index}`} className="flex items-start gap-4 p-5">
                    <span
                      className={`mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full ${index === 0 ? 'bg-ink-900' : 'bg-ink-300'}`}
                      aria-hidden="true"
                    />
                    <div className="min-w-0 flex-1">
                      <p className="font-sans text-[0.875rem] text-ink-900">{event.description}</p>
                      <p className="mt-0.5 font-sans text-micro text-ink-400">
                        {event.location && `${event.location} · `}
                        {formatRelative(event.at)}
                      </p>
                    </div>
                  </li>
                ))}
              </ol>
            )}
          </div>
        )}

        {/* Timeline */}
        {order.timeline.length > 0 && !shipment && (
          <ol className="mt-10 divide-y divide-ink-100 border-y border-ink-100">
            {order.timeline.map((entry, index) => (
              <li key={index} className="flex items-start gap-4 py-4">
                <span className="mt-1.5 h-1.5 w-1.5 shrink-0 rounded-full bg-ink-300" aria-hidden="true" />
                <div>
                  <p className="font-sans text-[0.875rem] text-ink-900">{entry.message}</p>
                  <p className="mt-0.5 font-sans text-micro text-ink-400">{formatRelative(entry.at)}</p>
                </div>
              </li>
            ))}
          </ol>
        )}

        {/* Items */}
        <div className="mt-12 border-t border-ink-100 pt-8">
          <h2 className="font-serif text-display-sm text-ink-900">Your order</h2>

          <ul className="mt-6 divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <ProductThumb image={item.image ? { ...item.image } : null} size={72} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link
                    href={`/products/${item.slug}`}
                    className="font-serif text-[0.9375rem] text-ink-900 hover:underline hover:underline-offset-4"
                  >
                    {item.name}
                  </Link>
                  <p className="mt-1 font-sans text-micro text-ink-400">Quantity {item.quantity}</p>
                </div>
                <p className="shrink-0 font-sans text-[0.875rem] tabular-nums text-ink-900">
                  {formatMoney(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <div className="mt-6 flex items-baseline justify-between border-t border-ink-100 pt-4">
            <span className="font-sans text-base text-ink-900">Total</span>
            <span className="font-serif text-xl tabular-nums text-ink-900">{formatMoney(order.totals.total)}</span>
          </div>

          {order.totals.refunded && order.totals.refunded.amount > 0 && (
            <p className="mt-2 text-right font-sans text-[0.875rem] text-success">
              {formatMoney(order.totals.refunded)} refunded
            </p>
          )}
        </div>

        <div className="mt-12 border-t border-ink-100 pt-8">
          <p className="font-sans text-micro leading-relaxed text-ink-400">
            Something not right? Reply to your confirmation email, or write to{' '}
            <a href="mailto:hello@nizamabadblackpottery.com" className="underline underline-offset-4">
              hello@nizamabadblackpottery.com
            </a>{' '}
            quoting {order.orderNumber}. If a piece arrived damaged, send a photograph within 48 hours and we will
            replace or refund it.
          </p>
        </div>
      </div>
    </div>
  );
}
