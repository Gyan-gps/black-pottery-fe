'use client';

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Cart, CartNotice, ProductCard, User } from './types';
import { ApiClientError, request } from './api';

/**
 * Browser state.
 *
 * The rule: the server owns the cart, prices and stock; this store owns only
 * what the browser legitimately knows — which currency the shopper chose, what
 * they have looked at, and a copy of the server's cart for rendering. Nothing
 * here is ever trusted for money.
 */

// ── Preferences ─────────────────────────────────────────────────────────────

type PreferencesState = {
  currency: string;
  country: string | null;
  /** True once the shopper picks a currency, so we stop overriding it by geo. */
  currencyChosen: boolean;
  sessionId: string;
  setCurrency: (currency: string) => void;
  setCountry: (country: string) => void;
  /** Applies a geo-detected default without overruling an explicit choice. */
  suggest: (currency: string, country: string) => void;
};

const newSessionId = () =>
  typeof crypto !== 'undefined' && 'randomUUID' in crypto ? crypto.randomUUID() : `s-${Date.now()}-${Math.random()}`;

export const usePreferences = create<PreferencesState>()(
  persist(
    (set, get) => ({
      currency: 'INR',
      country: null,
      currencyChosen: false,
      sessionId: newSessionId(),
      setCurrency: (currency) => set({ currency, currencyChosen: true }),
      setCountry: (country) => set({ country }),
      suggest: (currency, country) => {
        const state = get();
        set({
          country: state.country ?? country,
          currency: state.currencyChosen ? state.currency : currency,
        });
      },
    }),
    {
      name: 'nbp-preferences',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({
        currency: s.currency, country: s.country, currencyChosen: s.currencyChosen, sessionId: s.sessionId,
      }),
    },
  ),
);

// ── Auth ────────────────────────────────────────────────────────────────────

type AuthState = {
  user: User | null;
  /** Held in memory only. The refresh token lives in an httpOnly cookie. */
  accessToken: string | null;
  status: 'idle' | 'loading' | 'authenticated' | 'anonymous';
  setSession: (user: User, accessToken: string) => void;
  clear: () => void;
  refresh: () => Promise<boolean>;
};

export const useAuth = create<AuthState>((set, get) => ({
  user: null,
  accessToken: null,
  status: 'idle',

  setSession: (user, accessToken) => set({ user, accessToken, status: 'authenticated' }),
  clear: () => set({ user: null, accessToken: null, status: 'anonymous' }),

  /** Exchanges the refresh cookie for a new access token. Silent on failure. */
  refresh: async () => {
    try {
      const { data } = await request<{ user: User; accessToken: string }>('/auth/refresh', { method: 'POST' });
      set({ user: data.user, accessToken: data.accessToken, status: 'authenticated' });
      return true;
    } catch {
      set({ user: null, accessToken: null, status: 'anonymous' });
      return false;
    }
  },
}));

// ── Cart ────────────────────────────────────────────────────────────────────

type CartState = {
  cart: Cart | null;
  status: 'idle' | 'loading' | 'ready' | 'error';
  /** Set while a specific line is being changed, so only that row shows a spinner. */
  pendingItemId: string | null;
  error: string | null;
  /** Server-side notices (price changed, item withdrawn) awaiting acknowledgement. */
  notices: CartNotice[];
  isDrawerOpen: boolean;

  load: () => Promise<void>;
  addItem: (productId: string, variantId?: string, quantity?: number) => Promise<{ ok: boolean; error?: string }>;
  updateItem: (itemId: string, quantity: number) => Promise<void>;
  saveForLater: (itemId: string, savedForLater: boolean) => Promise<void>;
  removeItem: (itemId: string) => Promise<void>;
  applyCoupon: (code: string) => Promise<{ ok: boolean; error?: string }>;
  removeCoupon: () => Promise<void>;
  setDestination: (countryCode: string) => Promise<void>;
  selectShipping: (methodCode: string) => Promise<{ ok: boolean; error?: string }>;
  openDrawer: () => void;
  closeDrawer: () => void;
  dismissNotices: () => void;
};

/** Context headers every cart call needs, read fresh so a currency switch applies at once. */
const cartContext = () => {
  const { currency, country, sessionId } = usePreferences.getState();
  return { currency, country: country ?? undefined, sessionId, accessToken: useAuth.getState().accessToken ?? undefined };
};

