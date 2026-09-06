import type { Metadata } from 'next';
import Link from 'next/link';
import { getJournal, absoluteUrl } from '@/lib/server';
import { formatDate } from '@/lib/format';
import { ProductImageView } from '@/components/ProductImage';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { EmptyState } from '@/components/ui';

export const metadata: Metadata = {
  title: 'Journal',
  description:
    'Guides and writing on black pottery: how it is made, how to care for it, and how to tell handmade work from machine-made.',
  alternates: { canonical: absoluteUrl('/journal') },
};

export const revalidate = 300;

export default async function JournalPage() {
  const articles = await getJournal();

  return (
    <div className="shell py-10 lg:py-14">
      <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: 'Journal', href: '/journal' }]} />

      <header className="mb-14 max-w-2xl">
        <h1 className="font-serif text-display-lg text-ink-900">Journal</h1>
        <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
          Writing about the craft, written to be useful rather than to rank. Mostly answers to questions people actually
          ask us.
        </p>
      </header>

      {articles.length === 0 ? (
        <EmptyState
          title="Nothing published yet"
          description="Articles and guides are written in the admin panel. Once one is published it will appear here."
          action={
            <Link href="/craft" className="btn-primary">
              Read about the craft
            </Link>
          }
        />
      ) : (
        <div className="grid gap-10 md:grid-cols-2 lg:grid-cols-3 lg:gap-x-8 lg:gap-y-14">
          {articles.map((article) => (
            <article key={article.key}>
              <Link href={`/journal/${article.slug}`} className="group block">
                <ProductImageView
                  image={article.heroImage as any}
                  sizes="(min-width: 1024px) 30vw, (min-width: 768px) 45vw, 92vw"
                  aspect="wide"
                  imageClassName="transition-transform duration-[900ms] ease-craft group-hover:scale-[1.03]"
                />
                <p className="eyebrow mt-5">
                  {article.type === 'guide' ? 'Guide' : 'Article'}
                  {article.readingMinutes ? ` · ${article.readingMinutes} min read` : ''}
                </p>
                <h2 className="mt-2 font-serif text-xl leading-snug text-ink-900 group-hover:underline group-hover:underline-offset-4">
                  {article.title}
                </h2>
                {article.excerpt && (
                  <p className="mt-2 font-serif text-[0.9375rem] leading-relaxed text-ink-500">{article.excerpt}</p>
                )}
                <p className="mt-3 font-sans text-micro text-ink-300">{formatDate(article.publishedAt)}</p>
              </Link>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
