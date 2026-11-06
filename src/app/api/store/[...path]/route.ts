import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

// A fixed upstream prevents this route from becoming an open proxy. Forward
// only storefront context and cookies; never forward arbitrary host headers.
async function proxy(req: NextRequest, context: { params: Promise<{ path: string[] }> }) {
  const origin = req.headers.get('origin');
  if (!['GET', 'HEAD'].includes(req.method) && origin && new URL(origin).host !== req.headers.get('host')) {
    return NextResponse.json({ success: false, error: { code: 'ORIGIN_NOT_ALLOWED', message: 'Please submit this request from the store.' } }, { status: 403 });
  }
  const { path } = await context.params;
  const base = process.env.API_URL ?? process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:5000/api/v1';
  const url = `${base.replace(/\/$/, '')}/${path.map(encodeURIComponent).join('/')}${req.nextUrl.search}`;
  const headers = new Headers();
  for (const name of ['content-type', 'authorization', 'cookie', 'x-country', 'x-currency', 'x-locale', 'x-cart-token', 'x-session-id', 'x-verify', 'stripe-signature']) {
    const value = req.headers.get(name);
    if (value) headers.set(name, value);
  }
  try {
    const upstream = await fetch(url, {
      method: req.method, headers, cache: 'no-store', redirect: 'manual',
      body: ['GET', 'HEAD'].includes(req.method) ? undefined : await req.text(),
      signal: AbortSignal.timeout(30000),
    });
    const response = new NextResponse(await upstream.arrayBuffer(), { status: upstream.status });
    response.headers.set('content-type', upstream.headers.get('content-type') ?? 'application/json');
    response.headers.set('cache-control', 'no-store');
    for (const cookie of upstream.headers.getSetCookie()) {
      // Cookies belong to the storefront when proxied, regardless of API domain.
      let value = cookie.replace(/;\s*Domain=[^;]+/ig, '').replace(/;\s*SameSite=None/ig, '; SameSite=Lax');
      if (req.nextUrl.protocol === 'http:') value = value.replace(/;\s*Secure/ig, '');
      response.headers.append('set-cookie', value);
    }
    return response;
  } catch {
    return NextResponse.json({ success: false, error: { code: 'API_UNAVAILABLE', message: 'We could not reach the store. Your basket is saved; please try again.' } }, { status: 502 });
  }
}

export { proxy as GET, proxy as POST, proxy as PATCH, proxy as PUT, proxy as DELETE };
