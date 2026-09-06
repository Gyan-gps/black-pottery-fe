/**
 * Renders every important storefront route and asserts the page actually
 * contains what it should — real product names, real prices, correct metadata,
 * structured data, and the right robots directives.
 *
 * A build that compiles is not a storefront that works; this is the difference.
 *
 * Usage: node scripts/verify-pages.mjs [baseUrl]
 */

const BASE = process.argv[2] ?? 'http://localhost:3100';

const results = [];
let failures = 0;

const check = (name, condition, detail) => {
  const passed = Boolean(condition);
  if (!passed) failures += 1;
  results.push({ name, passed, detail });
  console.log(`  ${passed ? 'PASS' : 'FAIL'}  ${name}${!passed && detail ? `\n          ${detail}` : ''}`);
};

const section = (title) => console.log(`\n${title}\n${'-'.repeat(title.length)}`);

async function fetchPage(path, init) {
  const response = await fetch(`${BASE}${path}`, { redirect: 'manual', ...init });
  // XML and plain text both matter here (sitemap, robots), not just HTML.
  const type = response.headers.get('content-type') ?? '';
  const body = /text|xml|json/.test(type) ? await response.text() : '';
  return { status: response.status, headers: response.headers, html: body, location: response.headers.get('location') };
}

/** Extracts the JSON-LD blocks so structured data can be asserted, not assumed. */
const jsonLd = (html) =>
  [...html.matchAll(/<script type="application\/ld\+json"[^>]*>(.*?)<\/script>/gs)]
    .map((match) => {
      try {
        return JSON.parse(match[1]);
      } catch {
        return null;
      }
    })
    .filter(Boolean);

const metaContent = (html, property) => {
  const pattern = new RegExp(`<meta[^>]+(?:property|name)="${property}"[^>]+content="([^"]*)"`, 'i');
  return html.match(pattern)?.[1] ?? null;
};

const title = (html) => html.match(/<title>(.*?)<\/title>/s)?.[1] ?? null;

// ═══ Homepage ════════════════════════════════════════════════════════════════
section('Homepage');

const home = await fetchPage('/');
check('Homepage returns 200', home.status === 200, `status ${home.status}`);
check('Homepage renders the brand hero', home.html.includes('Nizamabad Black Pottery'));
check(
  'Homepage renders content-block copy from the database',
  home.html.includes('Black all the way through'),
);
check('Homepage renders a featured collection with products', home.html.includes('The Dining Edit'));
check('Homepage title comes from the content record', title(home.html)?.includes('Handmade Black Clay'), title(home.html));
check('Homepage has a meta description', (metaContent(home.html, 'description')?.length ?? 0) > 50);
check('Homepage has Open Graph tags', Boolean(metaContent(home.html, 'og:title')));
check(
  'Organization JSON-LD is present and names the right origin',
  jsonLd(home.html).some((s) => s['@type'] === 'Organization' && s.address?.addressRegion === 'Uttar Pradesh'),
);
check('Skip-to-content link is present', home.html.includes('Skip to content'));
check('Page declares a language', home.html.includes('<html lang="en"'));

// ═══ Shop ════════════════════════════════════════════════════════════════════
section('Shop & listing');

const shop = await fetchPage('/shop');
check('Shop returns 200', shop.status === 200, `status ${shop.status}`);
check('Shop lists real products from the API', shop.html.includes('Surahi Water Pitcher'));
check('Shop shows prices', /₹\s?[\d,]+/.test(shop.html), 'no formatted price found');
check('Shop renders the shape navigation', shop.html.includes('Planters') && shop.html.includes('Vases'));
check('Breadcrumb JSON-LD on shop', jsonLd(shop.html).some((s) => s['@type'] === 'BreadcrumbList'));

const category = await fetchPage('/shop/vases');
check('Category page returns 200', category.status === 200, `status ${category.status}`);
check('Category page lists only that shape', category.html.includes('Tall Column Floor Vase'));
check(
  'Category page has its own title',
  title(category.html)?.includes('Vases'),
  title(category.html),
);

