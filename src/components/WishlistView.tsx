'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { post } from '@/lib/api';
import { useAuth, usePreferences, useWishlist } from '@/lib/store';
import type { ProductCard as ProductCardType } from '@/lib/types';
import { ProductCard } from './ProductCard';
import { EmptyState, IconHeart, ProductGridSkeleton } from './ui';

/**
 * The wishlist.
 *
 * Works signed out: guest saves live in local storage and are rehydrated into
 * full product cards here, then merged into the account on sign-in. A shopper
 * never loses what they saved because they had not made an account yet.
 */
export function WishlistView() {
  const localIds = useWishlist((s) => s.localIds);
  const accountItems = useWishlist((s) => s.items);
  const user = useAuth((s) => s.user);
  const authStatus = useAuth((s) => s.status);
  const currency = usePreferences((s) => s.currency);

  const [guestItems, setGuestItems] = useState<ProductCardType[]>([]);
  const [loading, setLoading] = useState(true);

  const signedIn = Boolean(user);

  useEffect(() => {
    // Wait until the session is resolved, or we would briefly show the guest list
    // to someone who is actually signed in.
    if (authStatus === 'idle' || authStatus === 'loading') return;

    if (signedIn) {
      setLoading(false);
      return;
    }

    if (!localIds.length) {
      setGuestItems([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await post<ProductCardType[]>('/catalog/products/by-ids', { ids: localIds }, { currency });
        if (!cancelled) setGuestItems(data);
      } catch {
        if (!cancelled) setGuestItems([]);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [localIds, currency, signedIn, authStatus]);

  const items = signedIn ? accountItems : guestItems;

  if (loading || authStatus === 'idle' || authStatus === 'loading') {
    return (
      <div className="shell py-10 lg:py-14">
        <div className="skeleton mb-12 h-10 w-48" />
        <ProductGridSkeleton count={4} />
      </div>
    );
  }

  return (
    <div className="shell py-10 lg:py-14">
      <header className="mb-12 max-w-2xl">
        <h1 className="font-serif text-display-lg text-ink-900">Your wishlist</h1>
        {items.length > 0 && (
          <p className="mt-4 font-serif text-lg text-ink-500">
            {items.length} piece{items.length === 1 ? '' : 's'} saved.
            {!signedIn && (
              <>
                {' '}
                <Link href="/sign-in?next=/wishlist" className="underline underline-offset-4 hover:text-ink-900">
                  Sign in
                </Link>{' '}
                to keep them across devices.
              </>
            )}
          </p>
        )}
      </header>

      {items.length === 0 ? (
        <EmptyState
          icon={<IconHeart className="h-12 w-12" strokeWidth={0.8} />}
          title="Nothing saved yet"
          description="Tap the heart on any piece to keep it here. Useful when you are deciding between two shapes, or waiting for something to come back into stock."
          action={
            <Link href="/shop" className="btn-primary">
              Explore the collection
            </Link>
          }
        />
      ) : (
        <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6 lg:gap-y-14 xl:grid-cols-4">
          {items.map((product, index) => (
            <ProductCard key={product.id} product={product} priority={index < 4} />
          ))}
        </div>
      )}
    </div>
  );
}
