import 'server-only';
import { cookies, headers } from 'next/headers';
import { tryGet, get, SITE_URL } from './api';
import type {
  Category, Collection, ContentPage, Country, CurrencyOption, Facets, Product, ProductCard, Review,
} from './types';

/**
 * Server-side data access.
 *
 * Every page reads through these, so caching windows and the storefront context
 * (country, currency) are decided in one place. A page must never call `fetch`
 * directly — that is how two sections of the same page end up disagreeing about
 * the shopper's currency.
 */

/**
 * The shopper's country and currency, as the server sees them. Preference order
 * matches the API's: an explicit cookie choice, then the CDN's geo header.
 */
export async function storefrontContext() {
  const [cookieStore, headerList] = await Promise.all([cookies(), headers()]);

  const chosenCurrency = cookieStore.get('nbp_currency')?.value;
  const chosenCountry = cookieStore.get('nbp_country')?.value;
  const geoCountry = headerList.get('cf-ipcountry') ?? headerList.get('x-vercel-ip-country');

  const country =
    chosenCountry ?? (geoCountry && geoCountry !== 'XX' && geoCountry !== 'T1' ? geoCountry.toUpperCase() : undefined);

  return {
    currency: chosenCurrency ?? 'INR',
    country,
    cartToken: cookieStore.get('nbp_cart')?.value,
  };
}

/** Cache windows, named so the intent is legible at each call site. */
const CACHE = {
  /** Brand copy changes rarely and is edited deliberately. */
  content: 300,
  /** Catalogue listings: fresh enough that a sell-out shows quickly. */
  listing: 60,
  /** A product page, where price and stock matter most. */
  product: 30,
  /** Reference data that effectively never changes within a deploy. */
  reference: 3600,
} as const;

// ── Catalogue ───────────────────────────────────────────────────────────────

export async function getProducts(
  params: Record<string, string | number | undefined> = {},
): Promise<{ items: ProductCard[]; total: number; totalPages: number; page: number }> {
  const context = await storefrontContext();
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value !== undefined && value !== '') search.set(key, String(value));
  }

  try {
    const { request } = await import('./api');
    const response = await request<ProductCard[]>(`/catalog/products?${search}`, {
      ...context,
      revalidate: CACHE.listing,
      tags: ['products'],
    });
    return {
      items: response.data,
      total: response.meta?.total ?? response.data.length,
      totalPages: response.meta?.totalPages ?? 1,
      page: response.meta?.page ?? 1,
    };
  } catch {
    return { items: [], total: 0, totalPages: 1, page: 1 };
  }
}

/** Returns null rather than throwing, so the page can render a proper 404. */
export async function getProduct(slug: string, previewToken?: string): Promise<Product | null> {
  const context = await storefrontContext();
  try {
    return await get<Product>(
      `/catalog/products/${encodeURIComponent(slug)}${previewToken ? `?preview=${previewToken}` : ''}`,
      // A preview must never be served from a cache, or an editor sees stale work.
      { ...context, revalidate: previewToken ? false : CACHE.product, tags: [`product:${slug}`] },
    );
  } catch {
    return null;
  }
}

export async function getRelatedProducts(slug: string): Promise<ProductCard[]> {
  const context = await storefrontContext();
  return tryGet<ProductCard[]>(`/catalog/products/${encodeURIComponent(slug)}/related`, [], {
    ...context,
    revalidate: CACHE.listing,
  });
}

export async function getProductReviews(
  slug: string,
  params: { page?: number; sort?: string; rating?: number } = {},
): Promise<{ items: Review[]; total: number; totalPages: number }> {
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (value) search.set(key, String(value));

  try {
    const { request } = await import('./api');
    const response = await request<Review[]>(`/products/${encodeURIComponent(slug)}/reviews?${search}`, {
      revalidate: CACHE.listing,
    });
    return { items: response.data, total: response.meta?.total ?? 0, totalPages: response.meta?.totalPages ?? 1 };
  } catch {
    return { items: [], total: 0, totalPages: 1 };
  }
}

