import { ProductGridSkeleton } from '@/components/ui';

/**
 * Listing-segment loading state.
 *
 * Deliberately scoped to segments that always resolve to a page. A root-level
 * loading.tsx would wrap every route in a Suspense boundary, letting Next stream
 * a 200 shell before `notFound()` runs — which turns a genuine 404 into a soft
 * 404 and tells search engines a missing product still exists.
 */
export default function ShopLoading() {
  return (
    <div className="shell py-10 lg:py-14">
      <div className="skeleton h-3 w-32" />
      <div className="mt-8 skeleton h-12 w-80" />
      <div className="mt-5 space-y-2">
        <div className="skeleton h-4 w-full max-w-xl" />
        <div className="skeleton h-4 w-full max-w-md" />
      </div>
      <div className="mt-14">
        <ProductGridSkeleton count={8} />
      </div>
    </div>
  );
}
