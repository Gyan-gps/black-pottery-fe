import Link from 'next/link';

/**
 * 404. Tells the visitor what happened and offers the two things they most
 * likely wanted, rather than a dead end.
 */
export default function NotFound() {
  return (
    <div className="shell flex min-h-[70vh] items-center py-section">
      <div className="mx-auto max-w-lg text-center">
        <p className="eyebrow">404</p>
        <h1 className="mt-4 font-serif text-display-lg text-ink-900">This page does not exist</h1>
        <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
          The link may be old, or a piece may have sold out and been retired. Everything currently in the workshop is in
          the shop.
        </p>
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Link href="/shop" className="btn-primary">
            Explore the collection
          </Link>
          <Link href="/" className="btn-secondary">
            Back to the homepage
          </Link>
        </div>
      </div>
    </div>
  );
}
