import Link from 'next/link';
import { SITE_URL } from '@/lib/api';

/**
 * Breadcrumbs plus their structured data. The trail is rendered as links and
 * emitted as BreadcrumbList JSON-LD from the same array, so the two can never
 * drift apart.
 */
export function Breadcrumbs({ items }: { items: { label: string; href: string }[] }) {
  if (items.length < 2) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'BreadcrumbList',
    itemListElement: items.map((item, index) => ({
      '@type': 'ListItem',
      position: index + 1,
      name: item.label,
      item: `${SITE_URL.replace(/\/$/, '')}${item.href}`,
    })),
  };

  return (
    <>
      <nav aria-label="Breadcrumb" className="mb-8">
        <ol className="flex flex-wrap items-center gap-x-2 gap-y-1 font-sans text-micro text-ink-400">
          {items.map((item, index) => {
            const isLast = index === items.length - 1;
            return (
              <li key={item.href} className="flex items-center gap-2">
                {isLast ? (
                  // The current page is not a link — it is where you already are.
                  <span aria-current="page" className="text-ink-600">
                    {item.label}
                  </span>
                ) : (
                  <>
                    <Link href={item.href} className="transition-colors hover:text-ink-900">
                      {item.label}
                    </Link>
                    <span aria-hidden="true">/</span>
                  </>
                )}
              </li>
            );
          })}
        </ol>
      </nav>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
