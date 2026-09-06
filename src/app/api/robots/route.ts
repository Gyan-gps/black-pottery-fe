import { SITE_URL } from '@/lib/api';

export const revalidate = 3600;

/**
 * robots.txt. Checkout, cart and account pages are excluded — they are private,
 * infinitely variable, and would waste crawl budget that belongs to products.
 */
export function GET() {
  const site = SITE_URL.replace(/\/$/, '');

  const body = `User-agent: *
Allow: /
Disallow: /checkout
Disallow: /cart
Disallow: /account
Disallow: /wishlist
Disallow: /orders/
Disallow: /api/

Sitemap: ${site}/sitemap.xml
`;

  return new Response(body, {
    headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'public, max-age=3600' },
  });
}
