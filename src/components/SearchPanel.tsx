'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { request } from '@/lib/api';
import { usePreferences, track } from '@/lib/store';
import { formatMoney } from '@/lib/format';
import type { ProductCard } from '@/lib/types';
import { IconClose, IconSearch, Overlay, Spinner } from './ui';
import { ProductThumb } from './ProductImage';

type Suggestions = {
  products: ProductCard[];
  categories: { name: string; slug: string }[];
  collections: { title: string; slug: string }[];
};

const EMPTY: Suggestions = { products: [], categories: [], collections: [] };

/**
 * Search with type-ahead. Debounced, request-versioned so a slow response cannot
 * overwrite a newer one, and it always offers a full-results escape hatch rather
 * than trapping the shopper in a suggestion list.
 */
export function SearchPanel({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [term, setTerm] = useState('');
  const [results, setResults] = useState<Suggestions>(EMPTY);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const requestVersion = useRef(0);
  const router = useRouter();
  const currency = usePreferences((s) => s.currency);

  useEffect(() => {
    if (!open) {
      setTerm('');
      setResults(EMPTY);
      return;
    }
    const timer = window.setTimeout(() => inputRef.current?.focus(), 60);
    return () => window.clearTimeout(timer);
  }, [open]);

  useEffect(() => {
    const query = term.trim();
    if (query.length < 2) {
      setResults(EMPTY);
      setLoading(false);
      return;
    }

    setLoading(true);
    const version = ++requestVersion.current;

    const timer = window.setTimeout(async () => {
      try {
        const { data } = await request<Suggestions>(
          `/catalog/products/search-suggestions?q=${encodeURIComponent(query)}`,
          { currency, revalidate: false },
        );
        // Discard a response that a newer keystroke has already superseded.
        if (version === requestVersion.current) setResults(data);
      } catch {
        if (version === requestVersion.current) setResults(EMPTY);
      } finally {
        if (version === requestVersion.current) setLoading(false);
      }
    }, 220);

    return () => window.clearTimeout(timer);
  }, [term, currency]);

  const submit = (event: React.FormEvent) => {
    event.preventDefault();
    const query = term.trim();
    if (!query) return;
    track('search', { searchQuery: query });
    router.push(`/shop?search=${encodeURIComponent(query)}`);
    onClose();
  };

  const hasResults = results.products.length + results.categories.length + results.collections.length > 0;
  const searchedEnough = term.trim().length >= 2;

  return (
    <Overlay open={open} onClose={onClose} labelledBy="search-title" side="center" className="max-h-[85vh] max-w-2xl">
      <div className="flex items-center gap-3 border-b border-ink-100 px-5 py-4">
        <IconSearch className="h-5 w-5 shrink-0 text-ink-400" />
        <form onSubmit={submit} className="flex-1" role="search">
          <h2 id="search-title" className="sr-only">
            Search the shop
          </h2>
          <label htmlFor="search-input" className="sr-only">
            Search for a piece
          </label>
          <input
            ref={inputRef}
            id="search-input"
            type="search"
            value={term}
            onChange={(e) => setTerm(e.target.value)}
            placeholder="Search vases, planters, tableware…"
            autoComplete="off"
            className="w-full bg-transparent py-1.5 font-sans text-base text-ink-900 placeholder:text-ink-300 focus:outline-none"
          />
        </form>
        {loading && <Spinner className="h-4 w-4 text-ink-400" />}
        <button type="button" onClick={onClose} className="-mr-1 p-1.5 text-ink-400 hover:text-ink-900" aria-label="Close search">
          <IconClose className="h-5 w-5" />
        </button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto">
        {!searchedEnough && (
          <div className="px-5 py-8">
            <p className="eyebrow mb-4">Popular</p>
            <div className="flex flex-wrap gap-2">
              {['Vases', 'Planters', 'Tableware', 'Engraved', 'Gifts under ₹2,500'].map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setTerm(suggestion)}
                  className="border border-ink-200 px-3 py-1.5 font-sans text-micro text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>
        )}

        {searchedEnough && !loading && !hasResults && (
          <div className="px-5 py-12 text-center">
            <p className="font-serif text-lg text-ink-900">No pieces match “{term.trim()}”.</p>
            <p className="mt-2 font-sans text-[0.8125rem] text-ink-500">
              Try a shape — vase, bowl, planter — or browse the full collection.
            </p>
            <Link href="/shop" onClick={onClose} className="btn-secondary btn-sm mt-6">
              Browse everything
            </Link>
          </div>
        )}

        {hasResults && (
          <div className="px-5 py-5">
            {results.products.length > 0 && (
              <section>
                <h3 className="eyebrow mb-3">Pieces</h3>
                <ul className="space-y-1">
                  {results.products.map((product) => (
                    <li key={product.id}>
                      <Link
                        href={`/products/${product.slug}`}
                        onClick={onClose}
                        className="flex items-center gap-4 rounded-sm px-2 py-2.5 transition-colors hover:bg-ink-50"
                      >
                        <ProductThumb image={product.image} size={52} className="shrink-0" />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate font-serif text-[0.9375rem] text-ink-900">{product.name}</span>
                          {product.category && (
                            <span className="block font-sans text-micro text-ink-400">{product.category.name}</span>
                          )}
                        </span>
                        <span className="shrink-0 font-sans text-[0.8125rem] tabular-nums text-ink-600">
                          {formatMoney(product.price)}
                        </span>
                      </Link>
                    </li>
                  ))}
                </ul>
              </section>
            )}

            {(results.categories.length > 0 || results.collections.length > 0) && (
              <section className="mt-6 border-t border-ink-100 pt-5">
                <h3 className="eyebrow mb-3">Browse</h3>
                <div className="flex flex-wrap gap-2">
                  {results.categories.map((category) => (
                    <Link
                      key={category.slug}
                      href={`/shop/${category.slug}`}
                      onClick={onClose}
                      className="border border-ink-200 px-3 py-1.5 font-sans text-micro text-ink-600 hover:border-ink-900 hover:text-ink-900"
                    >
                      {category.name}
                    </Link>
                  ))}
                  {results.collections.map((collection) => (
                    <Link
                      key={collection.slug}
                      href={`/collections/${collection.slug}`}
                      onClick={onClose}
                      className="border border-ink-200 px-3 py-1.5 font-sans text-micro text-ink-600 hover:border-ink-900 hover:text-ink-900"
                    >
                      {collection.title}
                    </Link>
                  ))}
                </div>
              </section>
            )}

            <button
              type="button"
              onClick={submit}
              className="mt-6 w-full border-t border-ink-100 pt-4 text-left font-sans text-micro uppercase tracking-[0.1em] text-ink-600 hover:text-ink-900"
            >
              See all results for “{term.trim()}” →
            </button>
          </div>
        )}
      </div>
    </Overlay>
  );
}
