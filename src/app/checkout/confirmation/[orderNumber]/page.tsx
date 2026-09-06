import type { Metadata } from 'next';
import Link from 'next/link';
import { get } from '@/lib/api';
import { storefrontContext } from '@/lib/server';
import { formatMoney, formatDeliveryWindow, formatDate } from '@/lib/format';
import type { Order } from '@/lib/types';
import { ProductThumb } from '@/components/ProductImage';
import { ClearCartOnMount } from '@/components/ClearCartOnMount';
import { EmptyState, IconCheck, IconTruck, Notice } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Order confirmed',
  robots: { index: false, follow: false },
};

/**
 * The post-purchase page.
 *
 * Answers the four questions a customer has the moment they have paid: did it
 * work, what did I buy, where is it going, and when will it arrive. Rendered on
 * the server so the details are correct on first paint.
 */
export default async function ConfirmationPage({
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
          description="For your security we need the email address the order was placed with. You can look it up with your order number and email."
          action={
            <Link href="/orders/track" className="btn-primary">
              Look up an order
            </Link>
          }
        />
      </div>
    );
  }

  const isCod = order.paymentStatus === 'cod-pending';
  const paid = order.paymentStatus === 'paid' || isCod;
  const shipping = order.shippingMethod;

  return (
    <div className="shell py-12 lg:py-20">
      {/* Emptying the basket is a client concern; the page itself stays static. */}
      {paid && <ClearCartOnMount />}

      <div className="mx-auto max-w-3xl">
        <div className="text-center">
          {paid && (
            <span className="mx-auto mb-8 flex h-14 w-14 items-center justify-center rounded-full bg-success/10 text-success">
              <IconCheck className="h-7 w-7" strokeWidth={1.5} />
            </span>
          )}

          <h1 className="font-serif text-display-md text-ink-900">
            {paid ? 'Thank you for your order' : 'Your order is saved'}
          </h1>

          <p className="mt-4 font-serif text-lg leading-relaxed text-ink-500">
            {isCod ? (
              <>
                We have sent a confirmation to <span className="text-ink-900">{order.email}</span>. Please keep{' '}
                <span className="text-ink-900">{formatMoney(order.totals.total)}</span> ready in cash for the carrier —
                each piece is checked by hand before it is packed, which usually takes one to two working days.
              </>
            ) : paid ? (
              <>
                We have sent a confirmation to <span className="text-ink-900">{order.email}</span>. Each piece is checked
                by hand before it is packed, which usually takes one to two working days.
              </>
            ) : (
              <>Payment has not completed yet. Nothing has been charged and your pieces are still held.</>
            )}
          </p>

          <p className="mt-6 inline-block border border-ink-200 px-4 py-2 font-sans text-micro uppercase tracking-[0.12em] text-ink-700">
            Order {order.orderNumber}
          </p>
        </div>

        {!paid && (
          <div className="mt-10">
            <Notice tone="warning" title="Payment not completed">
              You can finish paying whenever you are ready.{' '}
              <Link
                href={`/checkout/processing?order=${order.orderNumber}&email=${encodeURIComponent(order.email)}`}
                className="underline underline-offset-4"
              >
                Complete payment
              </Link>
            </Notice>
          </div>
        )}

        {/* Delivery */}
        {shipping && (
          <div className="mt-12 flex items-start gap-4 border border-ink-100 bg-white p-5">
            <IconTruck className="mt-0.5 h-5 w-5 shrink-0 text-ink-400" />
            <div>
              <p className="font-sans text-[0.9375rem] text-ink-900">{shipping.methodName}</p>
              {shipping.estimatedDeliveryFrom && shipping.estimatedDeliveryTo && (
                <p className="mt-1 font-sans text-[0.8125rem] text-ink-500">
                  Estimated arrival{' '}
                  {formatDeliveryWindow(shipping.estimatedDeliveryFrom, shipping.estimatedDeliveryTo)}
                </p>
              )}
              {shipping.incoterm === 'DDU' && (
                <p className="mt-2 font-sans text-micro leading-relaxed text-ink-400">
                  Import duties and local taxes, where they apply, are collected by the carrier on delivery.
                </p>
              )}
            </div>
          </div>
        )}

        {/* Items */}
        <div className="mt-10 border-t border-ink-100 pt-8">
          <h2 className="font-serif text-display-sm text-ink-900">What you ordered</h2>

          <ul className="mt-6 divide-y divide-ink-100">
            {order.items.map((item) => (
              <li key={item.id} className="flex gap-4 py-4">
                <ProductThumb image={item.image ? { ...item.image } : null} size={72} className="shrink-0" />
                <div className="min-w-0 flex-1">
                  <Link href={`/products/${item.slug}`} className="font-serif text-[0.9375rem] text-ink-900 hover:underline hover:underline-offset-4">
                    {item.name}
                  </Link>
                  {item.variantName && <p className="font-sans text-micro text-ink-500">{item.variantName}</p>}
                  <p className="mt-1 font-sans text-micro text-ink-400">Quantity {item.quantity}</p>
                </div>
                <p className="shrink-0 font-sans text-[0.875rem] tabular-nums text-ink-900">
                  {formatMoney(item.lineTotal)}
                </p>
              </li>
            ))}
          </ul>

          <dl className="mt-6 space-y-2.5 border-t border-ink-100 pt-6">
            <Row label="Subtotal" value={formatMoney(order.totals.subtotal)} />
            {order.totals.discount && order.totals.discount.amount > 0 && (
              <Row
                label={`Discount${order.coupon ? ` (${order.coupon.code})` : ''}`}
                value={`−${formatMoney(order.totals.discount)}`}
                tone="success"
              />
            )}
            {order.totals.shipping && <Row label="Shipping" value={formatMoney(order.totals.shipping)} />}
            {order.totals.duties && order.totals.duties.amount > 0 && (
              <Row label="Duties" value={formatMoney(order.totals.duties)} />
            )}
            <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
              <dt className="font-sans text-base text-ink-900">Total</dt>
              <dd className="font-serif text-xl tabular-nums text-ink-900">{formatMoney(order.totals.total)}</dd>
            </div>
          </dl>
        </div>

        {/* Address */}
        <div className="mt-10 grid gap-8 border-t border-ink-100 pt-8 sm:grid-cols-2">
          <div>
            <h3 className="eyebrow mb-3">Shipping to</h3>
            <address className="not-italic font-serif text-[0.9375rem] leading-relaxed text-ink-600">
              {[order.shippingAddress.firstName, order.shippingAddress.lastName].filter(Boolean).join(' ')}
              <br />
              {order.shippingAddress.line1}
              {order.shippingAddress.line2 && (
                <>
                  <br />
                  {order.shippingAddress.line2}
                </>
              )}
              <br />
              {[order.shippingAddress.city, order.shippingAddress.region, order.shippingAddress.postalCode]
                .filter(Boolean)
                .join(' ')}
              <br />
              {order.shippingAddress.countryCode}
            </address>
          </div>

          <div>
            <h3 className="eyebrow mb-3">Order placed</h3>
            <p className="font-serif text-[0.9375rem] text-ink-600">{formatDate(order.placedAt)}</p>
          </div>
        </div>

        {/* Next steps */}
        <div className="mt-12 border-t border-ink-100 pt-8">
          <h2 className="font-serif text-display-sm text-ink-900">What happens next</h2>
          <ol className="mt-6 space-y-4">
            {[
              'We pack your pieces in cotton wrap and moulded inserts, inside a double-walled box.',
              'You get an email with tracking as soon as the parcel leaves the workshop.',
              'Please unpack over a soft surface — handmade clay is sturdy but not indestructible.',
            ].map((step, index) => (
              <li key={index} className="flex gap-4">
                <span className="font-sans text-micro tabular-nums text-ink-300">{String(index + 1).padStart(2, '0')}</span>
                <span className="font-serif text-[0.9375rem] leading-relaxed text-ink-600">{step}</span>
              </li>
            ))}
          </ol>
        </div>

        <div className="mt-12 flex flex-wrap justify-center gap-3 border-t border-ink-100 pt-8">
          <Link href={`/orders/${order.orderNumber}?email=${encodeURIComponent(order.email)}`} className="btn-secondary">
            View order status
          </Link>
          <Link href="/shop" className="btn-primary">
            Continue shopping
          </Link>
        </div>
      </div>
    </div>
  );
}

function Row({ label, value, tone }: { label: string; value: string; tone?: 'success' }) {
  return (
    <div className={`flex justify-between font-sans text-[0.875rem] ${tone === 'success' ? 'text-success' : ''}`}>
      <dt className={tone ? undefined : 'text-ink-500'}>{label}</dt>
      <dd className={`tabular-nums ${tone ? '' : 'text-ink-900'}`}>{value}</dd>
    </div>
  );
}