export const getCategories = () =>
  tryGet<Category[]>('/catalog/categories', [], { revalidate: CACHE.reference, tags: ['categories'] });

export const getCollections = (featured = false) =>
  tryGet<Collection[]>(`/catalog/collections${featured ? '?featured=true' : ''}`, [], {
    revalidate: CACHE.content,
    tags: ['collections'],
  });

export async function getCollection(
  slug: string,
  params: { page?: number; limit?: number } = {},
): Promise<{ collection: Collection; items: ProductCard[]; total: number; totalPages: number } | null> {
  const context = await storefrontContext();
  const search = new URLSearchParams();
  if (params.page) search.set('page', String(params.page));
  if (params.limit) search.set('limit', String(params.limit));

  try {
    const { request } = await import('./api');
    const response = await request<{ collection: Collection; items: ProductCard[] }>(
      `/catalog/collections/${encodeURIComponent(slug)}?${search}`,
      { ...context, revalidate: CACHE.listing },
    );
    return {
      collection: response.data.collection,
      items: response.data.items,
      total: response.meta?.total ?? response.data.items.length,
      totalPages: response.meta?.totalPages ?? 1,
    };
  } catch {
    return null;
  }
}

export const getFacets = (category?: string) =>
  tryGet<Facets>(
    `/catalog/products/facets${category ? `?category=${encodeURIComponent(category)}` : ''}`,
    { productTypes: [], materials: [], finishes: [], priceRange: null, inStockCount: 0 },
    { revalidate: CACHE.listing },
  );

// ── Content ─────────────────────────────────────────────────────────────────

export async function getHomepage(): Promise<ContentPage | null> {
  const context = await storefrontContext();
  try {
    return await get<ContentPage>('/content/homepage', {
      ...context,
      revalidate: CACHE.content,
      tags: ['content', 'content:homepage'],
    });
  } catch {
    return null;
  }
}

export async function getContentPage(key: string): Promise<ContentPage | null> {
  const context = await storefrontContext();
  try {
    return await get<ContentPage>(`/content/pages/${encodeURIComponent(key)}`, {
      ...context,
      revalidate: CACHE.content,
      tags: ['content', `content:${key}`],
    });
  } catch {
    return null;
  }
}

export const getJournal = (tag?: string) =>
  tryGet<
    { key: string; slug: string; title: string; excerpt: string | null; heroImage: { url: string; alt: string } | null; type: string; tags: string[]; readingMinutes: number | null; publishedAt: string }[]
  >(`/content/journal${tag ? `?tag=${encodeURIComponent(tag)}` : ''}`, [], { revalidate: CACHE.content });

// ── Reference ───────────────────────────────────────────────────────────────

export const getCountries = () =>
  tryGet<Country[]>('/geo/countries', [], { revalidate: CACHE.reference, tags: ['countries'] });

export const getCurrencies = () =>
  tryGet<{ base: string; currencies: CurrencyOption[] }>(
    '/geo/currencies',
    { base: 'INR', currencies: [] },
    { revalidate: CACHE.reference, tags: ['currencies'] },
  );

// ── SEO ─────────────────────────────────────────────────────────────────────

export const getSitemapEntries = () =>
  tryGet<{ entries: { url: string; lastModified: string; changeFrequency: string; priority: number }[] }>(
    '/seo/sitemap',
    { entries: [] },
    { revalidate: CACHE.content },
  );

export const getProductSchema = (slug: string) =>
  tryGet<Record<string, unknown> | null>(`/seo/structured-data/product/${encodeURIComponent(slug)}`, null, {
    revalidate: CACHE.product,
  });

export const getOrganizationSchema = () =>
  tryGet<Record<string, unknown> | null>('/seo/structured-data/organization', null, { revalidate: CACHE.reference });

/** Absolute URL for canonicals and OG tags. */
export const absoluteUrl = (path: string) => `${SITE_URL.replace(/\/$/, '')}${path.startsWith('/') ? path : `/${path}`}`;
