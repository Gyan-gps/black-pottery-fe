'use client';

import Link from 'next/link';
import { useState } from 'react';
import clsx from 'clsx';
import type { ProductCard as ProductCardType } from '@/lib/types';
import { formatMoney, formatDimensions } from '@/lib/format';
import { useWishlist, useCart, track } from '@/lib/store';
import { Badge, IconHeart, IconHeartFilled, Rating, Spinner } from './ui';
import { ProductImageView } from './ProductImage';

/**
 * The product card.
 *
 * Restrained by intention: image, name, price. Badges appear only when they say
 * something true and useful — "Only 2 left" is worth the ink, a permanent
 * "Popular!" is not.
 */
export function ProductCard({
  product,
  priority = false,
  sizes = '(min-width: 1280px) 22vw, (min-width: 1024px) 30vw, (min-width: 640px) 45vw, 47vw',
  showQuickAdd = true,
}: {
  product: ProductCardType;
  priority?: boolean;
  sizes?: string;
  showQuickAdd?: boolean;
}) {
  const [adding, setAdding] = useState(false);
  const [hovered, setHovered] = useState(false);

  const toggleWishlist = useWishlist((s) => s.toggle);
  const isSaved = useWishlist((s) => s.has(product.id));
  const addItem = useCart((s) => s.addItem);

  const soldOut = product.isOutOfStock;
  const onSale = product.discountPercent > 0;

  const quickAdd = async (event: React.MouseEvent) => {
    event.preventDefault();
    event.stopPropagation();
    setAdding(true);
    await addItem(product.id);
    track('add_to_cart', { productSlug: product.slug, quantity: 1 });
    setAdding(false);
  };

  return (
    <article
      className="group relative"
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      {/* The media is its own positioning context: the wishlist and quick-add
          controls overlay the image, never the name and price below it. They sit
          outside the Link because a button may not be nested inside an anchor. */}
      <div className="relative">
        <Link
          href={`/products/${product.slug}`}
          className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-4"
          onClick={() => track('product_view', { productSlug: product.slug })}
        >
          <div className="relative overflow-hidden bg-ink-100">
            <ProductImageView
              image={product.image}
              sizes={sizes}
              priority={priority}
              imageClassName={clsx(
                'transition-transform duration-[900ms] ease-craft',
                // A slow, small zoom — a craft object should not bounce.
                hovered && !product.hoverImage && 'scale-[1.04]',
                hovered && product.hoverImage && 'opacity-0',
              )}
            />

            {product.hoverImage && (
              <div className="absolute inset-0 opacity-0 transition-opacity duration-500 ease-craft group-hover:opacity-100">
                <ProductImageView image={product.hoverImage} sizes={sizes} aspect="product" />
              </div>
            )}

            {soldOut && (
              <div className="absolute inset-0 flex items-center justify-center bg-paper/70">
                <span className="border border-ink-900 bg-paper px-4 py-2 font-sans text-micro uppercase tracking-[0.14em] text-ink-900">
                  Sold out
                </span>
              </div>
            )}

            {/* Badges: at most two, so the image still reads as a photograph. */}
            {!soldOut && product.badges.length > 0 && (
              <div className="absolute left-3 top-3 flex flex-col items-start gap-1.5">
                {product.badges
                  .filter((b) => b.type !== 'out-of-stock')
                  .slice(0, 2)
                  .map((badge) => (
                    <Badge key={badge.type} type={badge.type}>
                      {badge.label}
                    </Badge>
                  ))}
                {onSale && <Badge type="sale">{product.discountPercent}% off</Badge>}
              </div>
            )}
          </div>
        </Link>

        {/* Wishlist — always reachable by keyboard, not only on hover */}
        <button
          type="button"
          onClick={() => {
            void toggleWishlist(product.id);
            if (!isSaved) track('wishlist_add', { productSlug: product.slug });
          }}
          className="absolute right-2.5 top-2.5 flex h-9 w-9 items-center justify-center bg-paper/85 text-ink-600 opacity-0 backdrop-blur-sm transition-all hover:text-ink-900 focus-visible:opacity-100 group-hover:opacity-100 sm:opacity-0"
          aria-pressed={isSaved}
          aria-label={isSaved ? `Remove ${product.name} from wishlist` : `Save ${product.name} to wishlist`}
        >
          {isSaved ? <IconHeartFilled className="h-4 w-4 text-clay-600" /> : <IconHeart className="h-4 w-4" />}
        </button>

        {showQuickAdd && !soldOut && (
          <div className="pointer-events-none absolute inset-x-3 bottom-3 hidden opacity-0 transition-opacity duration-300 group-hover:pointer-events-auto group-hover:opacity-100 lg:block">
            <button
              type="button"
              onClick={quickAdd}
              disabled={adding}
              className="w-full bg-paper/95 py-3 font-sans text-micro uppercase tracking-[0.12em] text-ink-900 backdrop-blur-sm transition-colors hover:bg-ink-900 hover:text-paper disabled:opacity-60"
            >
              {adding ? <Spinner className="mx-auto h-3.5 w-3.5" /> : 'Add to basket'}
            </button>
          </div>
        )}
      </div>

      <div className="mt-4">
        <h3 className="font-serif text-[0.9375rem] leading-snug text-ink-900">
          <Link href={`/products/${product.slug}`} className="hover:underline hover:underline-offset-4">
            {product.name}
          </Link>
        </h3>

        {product.dimensions && (
          <p className="mt-1 font-sans text-[0.6875rem] text-ink-400">{formatDimensions(product.dimensions)}</p>
        )}

        <div className="mt-1.5 flex flex-wrap items-baseline gap-x-2 gap-y-1">
          <span className="font-sans text-[0.875rem] tabular-nums text-ink-900">{formatMoney(product.price)}</span>
          {onSale && product.compareAtPrice && (
            <span className="font-sans text-[0.75rem] tabular-nums text-ink-400 line-through">
              {formatMoney(product.compareAtPrice)}
            </span>
          )}
        </div>

        {product.rating.count > 0 && (
          <div className="mt-2">
            <Rating value={product.rating.average} count={product.rating.count} />
          </div>
        )}
      </div>
    </article>
  );
}

/** The standard responsive grid, so every listing page aligns identically. */
export function ProductGrid({
  products,
  priorityCount = 4,
  className,
}: {
  products: ProductCardType[];
  priorityCount?: number;
  className?: string;
}) {
  return (
    <div className={clsx('grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-14 xl:grid-cols-4', className)}>
      {products.map((product, index) => (
        <ProductCard key={product.id} product={product} priority={index < priorityCount} />
      ))}
    </div>
  );
}

/** A horizontally scrolling row, used for related and recently-viewed pieces. */
export function ProductRail({ products, title, action }: { products: ProductCardType[]; title: string; action?: React.ReactNode }) {
  if (!products.length) return null;

  return (
    <section className="py-section">
      <div className="shell">
        <div className="mb-8 flex items-end justify-between gap-6">
          <h2 className="font-serif text-display-sm text-ink-900">{title}</h2>
          {action}
        </div>
      </div>

      <div className="scroll-fade no-scrollbar overflow-x-auto">
        <div className="shell flex gap-4 lg:gap-6">
          {products.map((product) => (
            <div key={product.id} className="w-[62vw] shrink-0 sm:w-[38vw] lg:w-[23vw] xl:w-[19vw]">
              <ProductCard product={product} sizes="(min-width: 1280px) 19vw, (min-width: 1024px) 23vw, (min-width: 640px) 38vw, 62vw" showQuickAdd={false} />
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
