import type { Metadata } from 'next';
import Link from 'next/link';
import { Suspense } from 'react';
import { getProducts, getFacets, getCategories, absoluteUrl } from '@/lib/server';
import { ProductGrid } from '@/components/ProductCard';
import { ShopFilters, ActiveFilterChips } from '@/components/ShopFilters';
import { Pagination } from '@/components/Pagination';
import { EmptyState, ProductGridSkeleton } from '@/components/ui';
import { Breadcrumbs } from '@/components/Breadcrumbs';

export const metadata: Metadata = {
  title: 'Shop All Pieces',
  description:
    'Every piece in the workshop: hand-thrown black clay vases, planters, bowls, tableware and engraved work, shipped worldwide from India.',
  alternates: { canonical: absoluteUrl('/shop') },
};

export const revalidate = 60;

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

export default async function ShopPage({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;

  const page = Number(single(params.page)) || 1;
  const query = {
    page,
    limit: 24,
    sort: single(params.sort),
    productType: single(params.productType),
    material: single(params.material),
    search: single(params.search),
    inStock: single(params.inStock),
  };

  const [{ items, total, totalPages }, facets, categories] = await Promise.all([
    getProducts(query),
    getFacets(),
    getCategories(),
  ]);

  const productTypes = categories.filter((c) => c.kind === 'product-type' && c.showInNavigation);
  const searchTerm = single(params.search);
  const hasFilters = Boolean(query.productType || query.material || query.inStock || searchTerm);

  return (
    <div className="shell py-10 lg:py-14">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Shop', href: '/shop' }]} />

      <header className="mb-12 max-w-2xl lg:mb-16">
        <h1 className="font-serif text-display-lg text-ink-900">
          {searchTerm ? `Results for “${searchTerm}”` : 'The collection'}
        </h1>
        {!searchTerm && (
          <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
            Every piece is thrown by hand from the same clay and fired in the same sealed kiln. What changes is the shape,
            and what you intend to do with it.
          </p>
        )}
      </header>

      {/* Shape navigation, as links so each is a crawlable landing page. */}
      {productTypes.length > 0 && !searchTerm && (
        <nav className="scroll-fade no-scrollbar -mx-gutter mb-10 overflow-x-auto px-gutter" aria-label="Shop by shape">
          <ul className="flex gap-2">
            <li>
              <span className="inline-block whitespace-nowrap border border-ink-900 bg-ink-900 px-4 py-2 font-sans text-micro uppercase tracking-[0.1em] text-paper">
                All
              </span>
            </li>
            {productTypes.map((type) => (
              <li key={type.slug}>
                <Link
                  href={`/shop/${type.slug}`}
                  className="inline-block whitespace-nowrap border border-ink-200 px-4 py-2 font-sans text-micro uppercase tracking-[0.1em] text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
                >
                  {type.name}
                </Link>
              </li>
            ))}
          </ul>
        </nav>
      )}

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
        <Suspense fallback={null}>
          <ShopFilters facets={facets} total={total} />
        </Suspense>

        <div className="min-w-0">
          <Suspense fallback={null}>
            <ActiveFilterChips facets={facets} />
          </Suspense>

          <Suspense fallback={<ProductGridSkeleton />}>
            {items.length === 0 ? (
              <EmptyState
                title={searchTerm ? `Nothing matches “${searchTerm}”` : 'No pieces match those filters'}
                description={
                  hasFilters
                    ? 'Try removing a filter, or browse everything currently in the workshop.'
                    : 'The catalogue is empty. If you are setting the store up, run the database seed to load the opening collection.'
                }
                action={
                  <Link href="/shop" className="btn-primary">
                    Browse everything
                  </Link>
                }
              />
            ) : (
              <>
                <ProductGrid products={items} />
                <Pagination page={page} totalPages={totalPages} />
              </>
            )}
          </Suspense>
        </div>
      </div>
    </div>
  );
}
