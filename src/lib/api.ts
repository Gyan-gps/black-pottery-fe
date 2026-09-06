/**
 * The single door to the API.
 *
 * Every request goes through `request()`, so caching, error shape, storefront
 * context headers and credential handling are defined once. No component builds
 * a URL or reads `process.env` on its own.
 */

export const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
export const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

export type Money = { amount: number; currency: string };

export type ApiEnvelope<T> = {
  success: boolean;
  data: T;
  meta?: { page: number; limit: number; total: number; totalPages: number; hasNext: boolean; hasPrev: boolean };
  error?: { code: string; message: string; details?: unknown };
};

/**
 * An error the API returned deliberately. `code` is stable, so UI can branch on
 * it; `message` is always safe and specific enough to show a customer as-is.
 */
export class ApiClientError extends Error {
  code: string;
  status: number;
  details?: any;

  constructor(message: string, code: string, status: number, details?: unknown) {
    super(message);
    this.name = 'ApiClientError';
    this.code = code;
    this.status = status;
    this.details = details;
  }

  /** Field-level messages, keyed by field, for rendering inline on a form. */
  get fieldErrors(): Record<string, string> {
    const fields = this.details?.fields;
    if (!Array.isArray(fields)) return {};
    return Object.fromEntries(fields.map((f: any) => [f.field, f.message]));
  }
}

const NETWORK_MESSAGE =
  'We could not reach our servers. Check your connection and try again — nothing has been lost.';

export type RequestOptions = RequestInit & {
  /** Storefront context. Server components pass these explicitly; the browser store fills them in. */
  currency?: string;
  country?: string;
  cartToken?: string;
  accessToken?: string;
  sessionId?: string;
  /** Next.js cache directives. Defaults to no-store for anything with a body. */
  revalidate?: number | false;
  tags?: string[];
};

export async function request<T>(path: string, options: RequestOptions = {}): Promise<ApiEnvelope<T>> {
  const {
    currency, country, cartToken, accessToken, sessionId, revalidate, tags, headers, ...init
  } = options;

  const requestHeaders = new Headers(headers);
  if (init.body && !requestHeaders.has('Content-Type')) requestHeaders.set('Content-Type', 'application/json');
  if (currency) requestHeaders.set('x-currency', currency);
  if (country) requestHeaders.set('x-country', country);
  if (cartToken) requestHeaders.set('x-cart-token', cartToken);
  if (sessionId) requestHeaders.set('x-session-id', sessionId);
  if (accessToken) requestHeaders.set('Authorization', `Bearer ${accessToken}`);

  const isMutation = Boolean(init.method && init.method !== 'GET');

  let response: Response;
  try {
    response = await fetch(`${API_URL}${path}`, {
      ...init,
      headers: requestHeaders,
      // Needed for the refresh-token cookie to travel with auth calls.
      credentials: 'include',
      // A mutation must never be served from a cache.
      cache: isMutation ? 'no-store' : revalidate === false ? 'no-store' : undefined,
      next: !isMutation && revalidate !== false ? { revalidate: revalidate ?? 60, tags } : undefined,
    });
  } catch {
    throw new ApiClientError(NETWORK_MESSAGE, 'NETWORK_ERROR', 0);
  }

  if (response.status === 204) return { success: true, data: undefined as T };

  let payload: any;
  try {
    payload = await response.json();
  } catch {
    throw new ApiClientError(
      'We received an unexpected response from our servers. Please try again.',
      'MALFORMED_RESPONSE',
      response.status,
    );
  }

  if (!response.ok || payload?.success === false) {
    throw new ApiClientError(
      payload?.error?.message ?? 'Something failed on our side. Please try again in a moment.',
      payload?.error?.code ?? 'UNKNOWN_ERROR',
      response.status,
      payload?.error?.details,
    );
  }

  return payload as ApiEnvelope<T>;
}

/** Unwraps the envelope when the caller only wants the payload. */
export async function get<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request<T>(path, options)).data;
}

export async function post<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return (await request<T>(path, { ...options, method: 'POST', body: body ? JSON.stringify(body) : undefined })).data;
}

export async function patch<T>(path: string, body?: unknown, options?: RequestOptions): Promise<T> {
  return (await request<T>(path, { ...options, method: 'PATCH', body: body ? JSON.stringify(body) : undefined })).data;
}

export async function del<T>(path: string, options?: RequestOptions): Promise<T> {
  return (await request<T>(path, { ...options, method: 'DELETE' })).data;
}

/**
 * For server components rendering a page that must not 500 because one section
 * failed. Returns `fallback` and lets the page render its empty state instead.
 */
export async function tryGet<T>(path: string, fallback: T, options?: RequestOptions): Promise<T> {
  try {
    return await get<T>(path, options);
  } catch (error) {
    if (process.env.NODE_ENV !== 'production') {
      console.warn(`[api] ${path} failed:`, (error as Error).message);
    }
    return fallback;
  }
}
