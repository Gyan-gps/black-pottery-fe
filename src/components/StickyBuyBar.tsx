'use client';

import { useEffect, useState } from 'react';
import clsx from 'clsx';
import type { Product } from '@/lib/types';
import { formatMoney } from '@/lib/format';
import { useCart, track } from '@/lib/store';
import { Spinner } from './ui';

/**
 * Mobile sticky add-to-cart.
 *
 * Appears only once the real buy box has scrolled out of view, so it never
 * duplicates a control already on screen. Observed rather than measured on
 * scroll, which keeps it off the main thread.
 */
export function StickyBuyBar({ product, anchorId }: { product: Product; anchorId: string }) {
  const [visible, setVisible] = useState(false);
  const [busy, setBusy] = useState(false);
  const addItem = useCart((s) => s.addItem);

  useEffect(() => {
    const anchor = document.getElementById(anchorId);
    if (!anchor) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        // Show once the buy box is fully above the viewport, not merely clipped.
        setVisible(!entry.isIntersecting && entry.boundingClientRect.top < 0);
      },
      { threshold: 0 },
    );

    observer.observe(anchor);
    return () => observer.disconnect();
  }, [anchorId]);

  const soldOut = product.isOutOfStock;

  const add = async () => {
    setBusy(true);
    await addItem(product.id, product.defaultVariantId ?? undefined, 1);
    track('add_to_cart', { productSlug: product.slug, quantity: 1 });
    setBusy(false);
  };

  return (
    <div
      className={clsx(
        'fixed inset-x-0 bottom-0 z-30 border-t border-ink-100 bg-paper/95 backdrop-blur-md transition-transform duration-300 ease-craft lg:hidden',
        visible ? 'translate-y-0' : 'translate-y-full',
      )}
      // Hidden from assistive tech while off-screen, so it is not read twice.
      aria-hidden={!visible}
    >
      <div className="shell flex items-center gap-4 py-3">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-[0.875rem] text-ink-900">{product.name}</p>
          <p className="font-sans text-[0.8125rem] tabular-nums text-ink-600">{formatMoney(product.price)}</p>
        </div>

        <button
          type="button"
          onClick={add}
          disabled={soldOut || busy}
          tabIndex={visible ? undefined : -1}
          className="btn-primary btn-sm shrink-0 px-6"
        >
          {busy ? <Spinner className="h-3.5 w-3.5" /> : soldOut ? 'Sold out' : 'Add to basket'}
        </button>
      </div>
    </div>
  );
}
