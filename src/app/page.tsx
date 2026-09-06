import type { Metadata } from 'next';
import Link from 'next/link';
import { getHomepage, absoluteUrl } from '@/lib/server';
import { ContentBlocks } from '@/components/ContentBlocks';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { EmptyState } from '@/components/ui';

/**
 * The homepage is assembled entirely from content blocks in the database, so the
 * brand can be rewritten without touching this file.
 */

export const revalidate = 300;

export async function generateMetadata(): Promise<Metadata> {
  const page = await getHomepage();
  if (!page) return {};

  return {
    title: { absolute: page.seo.title },
    description: page.seo.description,
    alternates: { canonical: absoluteUrl('/') },
    openGraph: {
      title: page.seo.ogTitle,
      description: page.seo.ogDescription,
      url: absoluteUrl('/'),
      images: page.seo.ogImage ? [{ url: page.seo.ogImage.url, alt: page.seo.ogImage.alt }] : undefined,
    },
  };
}

export default async function HomePage() {
  const page = await getHomepage();

  // The homepage cannot render without its content. Rather than a blank screen,
  // say what is missing and how to fix it.
  if (!page) {
    return (
      <div className="shell py-section">
        <EmptyState
          title="The homepage has not been published yet"
          description="Run the database seed, or publish the homepage from the admin panel, and this page will fill itself in."
          action={
            <Link href="/shop" className="btn-primary">
              Browse the shop instead
            </Link>
          }
        />
      </div>
    );
  }

  return (
    <>
      <ContentBlocks blocks={page.blocks} />
      <RecentlyViewed />
    </>
  );
}
