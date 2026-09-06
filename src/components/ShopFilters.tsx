'use client';

import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useCallback, useState, useTransition } from 'react';
import clsx from 'clsx';
import type { Facets } from '@/lib/types';
import { IconClose, IconChevronDown, Overlay, Spinner } from './ui';

/**
 * Catalogue filters.
 *
 * State lives in the URL, not in React: a filtered view is then shareable,
 * bookmarkable, survives a refresh, and the back button does what a shopper
 * expects. Changing a filter always resets to page one.
 */

const SORT_OPTIONS = [
  { value: 'featured', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'price-asc', label: 'Price: low to high' },
  { value: 'price-desc', label: 'Price: high to low' },
  { value: 'best-selling', label: 'Best selling' },
  { value: 'rating', label: 'Highest rated' },
];

export function ShopFilters({
  facets,
  total,
  showProductTypes = true,
}: {
  facets: Facets;
  total: number;
  showProductTypes?: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [mobileOpen, setMobileOpen] = useState(false);

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(params.toString());
      for (const [key, value] of Object.entries(updates)) {
        if (value === null || value === '') next.delete(key);
        else next.set(key, value);
      }
      // Any filter change invalidates the current page number.
      next.delete('page');
      startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
    },
    [params, pathname, router],
  );

  const activeType = params.get('productType');
  const activeMaterial = params.get('material');
  const activeSort = params.get('sort') ?? 'featured';
  const inStockOnly = params.get('inStock') === 'true';
  const searchTerm = params.get('search');

  const activeCount = [activeType, activeMaterial, inStockOnly ? 'x' : null].filter(Boolean).length;

  const clearAll = () => {
    const next = new URLSearchParams();
    // A search term is what the shopper asked for; clearing filters keeps it.
    if (searchTerm) next.set('search', searchTerm);
    startTransition(() => router.push(`${pathname}?${next}`, { scroll: false }));
  };

  const filterPanel = (
    <div className="space-y-8">
      {showProductTypes && facets.productTypes.length > 0 && (
        <fieldset>
          <legend className="eyebrow mb-4">Shape</legend>
          <ul className="space-y-1">
            {facets.productTypes.map((type) => {
              const selected = activeType === type.slug;
              return (
                <li key={type.slug}>
                  <button
                    type="button"
                    onClick={() => setParam({ productType: selected ? null : type.slug })}
                    aria-pressed={selected}
                    className={clsx(
                      'flex w-full items-center justify-between py-2 font-sans text-[0.875rem] transition-colors',
                      selected ? 'text-ink-900 underline underline-offset-4' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    <span>{type.label}</span>
                    <span className="font-sans text-micro tabular-nums text-ink-300">{type.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      {facets.materials.length > 1 && (
        <fieldset>
          <legend className="eyebrow mb-4">Material</legend>
          <ul className="space-y-1">
            {facets.materials.map((material) => {
              const selected = activeMaterial === material.value;
              return (
                <li key={material.value}>
                  <button
                    type="button"
                    onClick={() => setParam({ material: selected ? null : material.value })}
                    aria-pressed={selected}
                    className={clsx(
                      'flex w-full items-center justify-between py-2 text-left font-sans text-[0.875rem] transition-colors',
                      selected ? 'text-ink-900 underline underline-offset-4' : 'text-ink-500 hover:text-ink-900',
                    )}
                  >
                    <span>{material.value}</span>
                    <span className="font-sans text-micro tabular-nums text-ink-300">{material.count}</span>
                  </button>
                </li>
              );
            })}
          </ul>
        </fieldset>
      )}

      <fieldset>
        <legend className="eyebrow mb-4">Availability</legend>
        <label className="flex cursor-pointer items-center gap-3 py-2">
          <input
            type="checkbox"
            checked={inStockOnly}
            onChange={(e) => setParam({ inStock: e.target.checked ? 'true' : null })}
            className="h-4 w-4 border-ink-300 text-ink-900 focus:ring-ink-900"
          />
          <span className="font-sans text-[0.875rem] text-ink-600">
            In stock only
            <span className="ml-2 font-sans text-micro text-ink-300">{facets.inStockCount}</span>
          </span>
        </label>
      </fieldset>

      {activeCount > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="font-sans text-micro uppercase tracking-[0.1em] text-ink-500 underline underline-offset-4 hover:text-ink-900"
        >
          Clear all filters
        </button>
      )}
    </div>
  );

  // These three siblings are placed directly into the listing page's two-column
  // grid, so each needs to say where it belongs: the toolbar spans the full
  // width, leaving the sidebar and the product grid to fill the row beneath it.
  return (
    <>
      {/* Toolbar */}
      <div className="mb-8 flex items-center justify-between gap-4 border-b border-ink-100 pb-4 lg:col-span-2">
        <p className="font-sans text-micro text-ink-500" aria-live="polite">
          {pending ? (
            <span className="inline-flex items-center gap-2">
              <Spinner className="h-3 w-3" /> Updating…
            </span>
          ) : (
            <>
              {total} {total === 1 ? 'piece' : 'pieces'}
              {searchTerm && <> for “{searchTerm}”</>}
            </>
          )}
        </p>

        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setMobileOpen(true)}
            className="font-sans text-micro uppercase tracking-[0.1em] text-ink-900 underline underline-offset-4 lg:hidden"
          >
            Filter{activeCount > 0 && ` (${activeCount})`}
          </button>

          <div className="relative">
            <label htmlFor="sort" className="sr-only">
              Sort by
            </label>
            <select
              id="sort"
              value={activeSort}
              onChange={(e) => setParam({ sort: e.target.value === 'featured' ? null : e.target.value })}
              className="cursor-pointer appearance-none bg-transparent py-1 pr-6 font-sans text-micro uppercase tracking-[0.1em] text-ink-900 focus:outline-none focus-visible:ring-2 focus-visible:ring-ink-900"
            >
              {SORT_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
            <IconChevronDown className="pointer-events-none absolute right-0 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-ink-400" />
          </div>
        </div>
      </div>

      {/* Desktop sidebar. `self-start` keeps it its own height so it can stick. */}
      <aside className="hidden lg:sticky lg:top-28 lg:block lg:self-start" aria-label="Filters">
        {filterPanel}
      </aside>

      {/* Mobile sheet */}
      <Overlay open={mobileOpen} onClose={() => setMobileOpen(false)} labelledBy="filters-title" side="right">
        <div className="flex items-center justify-between border-b border-ink-100 px-gutter py-5">
          <h2 id="filters-title" className="font-serif text-lg">
            Filter
          </h2>
          <button type="button" onClick={() => setMobileOpen(false)} className="-mr-2 p-2" aria-label="Close filters">
            <IconClose />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto px-gutter py-8">{filterPanel}</div>
        <div className="border-t border-ink-100 px-gutter py-4">
          <button type="button" onClick={() => setMobileOpen(false)} className="btn-primary w-full">
            Show {total} {total === 1 ? 'piece' : 'pieces'}
          </button>
        </div>
      </Overlay>
    </>
  );
}

/** Removable chips for whatever is currently narrowing the list. */
export function ActiveFilterChips({ facets }: { facets: Facets }) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();

  const remove = (key: string) => {
    const next = new URLSearchParams(params.toString());
    next.delete(key);
    next.delete('page');
    router.push(`${pathname}?${next}`, { scroll: false });
  };

  const chips = [
    params.get('productType') && {
      key: 'productType',
      label: facets.productTypes.find((t) => t.slug === params.get('productType'))?.label ?? params.get('productType'),
    },
    params.get('material') && { key: 'material', label: params.get('material') },
    params.get('inStock') === 'true' && { key: 'inStock', label: 'In stock' },
    params.get('search') && { key: 'search', label: `“${params.get('search')}”` },
  ].filter(Boolean) as { key: string; label: string }[];

  if (!chips.length) return null;

  return (
    <ul className="mb-6 flex flex-wrap gap-2">
      {chips.map((chip) => (
        <li key={chip.key}>
          <button
            type="button"
            onClick={() => remove(chip.key)}
            className="inline-flex items-center gap-2 border border-ink-200 py-1.5 pl-3 pr-2 font-sans text-micro text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
          >
            {chip.label}
            <IconClose className="h-3 w-3" />
            <span className="sr-only">Remove filter</span>
          </button>
        </li>
      ))}
    </ul>
  );
}
