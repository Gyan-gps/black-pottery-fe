'use client';

import { useEffect } from 'react';
import Link from 'next/link';

/**
 * The route-level error boundary. Shows what we can honestly say — something on
 * our side failed — plus a retry that actually re-renders rather than a reload
 * that loses state.
 */
export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    // Surfaced in the browser console in development; a real deployment would
    // forward this to an error tracker.
    console.error('Page error:', error);
  }, [error]);

  return (
    <div className="shell flex min-h-[70vh] items-center py-section">
      <div className="mx-auto max-w-lg text-center">
        <h1 className="font-serif text-display-md text-ink-900">Something failed on our side</h1>
        <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
          This is our problem, not yours — nothing in your basket has been lost. Trying again usually works.
        </p>

        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <button type="button" onClick={reset} className="btn-primary">
            Try again
          </button>
          <Link href="/" className="btn-secondary">
            Back to the homepage
          </Link>
        </div>

        {error.digest && (
          <p className="mt-10 font-sans text-micro text-ink-300">
            If you contact us, quoting <span className="font-mono">{error.digest}</span> will help us find what went
            wrong.
          </p>
        )}
      </div>
    </div>
  );
}
