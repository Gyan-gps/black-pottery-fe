'use client';

import Link from 'next/link';
import { usePathname, useSearchParams } from 'next/navigation';
import clsx from 'clsx';
import { IconChevronLeft, IconChevronRight } from './ui';

/**
 * Pagination as real links, not buttons: a crawler can follow them, and a shopper
 * can open page three in a new tab. Ellipses keep the control to one line on a
 * phone however many pages there are.
 */
export function Pagination({ page, totalPages }: { page: number; totalPages: number }) {
  const pathname = usePathname();
  const params = useSearchParams();

  if (totalPages <= 1) return null;

  const hrefFor = (target: number) => {
    const next = new URLSearchParams(params.toString());
    if (target <= 1) next.delete('page');
    else next.set('page', String(target));
    const query = next.toString();
    return query ? `${pathname}?${query}` : pathname;
  };

  // Always show first, last, current and its neighbours; elide the rest.
  const pages: (number | 'gap')[] = [];
  for (let i = 1; i <= totalPages; i += 1) {
    if (i === 1 || i === totalPages || Math.abs(i - page) <= 1) pages.push(i);
    else if (pages[pages.length - 1] !== 'gap') pages.push('gap');
  }

  return (
    <nav className="mt-16 flex items-center justify-center gap-1" aria-label="Pagination">
      <Link
        href={hrefFor(page - 1)}
        scroll
        aria-label="Previous page"
        aria-disabled={page <= 1}
        tabIndex={page <= 1 ? -1 : undefined}
        className={clsx(
          'flex h-10 w-10 items-center justify-center text-ink-600 transition-colors hover:text-ink-900',
          page <= 1 && 'pointer-events-none opacity-30',
        )}
      >
        <IconChevronLeft className="h-4 w-4" />
      </Link>

      {pages.map((entry, index) =>
        entry === 'gap' ? (
          <span key={`gap-${index}`} className="px-1 font-sans text-micro text-ink-300" aria-hidden="true">
            …
          </span>
        ) : (
          <Link
            key={entry}
            href={hrefFor(entry)}
            scroll
            aria-current={entry === page ? 'page' : undefined}
            className={clsx(
              'flex h-10 min-w-10 items-center justify-center px-2 font-sans text-[0.8125rem] tabular-nums transition-colors',
              entry === page ? 'bg-ink-900 text-paper' : 'text-ink-600 hover:text-ink-900',
            )}
          >
            {entry}
          </Link>
        ),
      )}

      <Link
        href={hrefFor(page + 1)}
        scroll
        aria-label="Next page"
        aria-disabled={page >= totalPages}
        tabIndex={page >= totalPages ? -1 : undefined}
        className={clsx(
          'flex h-10 w-10 items-center justify-center text-ink-600 transition-colors hover:text-ink-900',
          page >= totalPages && 'pointer-events-none opacity-30',
        )}
      >
        <IconChevronRight className="h-4 w-4" />
      </Link>
    </nav>
  );
}
