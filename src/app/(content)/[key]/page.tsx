import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getContentPage, absoluteUrl } from '@/lib/server';
import { ContentBlocks } from '@/components/ContentBlocks';
import { Breadcrumbs } from '@/components/Breadcrumbs';

/**
 * The catch-all for editorial and policy pages: /our-story, /craft, /shipping,
 * /returns, /faq and anything else the content team publishes. One route, so a
 * new page needs no deploy — only a published Content record.
 */

export const revalidate = 300;
export const dynamicParams = true;

type Params = Promise<{ key: string }>;

/**
 * Only the pages we know exist at build time. Anything else is rendered on demand
 * and cached, so a page published this afternoon works this afternoon.
 */
export async function generateStaticParams() {
  return [
    { key: 'our-story' },
    { key: 'craft' },
    { key: 'shipping' },
    { key: 'returns' },
    { key: 'faq' },
  ];
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { key } = await params;
  const page = await getContentPage(key);
  if (!page) return { title: 'Page not found' };

  return {
    title: { absolute: page.seo.title },
    description: page.seo.description ?? undefined,
    alternates: { canonical: absoluteUrl(`/${page.slug ?? key}`) },
    robots: page.seo.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'article',
      title: page.seo.ogTitle,
      description: page.seo.ogDescription ?? undefined,
      url: absoluteUrl(`/${page.slug ?? key}`),
      images: page.seo.ogImage ? [{ url: page.seo.ogImage.url, alt: page.seo.ogImage.alt }] : undefined,
    },
  };
}

export default async function ContentPage({ params }: { params: Params }) {
  const { key } = await params;
  const page = await getContentPage(key);
  if (!page) notFound();

  const hasHero = page.blocks[0]?.blockType === 'hero';

  return (
    <>
      {/* A hero block provides its own title, so the page heading would duplicate it. */}
      {!hasHero && (
        <div className="shell pt-10">
          <Breadcrumbs items={[{ label: 'Home', href: '/' }, { label: page.title, href: `/${page.slug ?? key}` }]} />
          <header className="max-w-3xl pb-4">
            <h1 className="font-serif text-display-lg text-ink-900">{page.title}</h1>
            {page.excerpt && <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">{page.excerpt}</p>}
          </header>
        </div>
      )}

      <ContentBlocks blocks={page.blocks} />
    </>
  );
}
