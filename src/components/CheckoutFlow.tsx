'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import { ApiClientError, get, post } from '@/lib/api';
import { useAuth, useCart, usePreferences } from '@/lib/store';
import { formatMoney, formatDeliveryWindow, formatDeliveryDays } from '@/lib/format';
import type { Address, Country, PaymentMethod, ShippingOption, ShippingQuote } from '@/lib/types';
import { defaultPaymentProvider, paymentDestination, startOrderPayment } from '@/lib/payments';
import { PaymentMethods } from './PaymentMethods';
import { AddressForm } from './AddressForm';
import { CouponForm } from './CouponForm';
import { ProductThumb } from './ProductImage';
import { EmptyState, Field, IconBag, IconCheck, IconTruck, LiveRegion, Notice, Spinner } from './ui';

/**
 * Checkout.
 *
 * One page, three sections — address, delivery, payment — rather than three
 * separate pages. A shopper can see the whole commitment at once, and a mistake
 * in the address does not cost them a page load to fix.
 *
 * Nothing here computes money. Every total comes back from the server after each
 * change, so what is displayed is always what will be charged.
 */

type Step = 'address' | 'delivery' | 'payment';

export function CheckoutFlow() {
  const router = useRouter();
  const { cart, status, load: loadCart, setDestination, selectShipping } = useCart();
  const user = useAuth((s) => s.user);
  const authStatus = useAuth((s) => s.status);
  const currency = usePreferences((s) => s.currency);

  const [countries, setCountries] = useState<Country[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<PaymentMethod[]>([]);

  const [email, setEmail] = useState('');
  const [address, setAddress] = useState<Partial<Address>>({});
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [step, setStep] = useState<Step>('address');

  const [shippingQuote, setShippingQuote] = useState<ShippingQuote | null>(null);
  const [shippingError, setShippingError] = useState<string | null>(null);
  const [loadingShipping, setLoadingShipping] = useState(false);
  const [validatingAddress, setValidatingAddress] = useState(false);
  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);

  const [provider, setProvider] = useState<PaymentMethod['provider'] | null>(null);
  const [placing, setPlacing] = useState(false);
  const [orderError, setOrderError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [isGift, setIsGift] = useState(false);
  const [giftMessage, setGiftMessage] = useState('');
  const [customerNote, setCustomerNote] = useState('');
  const [pendingOrder, setPendingOrder] = useState<string | null>(null);

  const refreshPaymentMethods = async () => {
    const session = await get<{ paymentMethods: PaymentMethod[] }>('/checkout/session', { currency, revalidate: false });
    const methods = (session.paymentMethods ?? []).filter((method) =>
      method.provider !== 'stripe' || Boolean(process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY));
    setPaymentMethods(methods);
    setProvider((current) => current && methods.some((m) => m.provider === current) ? current : defaultPaymentProvider(methods));
    return methods;
  };

  // ── Boot ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (authStatus === 'idle' || authStatus === 'loading') return;
    (async () => {
      try {
        await loadCart();
        setCountries(await get<Country[]>('/geo/countries'));
      } catch {
        /* Handled by the per-section error states below. */
      }
    })();
  }, [loadCart, currency, authStatus]);

  // Prefill from the signed-in customer's saved details.
  useEffect(() => {
    if (!user) return;
    setEmail((current) => current || user.email);
    const saved = user.addresses?.[user.defaultShippingAddressIndex ?? 0];
    if (saved) setAddress((current) => (Object.keys(current).length ? current : saved));
  }, [user]);

  // ── Shipping ──────────────────────────────────────────────────────────────
  const fetchShipping = async (destination: Address) => {
    const { countryCode, regionCode, postalCode } = destination;
    setLoadingShipping(true);
    setShippingError(null);
    try {
      setSelectedMethod(null);
      await setDestination(countryCode, regionCode, postalCode);
      if (useCart.getState().error) throw new Error(useCart.getState().error!);
      const quote = await get<ShippingQuote>('/cart/shipping-options', { currency, country: countryCode });
      setShippingQuote(quote);

      if (!quote.options.length) {
        setShippingError(quote.reason ?? 'No delivery service covers this address.');
        setOrderError(quote.reason ?? 'No delivery service covers this address.');
        return;
      }
      // Default to the cheapest, which is what most people choose anyway.
      const cheapest = quote.options[0];
      const selected = await selectShipping(cheapest.methodCode);
      if (!selected.ok) throw new Error(selected.error);
      setSelectedMethod(cheapest.methodCode);
      await refreshPaymentMethods();
      return true;
    } catch (error) {
      setShippingQuote(null);
      setOrderError(error instanceof Error ? error.message : 'We could not work out shipping. Please try again.');
      setShippingError(
        error instanceof ApiClientError
          ? error.message
          : 'We could not work out shipping for that address. Please check it and try again.',
      );
      return false;
    } finally {
      setLoadingShipping(false);
    }
  };

  const submitAddress = async (event: React.FormEvent) => {
    event.preventDefault();
    if (validatingAddress || loadingShipping) return;
    setFieldErrors({});
    setOrderError(null);

    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim())) {
      setFieldErrors({ email: 'Please enter a valid email address for your order confirmation.' });
      return;
    }

    setValidatingAddress(true);
    try {
      // The server validates the address against its own country rules; the
      // browser's checks are a convenience, not the authority.
      const validated = await post<{ address: Address }>('/checkout/validate-address', address, { currency });
      setAddress(validated.address);
      if (!await fetchShipping(validated.address)) return;
      setStep('delivery');
      setAnnouncement('Address saved. Choose a delivery method.');
    } catch (error) {
      if (error instanceof ApiClientError) {
        setFieldErrors(error.fieldErrors);
        if (!Object.keys(error.fieldErrors).length) setOrderError(error.message);
      } else {
        setOrderError('We could not check that address. Please try again.');
      }
    } finally {
      setValidatingAddress(false);
    }
  };

  const chooseMethod = async (option: ShippingOption) => {
    setLoadingShipping(true);
    setShippingError(null);
    const result = await selectShipping(option.methodCode);
    if (!result.ok) {
      setShippingError(result.error ?? null);
      setLoadingShipping(false);
      return;
    }
    setSelectedMethod(option.methodCode);

    // Some payment methods (Cash on Delivery) are only offered for certain
    // delivery speeds, so re-fetch the list now that the method has changed.
    try {
      await refreshPaymentMethods();
    } catch {
      setPaymentMethods([]);
      setShippingError('We could not load payment options. Please choose delivery again.');
    } finally {
      setLoadingShipping(false);
    }
  };

  // ── Placing the order ─────────────────────────────────────────────────────
  const placeOrder = async () => {
    if (placing) return;
    let createdOrderNumber = pendingOrder;
    setPlacing(true);
    setOrderError(null);
    setFieldErrors({});

    try {
      const chosenProvider = provider ?? defaultPaymentProvider(paymentMethods);
      const available = await refreshPaymentMethods();
      if (!chosenProvider || !available.some((method) => method.provider === chosenProvider)) {
        throw new Error('That payment method is no longer available. Please choose another method.');
      }
      const created = pendingOrder ? null : await post<{ order: { orderNumber: string }; paymentMethods: PaymentMethod[] }>(
        '/checkout/orders',
        {
          email: email.trim().toLowerCase(),
          shippingAddress: address,
          billingSameAsShipping: true,
          customerNote: customerNote.trim() || undefined,
          isGift,
          giftMessage: isGift ? giftMessage.trim() || undefined : undefined,
        },
        { currency },
      );

      const orderNumber = pendingOrder ?? created!.order.orderNumber;
      createdOrderNumber = orderNumber;
      setPendingOrder(orderNumber);
      if (chosenProvider === 'phonepe') setAnnouncement('Opening secure PhonePe checkout…');
      const payment = await startOrderPayment({ orderNumber, email, provider: chosenProvider, currency, origin: window.location.origin });
      const destination = paymentDestination(payment, orderNumber, email);

      // An off-site gateway (PhonePe) hands back a URL; an inline one (Stripe)
      // hands back a client secret. The processing page handles both.
      if (destination.external) {
        window.location.assign(destination.url);
        return;
      }
      router.push(destination.url);
    } catch (error) {
      setPlacing(false);
      if (error instanceof ApiClientError) {
        setFieldErrors(error.fieldErrors);
        setOrderError(error.message);
        if (createdOrderNumber) router.push(`/checkout/retry/${createdOrderNumber}?${new URLSearchParams({ email: email.trim().toLowerCase(), ...(provider ? { provider } : {}) })}`);
        // A stock or shipping problem means the cart has moved under us.
        if (['INSUFFICIENT_STOCK', 'OUT_OF_STOCK', 'PRODUCT_UNAVAILABLE'].includes(error.code)) {
          await loadCart();
          setStep('address');
        }
      } else {
        setOrderError(error instanceof Error ? error.message : 'We could not place your order. Please try again.');
        if (createdOrderNumber) router.push(`/checkout/retry/${createdOrderNumber}?${new URLSearchParams({ email: email.trim().toLowerCase(), ...(provider ? { provider } : {}) })}`);
      }
    }
  };

  // ── Render ────────────────────────────────────────────────────────────────
  if (status === 'error') return <div className="shell py-section"><Notice tone="error">We could not load your basket.</Notice><button className="btn-primary mt-6" onClick={() => void loadCart()}>Try again</button></div>;
  if (status === 'idle' || status === 'loading') {
    return (
      <div className="shell py-section">
        <div className="skeleton h-8 w-40" />
        <div className="mt-10 grid gap-10 lg:grid-cols-[1fr_22rem]">
          <div className="space-y-4">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="skeleton h-11 w-full" />
            ))}
          </div>
          <div className="skeleton h-64 w-full" />
        </div>
      </div>
    );
  }

  if (!cart || cart.isEmpty) {
    return (
      <div className="shell py-section">
        <EmptyState
          icon={<IconBag className="h-12 w-12" strokeWidth={0.8} />}
          title="There is nothing to check out"
          description="Your basket is empty. Once you have chosen a piece, this is where you will tell us where to send it."
          action={
            <Link href="/shop" className="btn-primary">
              Explore the collection
            </Link>
          }
        />
      </div>
    );
  }

  const totals = cart.totals;
  const selectedProvider = provider ?? defaultPaymentProvider(paymentMethods);
  const canContinue = Boolean(selectedMethod && cart.selectedShipping && !loadingShipping && !shippingError);
  const canPay = Boolean(canContinue && selectedProvider && paymentMethods.some((method) => method.provider === selectedProvider));

  return (
    <div className="shell py-10 lg:py-14">
      <LiveRegion message={announcement} />

      <div className="mb-10 flex items-baseline justify-between gap-6">
        <h1 className="font-serif text-display-md text-ink-900">Checkout</h1>
        <Link href="/cart" className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900">
          Back to basket
        </Link>
      </div>

      <div className="lg:grid lg:grid-cols-[1fr_22rem] lg:items-start lg:gap-16">
        <div className="min-w-0 space-y-10">
          {orderError && <Notice tone="error">{orderError}</Notice>}

          {/* ── 1. Contact and address ─────────────────────────────────────── */}
          <section aria-labelledby="address-heading">
            <SectionHeading
              number={1}
              id="address-heading"
              title="Where is it going?"
              complete={step !== 'address'}
              onEdit={step !== 'address' ? () => setStep('address') : undefined}
            />

            {step === 'address' ? (
              <form onSubmit={submitAddress} noValidate className="mt-6 space-y-6">
                <div>
                  <Field
                    id="checkout-email"
                    label="Email"
                    type="email"
                    required
                    autoComplete="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    hint="Your order confirmation and tracking go here."
                    error={fieldErrors.email}
                  />
                  {!user && (
                    <p className="mt-2 font-sans text-micro text-ink-400">
                      Checking out as a guest.{' '}
                      <Link href="/sign-in?next=/checkout" className="underline underline-offset-4 hover:text-ink-900">
                        Sign in
                      </Link>{' '}
                      to use a saved address.
                    </p>
                  )}
                </div>

                <AddressForm value={address} onChange={setAddress} countries={countries} errors={fieldErrors} />

                <button type="submit" disabled={validatingAddress || loadingShipping} className="btn-primary w-full sm:w-auto">
                  {validatingAddress || loadingShipping ? 'Checking delivery…' : 'Continue to delivery'}
                </button>
              </form>
            ) : (
              <address className="mt-4 not-italic font-serif text-[0.9375rem] leading-relaxed text-ink-600">
                {email}
                <br />
                {[address.firstName, address.lastName].filter(Boolean).join(' ')}
                <br />
                {address.line1}
                {address.line2 && <>, {address.line2}</>}
                <br />
                {[address.city, address.region, address.postalCode].filter(Boolean).join(' ')}
                <br />
                {countries.find((c) => c.code === address.countryCode)?.name ?? address.countryCode}
              </address>
            )}
          </section>

          {/* ── 2. Delivery ────────────────────────────────────────────────── */}
          {step !== 'address' && (
            <section aria-labelledby="delivery-heading" className="border-t border-ink-100 pt-10">
              <SectionHeading
                number={2}
                id="delivery-heading"
                title="How should it travel?"
                complete={step === 'payment'}
                onEdit={step === 'payment' ? () => setStep('delivery') : undefined}
              />

              {loadingShipping ? (
                <p className="mt-6 inline-flex items-center gap-2 font-sans text-[0.875rem] text-ink-500">
                  <Spinner className="h-4 w-4" /> Working out delivery options…
                </p>
              ) : shippingError ? (
                <div className="mt-6">
                  <Notice tone="warning" title="We cannot deliver there">
                    {shippingError}{' '}
                    <button
                      type="button"
                      onClick={() => setStep('address')}
                      className="underline underline-offset-4"
                    >
                      Change the address
                    </button>
                    , or email us and we will see what can be arranged.
                  </Notice>
                </div>
              ) : shippingQuote ? (
                <>
                  <fieldset className="mt-6">
                    <legend className="sr-only">Delivery method</legend>
                    <div className="space-y-3">
                      {shippingQuote.options.map((option) => {
                        const selected = selectedMethod === option.methodCode;
                        return (
                          <label
                            key={option.methodCode}
                            className={clsx(
                              'flex cursor-pointer items-start gap-4 border p-4 transition-colors',
                              selected ? 'border-ink-900 bg-ink-50/60' : 'border-ink-200 hover:border-ink-400',
                            )}
                          >
                            <input
                              type="radio"
                              name="shipping-method"
                              value={option.methodCode}
                              checked={selected}
                              onChange={() => void chooseMethod(option)}
                              className="mt-1 h-4 w-4 border-ink-300 text-ink-900 focus:ring-ink-900"
                            />
                            <span className="min-w-0 flex-1">
                              <span className="flex flex-wrap items-baseline justify-between gap-2">
                                <span className="font-sans text-[0.9375rem] text-ink-900">{option.methodName}</span>
                                <span className="font-sans text-[0.9375rem] tabular-nums text-ink-900">
                                  {option.isFree ? 'Free' : formatMoney(option.price)}
                                </span>
                              </span>
                              <span className="mt-1 block font-sans text-micro text-ink-500">
                                Arrives{' '}
                                {formatDeliveryWindow(option.estimatedDeliveryFrom, option.estimatedDeliveryTo)} ·{' '}
                                {formatDeliveryDays(option.minDeliveryDays, option.maxDeliveryDays)}
                                {option.isTracked && ' · tracked'}
                              </span>
                              {option.description && (
                                <span className="mt-1.5 block font-sans text-micro leading-relaxed text-ink-400">
                                  {option.description}
                                </span>
                              )}
                            </span>
                          </label>
                        );
                      })}
                    </div>
                  </fieldset>

                  {shippingQuote.duties.rate > 0 && (
                    <div className="mt-5">
                      <Notice tone="info" title="Import duties">
                        {shippingQuote.countryName} charges roughly {shippingQuote.duties.rate}%{' '}
                        {shippingQuote.duties.label?.toLowerCase() ?? 'import duty'} on goods from India. For the delivery
                        options above, this is collected by the carrier when your parcel arrives — it is not included in
                        the total below. Customs set the final amount.
                      </Notice>
                    </div>
                  )}

                  {step === 'delivery' && (
                    <button
                      type="button"
                      onClick={() => {
                        setStep('payment');
                        setAnnouncement('Delivery method chosen. Review and pay.');
                      }}
                      disabled={!canContinue}
                      className="btn-primary mt-6 w-full sm:w-auto"
                    >
                      Continue to payment
                    </button>
                  )}
                </>
              ) : null}
            </section>
          )}

          {/* ── 3. Payment ─────────────────────────────────────────────────── */}
          {step === 'payment' && (
            <section aria-labelledby="payment-heading" className="border-t border-ink-100 pt-10">
              <SectionHeading number={3} id="payment-heading" title="Payment" />

              <PaymentMethods methods={paymentMethods} selected={selectedProvider} onChange={setProvider}
                disabled={placing || loadingShipping} showUnavailablePhonePe={cart.countryCode === 'IN' && cart.baseCurrency === 'INR'} />

              {paymentMethods.length === 0 ? (
                <div className="mt-6">
                  <Notice tone="error" title="No payment method is available">
                    We cannot take payment for your region at the moment. Email us and we will complete your order
                    manually — your basket is saved.
                  </Notice>
                </div>
              ) : (
                <>
                  <div className="mt-8 space-y-5 border-t border-ink-100 pt-8">
                    <label className="flex cursor-pointer items-start gap-3">
                      <input
                        type="checkbox"
                        checked={isGift}
                        onChange={(e) => setIsGift(e.target.checked)}
                        className="mt-1 h-4 w-4 border-ink-300 text-ink-900 focus:ring-ink-900"
                      />
                      <span>
                        <span className="block font-sans text-[0.875rem] text-ink-900">This is a gift</span>
                        <span className="block font-sans text-micro text-ink-400">
                          We leave the price off the packing slip and can include a handwritten note.
                        </span>
                      </span>
                    </label>

                    {isGift && (
                      <Field
                        id="gift-message"
                        label="Gift message"
                        value={giftMessage}
                        onChange={(e) => setGiftMessage(e.target.value)}
                        maxLength={500}
                        hint="Written by hand on a card and tucked into the box."
                      />
                    )}

                    <Field
                      id="customer-note"
                      label="Anything we should know?"
                      value={customerNote}
                      onChange={(e) => setCustomerNote(e.target.value)}
                      maxLength={1000}
                    />
                  </div>

                  <button
                    type="button"
                    onClick={placeOrder}
                    disabled={placing || !canPay}
                    className="btn-primary mt-8 w-full"
                  >
                    {placing ? (
                      <>
                        <Spinner className="h-4 w-4" /> {selectedProvider === 'phonepe' ? 'Opening PhonePe…' : 'Placing your order…'}
                      </>
                    ) : selectedProvider === 'cod' ? (
                      <>Place order · pay {formatMoney(totals.total)} on delivery</>
                    ) : selectedProvider === 'phonepe' ? (
                      <>Pay {formatMoney(totals.total)} with PhonePe</>
                    ) : (
                      <>Pay {formatMoney(totals.total)}</>
                    )}
                  </button>

                  <p className="mt-4 font-sans text-micro leading-relaxed text-ink-400">
                    By placing this order you agree to our{' '}
                    <Link href="/terms" className="underline underline-offset-4">
                      terms
                    </Link>{' '}
                    and{' '}
                    <Link href="/returns" className="underline underline-offset-4">
                      returns policy
                    </Link>
                    . We never see or store your card details.
                  </p>
                </>
              )}
            </section>
          )}
        </div>

        {/* ── Summary ──────────────────────────────────────────────────────── */}
        <aside className="mt-12 lg:sticky lg:top-28 lg:mt-0">
          <div className="border border-ink-100 bg-white">
            <div className="border-b border-ink-100 px-5 py-4">
              <h2 className="font-serif text-lg text-ink-900">
                Your order <span className="text-ink-400">({totals.itemCount})</span>
              </h2>
            </div>

            <ul className="max-h-72 divide-y divide-ink-100 overflow-y-auto px-5">
              {cart.items.map((item) => (
                <li key={item.id} className="flex gap-3 py-4">
                  <div className="relative shrink-0">
                    <ProductThumb image={item.image} size={56} />
                    <span className="absolute -right-2 -top-2 flex h-5 min-w-5 items-center justify-center rounded-full bg-ink-900 px-1 font-sans text-[0.625rem] tabular-nums text-paper">
                      {item.quantity}
                    </span>
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-serif text-[0.875rem] text-ink-900">{item.name}</p>
                    {item.variantName && <p className="font-sans text-micro text-ink-400">{item.variantName}</p>}
                  </div>
                  <p className="shrink-0 font-sans text-[0.8125rem] tabular-nums text-ink-900">
                    {formatMoney(item.lineTotal)}
                  </p>
                </li>
              ))}
            </ul>

            <div className="border-t border-ink-100 px-5 py-4">
              <CouponForm />
            </div>

            <dl className="space-y-2.5 border-t border-ink-100 px-5 py-4">
              <div className="flex justify-between font-sans text-[0.875rem]">
                <dt className="text-ink-500">Subtotal</dt>
                <dd className="tabular-nums text-ink-900">{formatMoney(totals.subtotal)}</dd>
              </div>

              {totals.discount?.amount > 0 && (
                <div className="flex justify-between font-sans text-[0.875rem] text-success">
                  <dt>Discount</dt>
                  <dd className="tabular-nums">−{formatMoney(totals.discount)}</dd>
                </div>
              )}

              <div className="flex justify-between font-sans text-[0.875rem]">
                <dt className="text-ink-500">Shipping</dt>
                <dd className="tabular-nums text-ink-900">
                  {cart.selectedShipping ? (totals.shipping.amount === 0 ? 'Free' : formatMoney(totals.shipping)) : '—'}
                </dd>
              </div>

              {totals.duties?.amount > 0 && (
                <div className="flex justify-between font-sans text-[0.875rem]">
                  <dt className="text-ink-500">Duties</dt>
                  <dd className="tabular-nums text-ink-900">{formatMoney(totals.duties)}</dd>
                </div>
              )}

              <div className="flex items-baseline justify-between border-t border-ink-100 pt-3">
                <dt className="font-sans text-base text-ink-900">Total</dt>
                <dd className="font-serif text-xl tabular-nums text-ink-900">{formatMoney(totals.total)}</dd>
              </div>
            </dl>

            {cart.selectedShipping && (
              <div className="flex items-start gap-3 border-t border-ink-100 px-5 py-4">
                <IconTruck className="mt-0.5 h-4 w-4 shrink-0 text-ink-400" />
                <p className="font-sans text-micro leading-relaxed text-ink-500">
                  {cart.selectedShipping.methodName} ·{' '}
                  {formatDeliveryDays(cart.selectedShipping.minDeliveryDays, cart.selectedShipping.maxDeliveryDays)}
                </p>
              </div>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}

function SectionHeading({
  number,
  id,
  title,
  complete,
  onEdit,
}: {
  number: number;
  id: string;
  title: string;
  complete?: boolean;
  onEdit?: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <h2 id={id} className="flex items-center gap-3 font-serif text-display-sm text-ink-900">
        <span
          className={clsx(
            'flex h-7 w-7 shrink-0 items-center justify-center rounded-full font-sans text-[0.6875rem] tabular-nums',
            complete ? 'bg-success text-white' : 'bg-ink-900 text-paper',
          )}
          aria-hidden="true"
        >
          {complete ? <IconCheck className="h-3.5 w-3.5" /> : number}
        </span>
        {title}
      </h2>

      {onEdit && (
        <button
          type="button"
          onClick={onEdit}
          className="shrink-0 font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          Change
        </button>
      )}
    </div>
  );
}
