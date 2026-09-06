import type { Metadata } from 'next';
import Link from 'next/link';
import { getCollections, absoluteUrl } from '@/lib/server';
import { ProductImageView } from '@/components/ProductImage';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Collections',
  description:
    'Edits of black clay pottery grouped by what they are for — the table, plants and stems, and the engraved work.',
  alternates: { canonical: absoluteUrl('/collections') },
};

export const revalidate = 300;

export default async function CollectionsPage() {
  const collections = await getCollections();

  return (
    <div className="shell py-10 lg:py-14">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Collections', href: '/collections' }]} />

      <header className="mb-14 max-w-2xl">
        <h1 className="font-serif text-display-lg text-ink-900">Collections</h1>
        <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
          The same clay and the same firing throughout. These are simply the pieces grouped by what you might want them
          to do.
        </p>
      </header>

      {collections.length === 0 ? (
        <EmptyState
          title="No collections yet"
          description="Collections are curated in the admin panel. Once one is published it will appear here."
          action={
            <Link href="/shop" className="btn-primary">
              Browse everything
            </Link>
          }
        />
      ) : (
        <div className="grid gap-8 md:grid-cols-2 lg:gap-12">
          {collections.map((collection) => (
            <Link key={collection.id} href={`/collections/${collection.slug}`} className="group block">
              <ProductImageView
                image={collection.heroImage}
                sizes="(min-width: 768px) 45vw, 92vw"
                aspect="wide"
                imageClassName="transition-transform duration-[900ms] ease-craft group-hover:scale-[1.03]"
              />
              <h2 className="mt-5 font-serif text-display-sm text-ink-900 group-hover:underline group-hover:underline-offset-4">
                {collection.title}
              </h2>
              {collection.subtitle && (
                <p className="mt-2 font-serif text-lg text-ink-500">{collection.subtitle}</p>
              )}
              {collection.description && (
                <p className="mt-3 max-w-prose font-serif text-[0.9375rem] leading-relaxed text-ink-500">
                  {collection.description}
                </p>
              )}
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
