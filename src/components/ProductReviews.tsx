import Link from 'next/link';
import type { Review } from '@/lib/types';
import { formatDate, flagFor } from '@/lib/format';
import { Rating } from './ui';

/**
 * Reviews. Shows the rating distribution because a 4.6 built from thirty reviews
 * means something different to a 4.6 built from three, and a shopper deserves to
 * see which they are looking at.
 */
export function ProductReviews({
  reviews,
  total,
  rating,
  productSlug,
}: {
  reviews: Review[];
  total: number;
  rating: { average: number; count: number; distribution: Record<string, number> };
  productSlug: string;
}) {
  if (!rating.count) {
    return (
      <section id="reviews" className="scroll-mt-28 border-t border-ink-100 py-section">
        <div className="shell">
          <h2 className="font-serif text-display-sm text-ink-900">Reviews</h2>
          <p className="mt-4 max-w-prose font-serif text-[1.0625rem] leading-relaxed text-ink-500">
            No reviews yet. If you have bought this piece, we would genuinely like to hear how it arrived and how it is
            living in your home.
          </p>
        </div>
      </section>
    );
  }

  const maxCount = Math.max(...[5, 4, 3, 2, 1].map((star) => rating.distribution[String(star)] ?? 0), 1);

  return (
    <section id="reviews" className="scroll-mt-28 border-t border-ink-100 py-section">
      <div className="shell">
        <h2 className="font-serif text-display-sm text-ink-900">
          Reviews <span className="text-ink-400">({rating.count})</span>
        </h2>

        <div className="mt-10 grid gap-12 lg:grid-cols-[18rem_1fr] lg:gap-16">
          {/* Summary */}
          <div>
            <div className="flex items-baseline gap-3">
              <span className="font-serif text-5xl tabular-nums text-ink-900">{rating.average.toFixed(1)}</span>
              <span className="font-sans text-micro text-ink-400">out of 5</span>
            </div>
            <div className="mt-3">
              <Rating value={rating.average} count={rating.count} showCount={false} size="md" />
            </div>

            <ul className="mt-6 space-y-2">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = rating.distribution[String(star)] ?? 0;
                return (
                  <li key={star} className="flex items-center gap-3">
                    <span className="w-8 shrink-0 font-sans text-micro tabular-nums text-ink-500">{star} ★</span>
                    <span className="h-1.5 flex-1 bg-ink-100" role="presentation">
                      <span
                        className="block h-full bg-ink-700"
                        style={{ width: `${(count / maxCount) * 100}%` }}
                      />
                    </span>
                    <span className="w-6 shrink-0 text-right font-sans text-micro tabular-nums text-ink-400">{count}</span>
                  </li>
                );
              })}
            </ul>

            <p className="mt-6 font-sans text-micro leading-relaxed text-ink-400">
              Reviews are read by a person before they appear, and “verified purchase” means the reviewer’s order was
              actually delivered.
            </p>
          </div>

          {/* Reviews */}
          <div>
            <ul className="divide-y divide-ink-100">
              {reviews.map((review) => (
                <li key={review.id} className="py-7 first:pt-0">
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
                    <Rating value={review.rating} count={1} showCount={false} />
                    {review.isVerifiedPurchase && (
                      <span className="font-sans text-[0.625rem] uppercase tracking-[0.1em] text-success">
                        Verified purchase
                      </span>
                    )}
                    <span className="font-sans text-micro text-ink-300">{formatDate(review.createdAt)}</span>
                  </div>

                  {review.title && <h3 className="mt-3 font-serif text-lg text-ink-900">{review.title}</h3>}

                  <p className="mt-2 max-w-prose font-serif text-[1.0625rem] leading-[1.75] text-ink-600">
                    {review.body}
                  </p>

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

            {total > reviews.length && (
              <Link
                href={`/products/${productSlug}/reviews`}
                className="btn-secondary btn-sm mt-8"
              >
                Read all {total} reviews
              </Link>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}
