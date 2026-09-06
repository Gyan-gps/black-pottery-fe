'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import clsx from 'clsx';
import type { Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useCart, useWishlist, useRecentlyViewed, track } from '@/lib/store';
import {
  IconBag, IconCheck, IconHeart, IconHeartFilled, IconShare, LiveRegion, Notice, QuantityStepper, Rating, Spinner,
} from './ui';
import { DeliveryEstimate } from './DeliveryEstimate';

/**
 * The buy box: variant, quantity, add to cart, buy now.
 *
 * Stock is stated honestly — an exact figure when it is low, because "Only 2 left"
 * is useful and "Selling fast!" is not. Everything the shopper needs to decide
 * (price, availability, delivery, handmade variation) sits above the fold.
 */
export function AddToCart({ product }: { product: Product }) {
  const router = useRouter();
  const [variantId, setVariantId] = useState(product.defaultVariantId ?? product.variants[0]?.id ?? '');
  const [quantity, setQuantity] = useState(1);
  const [busy, setBusy] = useState<'add' | 'buy' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [announcement, setAnnouncement] = useState<string | null>(null);
  const [added, setAdded] = useState(false);
  const [copied, setCopied] = useState(false);

  const addItem = useCart((s) => s.addItem);
  const toggleWishlist = useWishlist((s) => s.toggle);
  const isSaved = useWishlist((s) => s.has(product.id));
  const recordView = useRecentlyViewed((s) => s.record);

  const variant = product.variants.find((v) => v.id === variantId) ?? product.variants[0];
  const availability = variant?.availability ?? product.availability;
  const price = variant?.price ?? product.price;
  const compareAt = variant?.compareAtPrice ?? product.compareAtPrice;

  const soldOut = availability?.isOutOfStock ?? product.isOutOfStock;
  const lowStock = availability?.isLowStock && !soldOut;
  const maxQuantity =
    availability?.trackInventory && !availability.allowBackorder ? Math.min(20, availability.available ?? 20) : 20;

  useEffect(() => {
    recordView(product.id);
    track('product_view', { productSlug: product.slug });
  }, [product.id, product.slug, recordView]);

  // A variant change invalidates a quantity that the new variant cannot satisfy.
  useEffect(() => {
    setQuantity((current) => Math.min(current, Math.max(1, maxQuantity)));
  }, [maxQuantity]);

  const add = async (then: 'stay' | 'checkout') => {
    setBusy(then === 'checkout' ? 'buy' : 'add');
    setError(null);

    const result = await addItem(product.id, variantId || undefined, quantity);

    if (!result.ok) {
      setError(result.error ?? 'We could not add that to your basket. Please try again.');
      setAnnouncement(result.error ?? 'Could not add to basket');
      setBusy(null);
      return;
    }

    track('add_to_cart', { productSlug: product.slug, quantity });
    setAnnouncement(`${product.name} added to your basket`);
    setBusy(null);

    if (then === 'checkout') {
      router.push('/checkout');
      return;
    }

    // A brief confirmation on the button itself, then back to normal.
    setAdded(true);
    window.setTimeout(() => setAdded(false), 2200);
  };

  const share = async () => {
    const url = window.location.href;
    // Native share where it exists; a clipboard copy everywhere else.
    if (navigator.share) {
      try {
        await navigator.share({ title: product.name, text: product.shortDescription ?? undefined, url });
        return;
      } catch {
        /* Cancelled — fall through to copying. */
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setAnnouncement('Link copied');
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setError('We could not copy the link. You can copy it from the address bar.');
    }
  };

  return (
    <div>
      <LiveRegion message={announcement} />

      {product.category && (
        <p className="eyebrow mb-3">
          <a href={`/shop/${product.category.slug}`} className="hover:text-ink-900">
            {product.category.name}
          </a>
        </p>
      )}

      <h1 className="font-serif text-display-md text-ink-900">{product.name}</h1>

      {product.rating.count > 0 && (
        <div className="mt-4">
          <a href="#reviews" className="inline-block">
            <Rating value={product.rating.average} count={product.rating.count} size="md" />
          </a>
        </div>
      )}

      {product.shortDescription && (
        <p className="mt-5 max-w-prose font-serif text-lg leading-relaxed text-ink-600">{product.shortDescription}</p>
      )}

      {/* Price */}
      <div className="mt-7 flex flex-wrap items-baseline gap-3">
        <span className="font-serif text-3xl tabular-nums text-ink-900">{formatMoney(price)}</span>
        {compareAt && compareAt.amount > price.amount && (
          <>
            <span className="font-sans text-lg tabular-nums text-ink-400 line-through">{formatMoney(compareAt)}</span>
            <span className="bg-danger px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.12em] text-white">
              Save {Math.round(((compareAt.amount - price.amount) / compareAt.amount) * 100)}%
            </span>
          </>
        )}
      </div>
      <p className="mt-1.5 font-sans text-micro text-ink-400">
        Shipping calculated at checkout. Import duties, where they apply, are shown before you pay.
      </p>

      {/* Availability */}
      <div className="mt-6">
        {soldOut ? (
          <p className="inline-flex items-center gap-2 font-sans text-[0.8125rem] text-ink-500">
            <span className="h-1.5 w-1.5 rounded-full bg-ink-300" aria-hidden="true" />
            Sold out — the next batch is being made
          </p>
        ) : lowStock ? (
          <p className="inline-flex items-center gap-2 font-sans text-[0.8125rem] text-warning">
            <span className="h-1.5 w-1.5 rounded-full bg-warning" aria-hidden="true" />
            Only {availability?.available} left
          </p>
        ) : (
          <p className="inline-flex items-center gap-2 font-sans text-[0.8125rem] text-success">
            <span className="h-1.5 w-1.5 rounded-full bg-success" aria-hidden="true" />
            In stock, ready to ship
          </p>
        )}
      </div>

      {/* Variants */}
      {product.hasVariants && (
        <fieldset className="mt-7">
          <legend className="label">
            {product.variants[0]?.options[0]?.name ?? 'Option'}
          </legend>
          <div className="flex flex-wrap gap-2">
            {product.variants.map((option) => {
              const optionSoldOut = option.availability?.isOutOfStock;
              const selected = option.id === variantId;
              return (
                <button
                  key={option.id}
                  type="button"
                  onClick={() => setVariantId(option.id)}
                  aria-pressed={selected}
                  className={clsx(
                    'min-h-11 border px-4 py-2.5 font-sans text-[0.8125rem] transition-colors',
                    selected ? 'border-ink-900 bg-ink-900 text-paper' : 'border-ink-200 text-ink-700 hover:border-ink-900',
                    // Sold-out options stay selectable so the shopper can see the price.
                    optionSoldOut && !selected && 'text-ink-400 line-through',
                  )}
                >
                  {option.name}
                </button>
              );
            })}
          </div>
        </fieldset>
      )}

      {error && (
        <div className="mt-6">
          <Notice tone="error">{error}</Notice>
        </div>
      )}

      {/* Actions */}
      <div className="mt-7 space-y-3">
        {!soldOut && (
          <div className="flex flex-wrap items-center gap-4">
            <QuantityStepper
              value={quantity}
              max={Math.max(1, maxQuantity)}
              onChange={setQuantity}
              disabled={Boolean(busy)}
              label={`Quantity of ${product.name}`}
            />
            {maxQuantity < 20 && (
              <span className="font-sans text-micro text-ink-400">{maxQuantity} available</span>
            )}
          </div>
        )}

        <div className="flex flex-col gap-3 sm:flex-row">
          <button
            type="button"
            onClick={() => add('stay')}
            disabled={soldOut || Boolean(busy)}
            className="btn-primary flex-1"
          >
            {busy === 'add' ? (
              <Spinner className="h-4 w-4" />
            ) : added ? (
              <>
                <IconCheck className="h-4 w-4" /> Added
              </>
            ) : soldOut ? (
              'Sold out'
            ) : (
              <>
                <IconBag className="h-4 w-4" /> Add to basket
              </>
            )}
          </button>

          {!soldOut && (
            <button type="button" onClick={() => add('checkout')} disabled={Boolean(busy)} className="btn-secondary flex-1">
              {busy === 'buy' ? <Spinner className="h-4 w-4" /> : 'Buy now'}
            </button>
          )}
        </div>

        <div className="flex items-center gap-5 pt-1">
          <button
            type="button"
            onClick={() => {
              void toggleWishlist(product.id);
              if (!isSaved) track('wishlist_add', { productSlug: product.slug });
            }}
            aria-pressed={isSaved}
            className="inline-flex items-center gap-2 font-sans text-micro text-ink-500 transition-colors hover:text-ink-900"
          >
            {isSaved ? <IconHeartFilled className="h-4 w-4 text-clay-600" /> : <IconHeart className="h-4 w-4" />}
            {isSaved ? 'Saved' : 'Save for later'}
          </button>

          <button
            type="button"
            onClick={share}
            className="inline-flex items-center gap-2 font-sans text-micro text-ink-500 transition-colors hover:text-ink-900"
          >
            {copied ? <IconCheck className="h-4 w-4 text-success" /> : <IconShare className="h-4 w-4" />}
            {copied ? 'Link copied' : 'Share'}
          </button>
        </div>
      </div>

      {/* Handmade variation — stated where the decision is made, not buried below */}
      {product.handmadeVariationNote && (
        <div className="mt-8 border-l-2 border-clay-300 py-1 pl-4">
          <p className="font-serif text-[0.9375rem] leading-relaxed text-ink-600">{product.handmadeVariationNote}</p>
        </div>
      )}

      <div className="mt-8">
        <DeliveryEstimate product={product} />
      </div>
    </div>
  );
}
