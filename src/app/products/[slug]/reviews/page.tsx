import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getProduct, getProductReviews, absoluteUrl } from '@/lib/server';
import { formatDate, flagFor } from '@/lib/format';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Pagination } from '@/components/Pagination';
import { ProductThumb } from '@/components/ProductImage';
import { EmptyState, Rating } from '@/components/ui';

/**
 * All reviews for one piece.
 *
 * A separate page rather than an endless list on the product page: it keeps the
 * product page fast, and gives the reviews a canonical URL of their own.
 */

export const revalidate = 60;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string; rating?: string; sort?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);
  if (!product) return { title: 'Not found' };

  return {
    title: `Reviews of ${product.name}`,
    description:
      product.rating.count > 0
        ? `${product.rating.count} customer review${product.rating.count === 1 ? '' : 's'} of ${product.name}, rated ${product.rating.average} out of 5.`
        : `Customer reviews of ${product.name}.`,
    alternates: { canonical: absoluteUrl(`/products/${slug}/reviews`) },
  };
}

export default async function ReviewsPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);

  const product = await getProduct(slug);
  if (!product) notFound();

  const page = Number(search.page) || 1;
  const rating = search.rating ? Number(search.rating) : undefined;
  const sort = search.sort ?? 'newest';

  const { items, total, totalPages } = await getProductReviews(slug, { page, rating, sort });

  return (
    <div className="shell py-10 lg:py-14">
      <Breadcrumbs
        items={[
          { label: 'Home', href: '/' },
          { label: 'Shop', href: '/shop' },
          { label: product.name, href: `/products/${slug}` },
          { label: 'Reviews', href: `/products/${slug}/reviews` },
        ]}
      />

      <div className="mx-auto max-w-3xl">
        <header className="flex flex-wrap items-start gap-6 border-b border-ink-100 pb-8">
          <ProductThumb image={product.images[0]} size={88} className="shrink-0" />
          <div className="min-w-0 flex-1">
            <p className="eyebrow">Reviews of</p>
            <h1 className="mt-2 font-serif text-display-sm text-ink-900">
              <Link href={`/products/${slug}`} className="hover:underline hover:underline-offset-4">
                {product.name}
              </Link>
            </h1>
            {product.rating.count > 0 && (
              <div className="mt-3">
                <Rating value={product.rating.average} count={product.rating.count} size="md" />
              </div>
            )}
          </div>
        </header>

        {/* Filter by star rating — links, so each view is shareable */}
        {product.rating.count > 0 && (
          <nav className="mt-6 flex flex-wrap gap-2" aria-label="Filter reviews by rating">
            <Link
              href={`/products/${slug}/reviews`}
              className={
                !rating
                  ? 'border border-ink-900 bg-ink-900 px-3 py-1.5 font-sans text-micro text-paper'
                  : 'border border-ink-200 px-3 py-1.5 font-sans text-micro text-ink-600 hover:border-ink-900'
              }
            >
              All ({product.rating.count})
            </Link>
            {[5, 4, 3, 2, 1].map((star) => {
              const count = product.rating.distribution[String(star)] ?? 0;
              if (!count) return null;
              return (
                <Link
                  key={star}
                  href={`/products/${slug}/reviews?rating=${star}`}
                  className={
                    rating === star
                      ? 'border border-ink-900 bg-ink-900 px-3 py-1.5 font-sans text-micro text-paper'
                      : 'border border-ink-200 px-3 py-1.5 font-sans text-micro text-ink-600 hover:border-ink-900'
                  }
                >
                  {star} ★ ({count})
                </Link>
              );
            })}
          </nav>
        )}

        {items.length === 0 ? (
          <div className="mt-10">
            <EmptyState
              title={rating ? `No ${rating}-star reviews yet` : 'No reviews yet'}
              description={
                rating
                  ? 'Try another rating, or read all of them together.'
                  : 'If you have bought this piece, we would genuinely like to hear how it arrived and how it is living in your home.'
              }
              action={
                <Link href={`/products/${slug}`} className="btn-primary">
                  Back to the piece
                </Link>
              }
            />
          </div>
        ) : (
          <>
            <ul className="mt-8 divide-y divide-ink-100 border-t border-ink-100">
              {items.map((review) => (
                <li key={review.id} className="py-7">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Rating value={review.rating} count={1} showCount={false} />
                    {review.isVerifiedPurchase && (
                      <span className="font-sans text-[0.625rem] uppercase tracking-[0.1em] text-success">
                        Verified purchase
                      </span>
                    )}
                    <span className="font-sans text-micro text-ink-300">{formatDate(review.createdAt)}</span>
                  </div>

                  {review.title && <h2 className="mt-3 font-serif text-lg text-ink-900">{review.title}</h2>}

                  <p className="mt-2 font-serif text-[1.0625rem] leading-[1.75] text-ink-600">{review.body}</p>

                  <p className="mt-3 font-sans text-micro text-ink-400">
                    {review.authorName}
                    {review.authorCountryCode && ` · ${flagFor(review.authorCountryCode)} ${review.authorCountryCode}`}
                  </p>

                  {review.response && (
                    <div className="mt-4 border-l-2 border-ink-200 py-1 pl-4">
                      <p className="font-sans text-micro uppercase tracking-[0.1em] text-ink-400">From the workshop</p>
                      <p className="mt-1.5 font-serif text-[0.9375rem] leading-relaxed text-ink-600">
                        {review.response.body}
                      </p>
                    </div>
                  )}
                </li>
              ))}
            </ul>

            <Pagination page={page} totalPages={totalPages} />
          </>
        )}

        <div className="mt-12 border-t border-ink-100 pt-8">
          <p className="font-sans text-micro leading-relaxed text-ink-400">
            Reviews are read by a person before they appear, and “verified purchase” means the reviewer’s order was
            actually delivered. We do not remove a review for being critical.
          </p>
        </div>
      </div>
    </div>
  );
}