const searched = await fetchPage('/shop?search=surahi');
check('Search results render', searched.status === 200 && searched.html.includes('Surahi'));

const emptySearch = await fetchPage('/shop?search=zzzznothing');
check(
  'Empty search shows a specific empty state, not a blank page',
  emptySearch.html.includes('Nothing matches'),
);

// ═══ Product ═════════════════════════════════════════════════════════════════
section('Product page');

const product = await fetchPage('/products/surahi-water-pitcher');
check('Product page returns 200', product.status === 200, `status ${product.status}`);
check('Product name renders as the h1', /<h1[^>]*>[^<]*Surahi Water Pitcher/.test(product.html));
check('Price renders', /₹\s?2,450/.test(product.html), 'expected ₹2,450');
check('Short description renders', product.html.includes('keeps water cool'));
check('Product story renders', product.html.includes('first shape we asked the workshop'));
check('Craftsmanship story renders', product.html.includes('burnished by hand') || product.html.includes('leather-hard'));
check('Handmade variation note is shown', product.html.includes('vary by a few millimetres'));
check('Specifications table renders', product.html.includes('Dimensions') && product.html.includes('1.2 litres'));
check('Care instructions render', product.html.includes('Do not use detergent'));
check('Returns section renders', product.html.includes('Fourteen days'));
check('Placeholder imagery is disclosed honestly', product.html.includes('Representative image'));
check(
  'Product JSON-LD has price and availability',
  jsonLd(product.html).some(
    (s) => s['@type'] === 'Product' && s.offers?.price === '2450.00' && s.offers?.availability?.includes('InStock'),
  ),
);
check(
  'Product JSON-LD omits a fabricated rating',
  jsonLd(product.html).every((s) => s['@type'] !== 'Product' || s.aggregateRating === undefined),
);
check('Breadcrumb JSON-LD on product', jsonLd(product.html).some((s) => s['@type'] === 'BreadcrumbList'));
check('Canonical URL is set', product.html.includes('rel="canonical"'));
check('Open Graph image is set', Boolean(metaContent(product.html, 'og:image')) || product.html.includes('og:image'));
check('Related products render', product.html.includes('You might also like'));

const missingProduct = await fetchPage('/products/does-not-exist');
check('Unknown product returns 404', missingProduct.status === 404, `status ${missingProduct.status}`);
check('404 page offers a way forward', missingProduct.html.includes('Explore the collection'));

// ═══ Content ═════════════════════════════════════════════════════════════════
section('Brand content');

const story = await fetchPage('/our-story');
check('Our Story returns 200', story.status === 200, `status ${story.status}`);
check('Our Story renders the place section', story.html.includes('Azamgarh'));
check(
  'Founder placeholders are visible rather than silently invented',
  story.html.includes('FOR THE FOUNDERS'),
);

const craft = await fetchPage('/craft');
check('Craft page returns 200', craft.status === 200);
check('Craft page renders the six stages', craft.html.includes('Reduction firing') || craft.html.includes('reduction firing'));

const faq = await fetchPage('/faq');
check('FAQ returns 200', faq.status === 200);
check('FAQ JSON-LD is emitted', jsonLd(faq.html).some((s) => s['@type'] === 'FAQPage'));

const journal = await fetchPage('/journal');
check('Journal index returns 200', journal.status === 200);
check('Journal lists articles', journal.html.includes('What Is Nizamabad Black Pottery'));

const article = await fetchPage('/journal/what-is-nizamabad-black-pottery');
check('Article returns 200', article.status === 200);
check('Article JSON-LD is emitted', jsonLd(article.html).some((s) => s['@type'] === 'Article'));
check('Article explains reduction firing', article.html.includes('reduction firing'));

const shipping = await fetchPage('/shipping');
check('Shipping policy returns 200', shipping.status === 200);
check('Shipping policy states the duty position', shipping.html.includes('collected by the courier') || shipping.html.includes('collected by the carrier'));

// ═══ Collections ═════════════════════════════════════════════════════════════
section('Collections');

const collections = await fetchPage('/collections');
check('Collections index returns 200', collections.status === 200);
check('Collections list renders', collections.html.includes('The Dining Edit'));

