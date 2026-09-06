'use client';

import { useRouter } from 'next/navigation';
import { useTransition } from 'react';
import { usePreferences, useCart } from '@/lib/store';
import type { CurrencyOption } from '@/lib/types';
import { IconChevronDown, Spinner } from './ui';

/**
 * Currency selection.
 *
 * The choice is written to a cookie as well as local state, because the server
 * renders prices too — without the cookie the first paint after a reload would
 * show one currency and then flip to another.
 */
export function CurrencySwitcher({
  currencies,
  compact = false,
}: {
  currencies: CurrencyOption[];
  compact?: boolean;
}) {
  const currency = usePreferences((s) => s.currency);
  const setCurrency = usePreferences((s) => s.setCurrency);
  const reloadCart = useCart((s) => s.load);
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  if (currencies.length < 2) return null;

  const onChange = (next: string) => {
    setCurrency(next);
    // A year is long enough that a returning shopper keeps their choice.
    document.cookie = `nbp_currency=${next}; path=/; max-age=${60 * 60 * 24 * 365}; samesite=lax`;

    startTransition(() => {
      // Re-render server components so every price on the page moves together,
      // then re-read the cart, which the API prices in the new currency.
      router.refresh();
      void reloadCart();
    });
  };

  const selected = currencies.find((c) => c.code === currency);

  return (
    <div className={compact ? 'relative' : 'relative w-full'}>
      <label htmlFor="currency-switcher" className={compact ? 'sr-only' : 'label'}>
        Currency
      </label>

      <select
        id="currency-switcher"
        value={currency}
        onChange={(e) => onChange(e.target.value)}
        disabled={pending}
        className={
          compact
            ? 'cursor-pointer appearance-none bg-transparent py-2 pl-2 pr-6 font-sans text-micro uppercase tracking-[0.1em] text-current focus:outline-none focus-visible:ring-2 focus-visible:ring-current'
            : 'field appearance-none pr-10'
        }
      >
        {currencies.map((option) => (
          <option key={option.code} value={option.code} className="text-ink-900">
            {compact ? `${option.symbol} ${option.code}` : `${option.code} — ${option.name}`}
          </option>
        ))}
      </select>

      {pending ? (
        <Spinner className={compact ? 'absolute right-1 top-1/2 h-3 w-3 -translate-y-1/2' : 'absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2'} />
      ) : (
        <IconChevronDown
          className={
            compact
              ? 'pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 opacity-60'
              : 'pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400'
          }
        />
      )}

      {!compact && selected && (
        <span className="help">
          Prices convert from Indian Rupees. You are charged the amount shown at checkout.
        </span>
      )}
    </div>
  );
}
