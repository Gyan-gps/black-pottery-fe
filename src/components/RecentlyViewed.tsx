'use client';

import { useEffect, useState } from 'react';
import { post } from '@/lib/api';
import { usePreferences, useRecentlyViewed } from '@/lib/store';
import type { ProductCard as ProductCardType } from '@/lib/types';
import { ProductRail } from './ProductCard';

/**
 * Recently viewed pieces.
 *
 * The list of ids lives in the browser, not on the server — this is a browsing
 * convenience, not customer data worth storing. The ids are rehydrated into full
 * cards on demand, so prices are always current and in the right currency.
 */
export function RecentlyViewed({ excludeId, title = 'Recently viewed' }: { excludeId?: string; title?: string }) {
  const ids = useRecentlyViewed((s) => s.ids);
  const currency = usePreferences((s) => s.currency);
  const [products, setProducts] = useState<ProductCardType[]>([]);

  useEffect(() => {
    const wanted = ids.filter((id) => id !== excludeId).slice(0, 8);
    if (wanted.length < 2) {
      // One item is not a rail; it is just the page you were already on.
      setProducts([]);
      return;
    }

    let cancelled = false;
    (async () => {
      try {
        const data = await post<ProductCardType[]>('/catalog/products/by-ids', { ids: wanted }, { currency });
        if (!cancelled) setProducts(data);
      } catch {
        // A failure here should leave no trace — the section simply does not appear.
        if (!cancelled) setProducts([]);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [ids, excludeId, currency]);

  if (products.length < 2) return null;

  return <ProductRail products={products} title={title} />;
}