export const useCart = create<CartState>((set, get) => {
  /** Runs a cart mutation, applying the returned cart and normalising errors. */
  const mutate = async (
    path: string,
    init: RequestInit & { itemId?: string } = {},
  ): Promise<{ ok: boolean; error?: string }> => {
    const { itemId, ...requestInit } = init;
    set({ pendingItemId: itemId ?? null, error: null });
    try {
      const { data } = await request<Cart>(path, { ...requestInit, ...cartContext() });
      set({ cart: data, status: 'ready', notices: data.notices ?? [], pendingItemId: null });
      return { ok: true };
    } catch (error) {
      const message =
        error instanceof ApiClientError ? error.message : 'Something went wrong. Please try again.';
      set({ error: message, pendingItemId: null, status: 'ready' });
      return { ok: false, error: message };
    }
  };

  return {
    cart: null,
    status: 'idle',
    pendingItemId: null,
    error: null,
    notices: [],
    isDrawerOpen: false,

    load: async () => {
      if (get().status === 'loading') return;
      set({ status: 'loading' });
      try {
        const { data } = await request<Cart>('/cart', cartContext());
        set({ cart: data, status: 'ready', notices: data.notices ?? [] });
      } catch {
        // An unreachable cart must not break the page; the badge simply shows nothing.
        set({ status: 'error' });
      }
    },

    addItem: async (productId, variantId, quantity = 1) => {
      const result = await mutate('/cart/items', {
        method: 'POST',
        body: JSON.stringify({ productId, variantId, quantity }),
      });
      if (result.ok) set({ isDrawerOpen: true });
      return result;
    },

    updateItem: async (itemId, quantity) => {
      await mutate(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ quantity }), itemId });
    },

    saveForLater: async (itemId, savedForLater) => {
      await mutate(`/cart/items/${itemId}`, { method: 'PATCH', body: JSON.stringify({ savedForLater }), itemId });
    },

    removeItem: async (itemId) => {
      await mutate(`/cart/items/${itemId}`, { method: 'DELETE', itemId });
    },

    applyCoupon: (code) => mutate('/cart/coupon', { method: 'POST', body: JSON.stringify({ code }) }),
    removeCoupon: async () => {
      await mutate('/cart/coupon', { method: 'DELETE' });
    },

    setDestination: async (countryCode) => {
      await mutate('/cart/destination', { method: 'POST', body: JSON.stringify({ countryCode }) });
    },

    selectShipping: (methodCode) =>
      mutate('/cart/shipping-method', { method: 'POST', body: JSON.stringify({ methodCode }) }),

    openDrawer: () => set({ isDrawerOpen: true }),
    closeDrawer: () => set({ isDrawerOpen: false }),
    dismissNotices: () => set({ notices: [] }),
  };
});

// ── Recently viewed ─────────────────────────────────────────────────────────

type RecentlyViewedState = {
  ids: string[];
  record: (productId: string) => void;
  clear: () => void;
};

export const useRecentlyViewed = create<RecentlyViewedState>()(
  persist(
    (set) => ({
      ids: [],
      // Most recent first, capped — a long tail is noise, not a feature.
      record: (productId) => set((s) => ({ ids: [productId, ...s.ids.filter((id) => id !== productId)].slice(0, 12) })),
      clear: () => set({ ids: [] }),
    }),
    { name: 'nbp-recently-viewed', storage: createJSONStorage(() => localStorage) },
  ),
);

// ── Wishlist ────────────────────────────────────────────────────────────────

type WishlistState = {
  /** Guest wishlist, held locally and merged into the account on sign-in. */
  localIds: string[];
  items: ProductCard[];
  isLoading: boolean;
  toggle: (productId: string) => Promise<void>;
  has: (productId: string) => boolean;
  load: () => Promise<void>;
  mergeIntoAccount: () => Promise<void>;
};

export const useWishlist = create<WishlistState>()(
  persist(
    (set, get) => ({
      localIds: [],
      items: [],
      isLoading: false,

      has: (productId) => get().localIds.includes(productId) || get().items.some((i) => i.id === productId),

      toggle: async (productId) => {
        const signedIn = Boolean(useAuth.getState().accessToken);
        const isSaved = get().has(productId);

        if (!signedIn) {
          set((s) => ({
            localIds: isSaved ? s.localIds.filter((id) => id !== productId) : [...s.localIds, productId],
          }));
          return;
        }

        try {
          const { data } = await request<{ items: ProductCard[] }>(
            isSaved ? `/wishlist/${productId}` : '/wishlist',
            {
              method: isSaved ? 'DELETE' : 'POST',
              body: isSaved ? undefined : JSON.stringify({ productId }),
              ...cartContext(),
            },
          );
          set({ items: data.items, localIds: data.items.map((i) => i.id) });
        } catch {
          // Fall back to local state rather than losing the shopper's intent.
          set((s) => ({
            localIds: isSaved ? s.localIds.filter((id) => id !== productId) : [...s.localIds, productId],
          }));
        }
      },

      load: async () => {
        if (!useAuth.getState().accessToken) return;
        set({ isLoading: true });
        try {
          const { data } = await request<{ items: ProductCard[] }>('/wishlist', cartContext());
          set({ items: data.items, localIds: data.items.map((i) => i.id), isLoading: false });
        } catch {
          set({ isLoading: false });
        }
      },

      /** Called once after sign-in so nothing saved as a guest is lost. */
      mergeIntoAccount: async () => {
        const { localIds } = get();
        if (!localIds.length || !useAuth.getState().accessToken) return;
        try {
          const { data } = await request<{ items: ProductCard[] }>('/wishlist/merge', {
            method: 'POST',
            body: JSON.stringify({ productIds: localIds }),
            ...cartContext(),
          });
          set({ items: data.items, localIds: data.items.map((i) => i.id) });
        } catch {
          /* Retried on the next sign-in. */
        }
      },
    }),
    {
      name: 'nbp-wishlist',
      storage: createJSONStorage(() => localStorage),
      partialize: (s) => ({ localIds: s.localIds }),
    },
  ),
);

// ── Analytics ───────────────────────────────────────────────────────────────

/** Fire-and-forget funnel event. Never blocks or surfaces an error to the shopper. */
export function track(
  type: 'product_view' | 'collection_view' | 'search' | 'add_to_cart' | 'remove_from_cart' | 'wishlist_add',
  payload: { productSlug?: string; searchQuery?: string; quantity?: number } = {},
) {
  if (typeof window === 'undefined') return;
  const { sessionId } = usePreferences.getState();
  void request('/analytics/events', {
    method: 'POST',
    body: JSON.stringify({ type, ...payload, path: window.location.pathname }),
    sessionId,
    country: usePreferences.getState().country ?? undefined,
  }).catch(() => {});
}
