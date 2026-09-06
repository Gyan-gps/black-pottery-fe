import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { getCollection, getCollections, absoluteUrl } from '@/lib/server';
import { toParagraphs } from '@/lib/format';
import { ProductGrid } from '@/components/ProductCard';
import { ProductImageView } from '@/components/ProductImage';
import { Pagination } from '@/components/Pagination';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/ui';

export const revalidate = 60;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ page?: string }>;

export async function generateStaticParams() {
  const collections = await getCollections();
  return collections.map((c) => ({ slug: c.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const result = await getCollection(slug);
  if (!result) return { title: 'Collection not found' };

  const { collection } = result;
  const title = collection.seo?.title ?? collection.title;
  const description = collection.seo?.description ?? collection.description ?? undefined;

  return {
    title: collection.seo?.title ? { absolute: title } : title,
    description,
    alternates: { canonical: absoluteUrl(`/collections/${slug}`) },
    openGraph: {
      title,
      description,
      url: absoluteUrl(`/collections/${slug}`),
      images: collection.heroImage ? [{ url: collection.heroImage.url, alt: collection.heroImage.alt }] : undefined,
    },
  };
}

export default async function CollectionPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, search] = await Promise.all([params, searchParams]);
  const page = Number(search.page) || 1;

  const result = await getCollection(slug, { page, limit: 24 });
  if (!result) notFound();

  const { collection, items, totalPages } = result;

  return (
    <>
      {collection.heroImage && (
        <div className="relative isolate">
          <ProductImageView
            image={collection.heroImage}
            sizes="100vw"
            priority
            aspect="none"
            className="h-[42vh] w-full lg:h-[52vh]"
            imageClassName="object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/80 to-ink-950/20" />
          <div className="shell absolute inset-x-0 bottom-0 pb-10 lg:pb-16">
            <h1 className="max-w-3xl font-serif text-display-lg text-paper">{collection.title}</h1>
            {collection.subtitle && (
              <p className="mt-4 max-w-xl font-serif text-lg text-paper/70">{collection.subtitle}</p>
            )}
          </div>
        </div>
      )}

      <div className="shell py-10 lg:py-14">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Collections', href: '/collections' },
            { label: collection.title, href: `/collections/${slug}` },
          ]}
        />

        {!collection.heroImage && (
          <header className="mb-12 max-w-2xl">
            <h1 className="font-serif text-display-lg text-ink-900">{collection.title}</h1>
            {collection.subtitle && <p className="mt-4 font-serif text-lg text-ink-500">{collection.subtitle}</p>}
          </header>
        )}

        {collection.description && (
          <div className="prose-craft mb-14 max-w-prose">
            {toParagraphs(collection.description).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}

        {items.length === 0 ? (
          <EmptyState
            title="Nothing in this collection right now"
            description="Pieces are made in small batches, so a collection can empty out between firings."
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

        {collection.story && (
          <div className="prose-craft mx-auto mt-section max-w-prose border-t border-ink-100 pt-14">
            {toParagraphs(collection.story).map((paragraph, index) => (
              <p key={index}>{paragraph}</p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
