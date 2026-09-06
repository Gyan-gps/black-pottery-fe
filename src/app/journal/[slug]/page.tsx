import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentPage, getJournal, absoluteUrl } from '@/lib/server';
import { formatDate } from '@/lib/format';
import { ContentBlocks } from '@/components/ContentBlocks';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { ProductImageView } from '@/components/ProductImage';

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ slug: string }>;

export async function generateStaticParams() {
  const articles = await getJournal();
  return articles.map((a) => ({ slug: a.slug }));
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) return { title: 'Article not found' };

  return {
    title: { absolute: page.seo.title },
    description: page.seo.description ?? undefined,
    alternates: { canonical: absoluteUrl(`/journal/${slug}`) },
    openGraph: {
      type: 'article',
      title: page.seo.ogTitle,
      description: page.seo.ogDescription ?? undefined,
      url: absoluteUrl(`/journal/${slug}`),
      publishedTime: page.publishedAt ?? undefined,
      modifiedTime: page.updatedAt ?? undefined,
      images: page.seo.ogImage ? [{ url: page.seo.ogImage.url, alt: page.seo.ogImage.alt }] : undefined,
    },
  };
}

export default async function ArticlePage({ params }: { params: Params }) {
  const { slug } = await params;
  const page = await getContentPage(slug);
  if (!page) notFound();

  // Article schema, so the guide can earn a rich result on the questions it answers.
  const schema = {
    '@context': 'https://schema.org',
    '@type': 'Article',
    headline: page.title,
    description: page.excerpt ?? page.seo.description,
    datePublished: page.publishedAt,
    dateModified: page.updatedAt ?? page.publishedAt,
    image: page.heroImage?.url,
    author: { '@type': 'Organization', name: 'Nizamabad Black Pottery' },
    publisher: { '@type': 'Organization', name: 'Nizamabad Black Pottery' },
    mainEntityOfPage: absoluteUrl(`/journal/${slug}`),
  };

  return (
    <article className="pb-section">
      <div className="shell pt-10">
        <Breadcrumbs
          items={[
            { label: 'Home', href: '/' },
            { label: 'Journal', href: '/journal' },
            { label: page.title, href: `/journal/${slug}` },
          ]}
        />

        <header className="mx-auto max-w-prose">
          <p className="eyebrow mb-4">
            {page.type === 'guide' ? 'Guide' : 'Article'}
            {page.readingMinutes ? ` · ${page.readingMinutes} min read` : ''}
          </p>
          <h1 className="font-serif text-display-lg text-ink-900">{page.title}</h1>
          {page.excerpt && <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">{page.excerpt}</p>}
          <p className="mt-6 font-sans text-micro text-ink-300">
            Published {formatDate(page.publishedAt)}
            {page.updatedAt && page.updatedAt !== page.publishedAt && ` · updated ${formatDate(page.updatedAt)}`}
          </p>
        </header>
      </div>

      {page.heroImage && (
        <div className="shell mt-12">
          <ProductImageView image={page.heroImage} sizes="100vw" priority aspect="wide" />
        </div>
      )}

      <ContentBlocks blocks={page.blocks} />

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </article>
  );
}
