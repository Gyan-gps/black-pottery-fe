import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { Suspense } from 'react';
import { getProducts, getFacets, getCategories, absoluteUrl } from '@/lib/server';
import { ProductGrid } from '@/components/ProductCard';
import { ShopFilters, ActiveFilterChips } from '@/components/ShopFilters';
import { Pagination } from '@/components/Pagination';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState, ProductGridSkeleton } from '@/components/ui';

/**
 * A shape's landing page — /shop/vases. These carry the real search intent
 * ("black clay planter"), so each gets its own title, description and canonical.
 */

export const revalidate = 60;

type Params = Promise<{ category: string }>;
type SearchParams = Promise<Record<string, string | string[] | undefined>>;

const single = (value: string | string[] | undefined) => (Array.isArray(value) ? value[0] : value);

/** Pre-builds every shape page at deploy time; there are only a handful. */
export async function generateStaticParams() {
  const categories = await getCategories();
  return categories.filter((c) => c.kind === 'product-type').map((c) => ({ category: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { category: slug } = await params;
  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);

  if (!category) return { title: 'Not found' };

  const title = `${category.name} | Handmade Black Clay`;
  const description =
    category.shortDescription
      ? `${category.shortDescription} Hand-thrown black clay ${category.name.toLowerCase()}, made in India and shipped worldwide.`
      : `Hand-thrown black clay ${category.name.toLowerCase()}, made in India and shipped worldwide.`;

  return {
    title,
    description,
    alternates: { canonical: absoluteUrl(`/shop/${slug}`) },
    openGraph: { title, description, url: absoluteUrl(`/shop/${slug}`) },
  };
}

export default async function CategoryPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ category: slug }, search] = await Promise.all([params, searchParams]);

  const categories = await getCategories();
  const category = categories.find((c) => c.slug === slug);
  if (!category) notFound();

  const page = Number(single(search.page)) || 1;

  const [{ items, total, totalPages }, facets] = await Promise.all([
    getProducts({
      category: slug,
      page,
      limit: 24,
      sort: single(search.sort),
      material: single(search.material),
      inStock: single(search.inStock),
    }),
    getFacets(slug),
  ]);

  const siblings = categories.filter((c) => c.kind === 'product-type' && c.showInNavigation);

  return (
    <div className="shell py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: category.name, href: `/shop/${slug}` },
        ]}
      />

      <header className="mb-12 max-w-2xl lg:mb-16">
        <h1 className="font-serif text-display-lg text-ink-900">{category.name}</h1>
        {category.shortDescription && (
          <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">{category.shortDescription}</p>
        )}
      </header>

      <nav className="scroll-fade no-scrollbar -mx-gutter mb-10 overflow-x-auto px-gutter" aria-label="Shop by shape">
        <ul className="flex gap-2">
          <li>
            <Link
              href="/shop"
              className="inline-block whitespace-nowrap border border-ink-200 px-4 py-2 font-sans text-micro uppercase tracking-[0.1em] text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900"
            >
              All
            </Link>
          </li>
          {siblings.map((sibling) => (
            <li key={sibling.slug}>
              <Link
                href={`/shop/${sibling.slug}`}
                aria-current={sibling.slug === slug ? 'page' : undefined}
                className={
                  sibling.slug === slug
                    ? 'inline-block whitespace-nowrap border border-ink-900 bg-ink-900 px-4 py-2 font-sans text-micro uppercase tracking-[0.1em] text-paper'
                    : 'inline-block whitespace-nowrap border border-ink-200 px-4 py-2 font-sans text-micro uppercase tracking-[0.1em] text-ink-600 transition-colors hover:border-ink-900 hover:text-ink-900'
                }
              >
                {sibling.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      <div className="lg:grid lg:grid-cols-[15rem_1fr] lg:gap-14">
        <Suspense fallback={null}>
          {/* The shape is already fixed by the URL, so it is not offered as a filter. */}
          <ShopFilters facets={facets} total={total} showProductTypes={false} />
        </Suspense>

        <div className="min-w-0">
          <Suspense fallback={null}>
            <ActiveFilterChips facets={facets} />
          </Suspense>

          <Suspense fallback={<ProductGridSkeleton />}>
            {items.length === 0 ? (
              <EmptyState
                title={`No ${category.name.toLowerCase()} available right now`}
                description="Pieces are made in small batches, so shapes come and go. Have a look at what else is in the workshop."
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
