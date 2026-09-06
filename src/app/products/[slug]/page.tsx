import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import { getProduct, getRelatedProducts, getProductReviews, getProductSchema, absoluteUrl } from '@/lib/server';
import { toParagraphs } from '@/lib/format';
import { ProductGallery } from '@/components/ProductGallery';
import { AddToCart } from '@/components/AddToCart';
import { StickyBuyBar } from '@/components/StickyBuyBar';
import { ProductReviews } from '@/components/ProductReviews';
import { ProductRail } from '@/components/ProductCard';
import { RecentlyViewed } from '@/components/RecentlyViewed';
import { Breadcrumbs } from '@/components/Breadcrumbs';
import { Accordion, Notice } from '@/components/ui';

export const revalidate = 30;

type Params = Promise<{ slug: string }>;
type SearchParams = Promise<{ preview?: string }>;

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const { slug } = await params;
  const product = await getProduct(slug);

  if (!product) return { title: 'Piece not found' };

  const canonical = absoluteUrl(`/products/${product.slug}`);

  return {
    title: { absolute: product.seo.title },
    description: product.seo.description,
    keywords: product.seo.keywords,
    alternates: { canonical },
    robots: product.seo.noIndex ? { index: false, follow: true } : undefined,
    openGraph: {
      type: 'website',
      title: product.seo.ogTitle,
      description: product.seo.ogDescription,
      url: canonical,
      images: product.seo.ogImage
        ? [{ url: product.seo.ogImage.url, alt: product.seo.ogImage.alt, width: 1200, height: 1500 }]
        : undefined,
    },
  };
}

export default async function ProductPage({ params, searchParams }: { params: Params; searchParams: SearchParams }) {
  const [{ slug }, { preview }] = await Promise.all([params, searchParams]);

  const product = await getProduct(slug, preview);
  if (!product) notFound();

  // Everything below the buy box loads in parallel; none of it blocks the fold.
  const [related, reviewData, schema] = await Promise.all([
    getRelatedProducts(slug),
    getProductReviews(slug, { page: 1 }),
    getProductSchema(slug),
  ]);

  const storySections = [
    { title: 'The story', body: product.productStory },
    { title: 'Craftsmanship', body: product.craftsmanshipStory },
  ].filter((section) => section.body);

  return (
    <>
      {product.isPreview && (
        <div className="bg-warning px-4 py-2.5 text-center font-sans text-micro text-white">
          Preview — this piece is not published. Only people with this link can see it.
        </div>
      )}

      <div className="shell py-8 lg:py-12">
        <Breadcrumbs items={product.breadcrumbs} />

        <div className="grid gap-10 lg:grid-cols-2 lg:gap-16 xl:gap-24">
          <ProductGallery images={product.images} productName={product.name} />

          <div id="buy-box" className="lg:sticky lg:top-28 lg:self-start">
            <AddToCart product={product} />
          </div>
        </div>
      </div>

      {/* Story and specifications */}
      <div className="shell">
        <div className="grid gap-12 border-t border-ink-100 pt-14 lg:grid-cols-2 lg:gap-24">
          <div>
            {product.description && (
              <div className="prose-craft">
                {toParagraphs(product.description).map((paragraph, index) => (
                  <p key={index}>{paragraph}</p>
                ))}
              </div>
            )}

            {storySections.map((section) => (
              <section key={section.title} className="mt-12">
                <h2 className="eyebrow mb-4">{section.title}</h2>
                <div className="prose-craft">
                  {toParagraphs(section.body).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </section>
            ))}
          </div>

          <div>
            {product.specifications.length > 0 && (
              <Accordion title="Specifications" defaultOpen>
                <div className="space-y-6">
                  {product.specifications.map((group) => (
                    <div key={group.group}>
                      <h4 className="mb-2 font-sans text-micro uppercase tracking-[0.1em] text-ink-400">{group.group}</h4>
                      <dl className="divide-y divide-ink-100">
                        {group.items.map((item) => (
                          <div key={item.name} className="flex justify-between gap-6 py-2.5">
                            <dt className="font-sans text-[0.875rem] text-ink-500">{item.name}</dt>
                            <dd className="text-right font-sans text-[0.875rem] text-ink-900">{item.value}</dd>
                          </div>
                        ))}
                      </dl>
                    </div>
                  ))}
                </div>
              </Accordion>
            )}

            {product.careInstructions && (
              <Accordion title="Care">
                <div className="prose-craft">
                  {toParagraphs(product.careInstructions).map((paragraph, index) => (
                    <p key={index}>{paragraph}</p>
                  ))}
                </div>
              </Accordion>
            )}

            {product.packagingInformation && (
              <Accordion title="Packaging">
                <p className="prose-craft">{product.packagingInformation}</p>
              </Accordion>
            )}

            <Accordion title="Shipping">
              <div className="prose-craft">
                {product.shippingInformation && <p>{product.shippingInformation}</p>}
                <p>
                  Orders leave the workshop within one to two working days. Delivery is 4–7 working days within India and
                  4–16 working days internationally, depending on the service you choose. The exact cost and timing for
                  your address are shown at checkout before you pay.
                </p>
                <p>
                  For most international destinations, import duties and local taxes are collected by the carrier on
                  delivery. We tell you where that applies, with an estimate, rather than letting it be a surprise.
                </p>
              </div>
            </Accordion>

            <Accordion title="Returns">
              <div className="prose-craft">
                <p>
                  Fourteen days from delivery to change your mind, provided the piece comes back unused and in its
                  original packaging. If it arrived damaged or is not what you ordered, we cover the return and you do not
                  need to send a broken piece back — a photograph within 48 hours is enough.
                </p>
                <p>
                  Differences in height, rim shape and surface sheen are characteristics of hand-made work rather than
                  faults, and we describe them on this page before you buy.
                </p>
              </div>
            </Accordion>

            {product.excludedCountryCodes.length > 0 && (
              <div className="mt-6">
                <Notice tone="warning" title="Shipping restrictions">
                  This piece cannot be sent to {product.excludedCountryCodes.join(', ')} because of its size or fragility.
                </Notice>
              </div>
            )}
          </div>
        </div>
      </div>

      <ProductReviews
        reviews={reviewData.items}
        total={reviewData.total}
        rating={product.rating}
        productSlug={product.slug}
      />

      {related.length > 0 && <ProductRail products={related} title="You might also like" />}

      <RecentlyViewed excludeId={product.id} />

      <StickyBuyBar product={product} anchorId="buy-box" />

      {schema && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />}
    </>
  );
}
