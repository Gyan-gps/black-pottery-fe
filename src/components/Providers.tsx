'use client';

import { useEffect, type ReactNode } from 'react';
import { useAuth, useCart, usePreferences, useWishlist } from '@/lib/store';

/**
 * Boot-time client wiring. Kept deliberately small: restore the session, load the
 * cart, and align the chosen currency with what the server rendered. Everything
 * else is loaded by the screen that needs it.
 */
export function Providers({
  children,
  serverCurrency,
  serverCountry,
}: {
  children: ReactNode;
  serverCurrency: string;
  serverCountry?: string;
}) {
  const suggest = usePreferences((s) => s.suggest);
  const refresh = useAuth((s) => s.refresh);
  const loadCart = useCart((s) => s.load);
  const loadWishlist = useWishlist((s) => s.load);
  const mergeWishlist = useWishlist((s) => s.mergeIntoAccount);

  useEffect(() => {
    // The server already resolved a currency from geo; adopt it unless the
    // shopper has made their own choice, which always wins.
    if (serverCountry) suggest(serverCurrency, serverCountry);
  }, [serverCurrency, serverCountry, suggest]);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      const signedIn = await refresh();
      if (cancelled) return;
      await loadCart();
      if (signedIn) {
        await mergeWishlist();
        await loadWishlist();
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [refresh, loadCart, loadWishlist, mergeWishlist]);

  return <>{children}</>;
}
