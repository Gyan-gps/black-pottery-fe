'use client';

import { useEffect } from 'react';
import { useCart } from '@/lib/store';

/**
 * Refreshes the basket after a successful order.
 *
 * The server already converted the cart when payment settled; this simply re-reads
 * it so the header badge empties without a full page reload. Rendering nothing
 * keeps the confirmation page itself a server component.
 */
export function ClearCartOnMount() {
  const load = useCart((s) => s.load);

  useEffect(() => {
    void load();
  }, [load]);

  return null;
}