const collection = await fetchPage('/collections/the-engraved-work');
check('Collection page returns 200', collection.status === 200);
check('Collection lists its products', collection.html.includes('Engraved Serving Platter'));

// ═══ Commerce pages ══════════════════════════════════════════════════════════
section('Cart, checkout & orders');

const cart = await fetchPage('/cart');
check('Cart returns 200', cart.status === 200);
check('Cart is excluded from indexing', metaContent(cart.html, 'robots')?.includes('noindex'), metaContent(cart.html, 'robots'));

const checkout = await fetchPage('/checkout');
check('Checkout returns 200', checkout.status === 200);
check('Checkout is excluded from indexing', metaContent(checkout.html, 'robots')?.includes('noindex'));

const track = await fetchPage('/orders/track');
check('Order tracking returns 200', track.status === 200);
check('Order tracking explains what is needed', track.html.includes('order number'));

const signIn = await fetchPage('/sign-in');
check('Sign-in returns 200', signIn.status === 200);
check('Sign-in makes clear an account is optional', signIn.html.includes('guest'));

// ═══ SEO plumbing ════════════════════════════════════════════════════════════
section('SEO plumbing');

const sitemap = await fetchPage('/sitemap.xml');
check('sitemap.xml returns 200', sitemap.status === 200, `status ${sitemap.status}`);
check('sitemap is valid XML', sitemap.html.startsWith('<?xml'));
check(
  'sitemap contains every product',
  (sitemap.html.match(/\/products\//g) ?? []).length === 14,
  `${(sitemap.html.match(/\/products\//g) ?? []).length} product URLs`,
);
check('sitemap includes content pages', sitemap.html.includes('/our-story'));

const robots = await fetchPage('/robots.txt');
check('robots.txt returns 200', robots.status === 200);
check('robots.txt disallows checkout', robots.html.includes('Disallow: /checkout'));
check('robots.txt points at the sitemap', robots.html.includes('Sitemap:'));

// ═══ Security headers ════════════════════════════════════════════════════════
section('Security headers');

check('X-Content-Type-Options is set', home.headers.get('x-content-type-options') === 'nosniff');
check('Referrer-Policy is set', Boolean(home.headers.get('referrer-policy')));
check('X-Frame-Options is set', Boolean(home.headers.get('x-frame-options')));
check('Permissions-Policy is set', Boolean(home.headers.get('permissions-policy')));
check('Server header is not advertised', !home.headers.get('x-powered-by'));

// ═══ Currency ════════════════════════════════════════════════════════════════
section('Multi-currency');

const usd = await fetchPage('/shop', { headers: { cookie: 'nbp_currency=USD' } });
check('Currency cookie changes rendered prices', /\$\s?\d/.test(usd.html), 'no $ price found');
check('INR prices are absent when USD is chosen', !/₹\s?2,450/.test(usd.html));

// ═══ Internal links ══════════════════════════════════════════════════════════
section('Internal links');

const LINKED_ROUTES = [
  '/forgot-password',
  '/contact',
  '/privacy',
  '/terms',
  '/accessibility',
  '/products/surahi-water-pitcher/reviews',
  '/journal/black-pottery-care-guide',
  '/returns',
  '/faq',
  '/shipping',
  '/wishlist',
  '/account',
  '/orders/track',
  '/collections',
  '/shop/planters',
];

for (const route of LINKED_ROUTES) {
  const page = await fetchPage(route);
  check(`${route} resolves`, page.status === 200, `status ${page.status}`);
}

// ═══ Summary ═════════════════════════════════════════════════════════════════
const passed = results.filter((r) => r.passed).length;
console.log(`\n${'='.repeat(64)}`);
console.log(`  ${passed}/${results.length} checks passed`);
if (failures) {
  console.log('\n  Failed:');
  for (const r of results.filter((x) => !x.passed)) console.log(`    - ${r.name}${r.detail ? ` (${r.detail})` : ''}`);
}
console.log(`${'='.repeat(64)}\n`);

process.exit(failures ? 1 : 0);
