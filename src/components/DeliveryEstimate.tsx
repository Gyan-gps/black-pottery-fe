'use client';

import { useEffect, useState } from 'react';
import { post } from '@/lib/api';
import { ApiClientError } from '@/lib/api';
import { usePreferences } from '@/lib/store';
import { formatMoney, formatDeliveryWindow, flagFor } from '@/lib/format';
import type { Country, Product, ShippingQuote } from '@/lib/types';
import { IconTruck, IconChevronDown, Spinner } from './ui';

/**
 * "Delivery to …" on the product page.
 *
 * A shopper in Berlin should not have to reach the payment step to learn what
 * shipping costs or that duty is collected on arrival. This asks the same
 * shipping service checkout uses, so the figure shown here is the figure charged.
 */
export function DeliveryEstimate({ product }: { product: Product }) {
  const country = usePreferences((s) => s.country);
  const setCountry = usePreferences((s) => s.setCountry);
  const currency = usePreferences((s) => s.currency);

  const [countries, setCountries] = useState<Country[]>([]);
  const [quote, setQuote] = useState<ShippingQuote | null>(null);
  const [loading, setLoading] = useState(false);
  const [problem, setProblem] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const selected = country ?? 'IN';
  const restricted = product.excludedCountryCodes.includes(selected);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { get } = await import('@/lib/api');
        const data = await get<Country[]>('/geo/countries');
        if (!cancelled) setCountries(data);
      } catch {
        /* The estimate simply will not offer a country picker. */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (restricted) {
      setQuote(null);
      setProblem(null);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setProblem(null);

    (async () => {
      try {
        const data = await post<ShippingQuote>(
          '/geo/shipping-estimate',
          {
            countryCode: selected,
            items: [{ quantity: 1, weightGrams: product.weight?.value ?? 1200, isFragile: product.isFragile }],
            subtotalMinor: product.price.amount,
          },
          { currency, country: selected },
        );
        if (!cancelled) setQuote(data);
      } catch (error) {
        if (!cancelled) {
          setQuote(null);
          setProblem(
            error instanceof ApiClientError
              ? error.message
              : 'We could not work out shipping just now. It will be calculated at checkout.',
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [selected, currency, product.weight?.value, product.isFragile, product.price.amount, restricted]);

  const cheapest = quote?.options[0];
  const countryName = countries.find((c) => c.code === selected)?.name ?? selected;

  return (
    <div className="border border-ink-100 bg-white">
      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 px-4 py-3.5">
        <IconTruck className="h-5 w-5 shrink-0 text-ink-400" />

        <label htmlFor="delivery-country" className="sr-only">
          Delivery country
        </label>
        <span className="font-sans text-[0.8125rem] text-ink-500">Deliver to</span>

        <div className="relative">
          <select
            id="delivery-country"
            value={selected}
            onChange={(e) => setCountry(e.target.value)}
            className="cursor-pointer appearance-none border-b border-dashed border-ink-300 bg-transparent py-1 pr-5 font-sans text-[0.8125rem] text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900"
          >
            {countries.length === 0 && <option value={selected}>{selected}</option>}
            {countries.map((option) => (
              <option key={option.code} value={option.code}>
                {option.flag ? `${option.flag} ` : ''}
                {option.name}
              </option>
            ))}
          </select>
          <IconChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3 w-3 -translate-y-1/2 text-ink-400" />
        </div>

        {loading && <Spinner className="h-3.5 w-3.5 text-ink-400" />}
      </div>

      <div className="border-t border-ink-100 px-4 py-3.5">
        {restricted ? (
          <p className="font-sans text-[0.8125rem] leading-relaxed text-warning">
            This piece cannot be shipped to {countryName} — it is too large or fragile for the services available there.
            Everything else in the shop can be.
          </p>
        ) : problem ? (
          <p className="font-sans text-[0.8125rem] leading-relaxed text-ink-500">{problem}</p>
        ) : cheapest ? (
          <>
            <p className="font-sans text-[0.8125rem] text-ink-900">
              <span className="tabular-nums">
                {cheapest.isFree ? 'Free' : formatMoney(cheapest.price)}
              </span>
              {' · arrives '}
              <span className="tabular-nums">
                {formatDeliveryWindow(cheapest.estimatedDeliveryFrom, cheapest.estimatedDeliveryTo)}
              </span>
            </p>

            {quote.options.length > 1 && (
              <button
                type="button"
                onClick={() => setExpanded((v) => !v)}
                aria-expanded={expanded}
                className="mt-2 font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900"
              >
                {expanded ? 'Hide other options' : `${quote.options.length - 1} faster option${quote.options.length > 2 ? 's' : ''}`}
              </button>
            )}

            {expanded && (
              <ul className="mt-3 space-y-2 border-t border-ink-100 pt-3">
                {quote.options.slice(1).map((option) => (
                  <li key={option.methodCode} className="flex justify-between gap-4 font-sans text-micro text-ink-500">
                    <span>
                      {option.methodName} · {formatDeliveryWindow(option.estimatedDeliveryFrom, option.estimatedDeliveryTo)}
                    </span>
                    <span className="tabular-nums text-ink-900">
                      {option.isFree ? 'Free' : formatMoney(option.price)}
                    </span>
                  </li>
                ))}
              </ul>
            )}

            {/* Duty disclosure, so nothing is a surprise on the doorstep. */}
            {cheapest.incoterm === 'DDU' && quote.duties.rate > 0 && (
              <p className="mt-3 font-sans text-micro leading-relaxed text-ink-400">
                {quote.duties.label ?? 'Import duties'} of roughly {quote.duties.rate}% are collected by the carrier when it
                arrives. This is an estimate — customs set the final amount.
              </p>
            )}
          </>
        ) : (
          <p className="font-sans text-[0.8125rem] text-ink-400">Choose a country to see delivery cost and timing.</p>
        )}
      </div>
    </div>
  );
}
