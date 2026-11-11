import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { createRequire } from 'node:module';
import { pathToFileURL } from 'node:url';
import ts from 'typescript';

const require = createRequire(import.meta.url);
const nextServerUrl = pathToFileURL(require.resolve('next/server')).href;
const { NextRequest } = await import(nextServerUrl);
async function sourceUrl(path, replacements = []) {
  let source = await readFile(new URL(path, import.meta.url), 'utf8');
  for (const [from, to] of replacements) source = source.replaceAll(from, to);
  const { outputText } = ts.transpileModule(source, { fileName: path, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } });
  const resolved = outputText.replaceAll('"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href));
  return `data:text/javascript;base64,${Buffer.from(resolved).toString('base64')}`;
}
async function sourceModule(path, replacements = []) { return import(await sourceUrl(path, replacements)); }

let count = 0;
function check(name, assertion) { assertion(); count++; console.log(`PASS ${name}`); }
let captured;
const upstream = createServer(async (req, res) => {
  let body = ''; for await (const chunk of req) body += chunk;
  captured = { method: req.method, url: req.url, headers: req.headers, body };
  res.setHeader('content-type', 'application/json');
  res.setHeader('set-cookie', ['nbp_cart=cart-token; Domain=api.example; Path=/; HttpOnly; Secure; SameSite=None', 'nbp_refresh=session-token; Domain=api.example; Path=/; HttpOnly; Secure; SameSite=None']);
  res.statusCode = req.url.includes('/fail') ? 422 : 200;
  res.end(JSON.stringify({ success: res.statusCode === 200, data: { token: 'cart-token' }, error: res.statusCode === 422 ? { code: 'INVALID_ADDRESS' } : undefined }));
});
await new Promise((resolve) => upstream.listen(0, '127.0.0.1', resolve));
const previousUrl = process.env.API_URL;
process.env.API_URL = `http://127.0.0.1:${upstream.address().port}/api/v1`;
try {
  const route = await sourceModule('../src/app/api/store/[...path]/route.ts', [["'next/server'", JSON.stringify(nextServerUrl)]]);
  function call(method, path, headers = {}, body) {
    const request = new NextRequest(`http://store.example/api/store/${path}`, { method, headers: { host: 'store.example', ...headers }, body });
    return route[method](request, { params: Promise.resolve({ path: path.split('?')[0].split('/') }) });
  }
  const added = await call('POST', 'cart/items', { 'content-type': 'application/json', origin: 'http://store.example', cookie: 'nbp_cart=existing', authorization: 'Bearer access', 'x-currency': 'INR' }, '{"quantity":2}');
  check('Proxy forwards cart writes and storefront context', () => { assert.equal(captured.method, 'POST'); assert.equal(captured.url, '/api/v1/cart/items'); assert.equal(captured.body, '{"quantity":2}'); assert.equal(captured.headers.cookie, 'nbp_cart=existing'); assert.equal(captured.headers.authorization, 'Bearer access'); assert.equal(captured.headers['x-currency'], 'INR'); });
  check('Proxy preserves separate httpOnly first-party cookies', () => { const cookies = added.headers.getSetCookie(); assert.equal(cookies.length, 2); for (const cookie of cookies) { assert.match(cookie, /HttpOnly/); assert.match(cookie, /SameSite=Lax/); assert.doesNotMatch(cookie, /Domain=|; Secure/); } });
  check('Personal responses cannot be cached', () => assert.equal(added.headers.get('cache-control'), 'no-store'));
  await call('PATCH', 'cart/items/item-1', { 'content-type': 'application/json' }, '{"quantity":1}');
  check('Quantity PATCH reaches the API unchanged', () => { assert.equal(captured.method, 'PATCH'); assert.equal(captured.body, '{"quantity":1}'); });
  await call('DELETE', 'cart/items/item-1');
  check('Basket DELETE reaches the API', () => assert.equal(captured.method, 'DELETE'));
  await call('POST', 'webhooks/phonepe', { 'content-type': 'application/json', authorization: 'sha256-webhook-hash' }, '{"event":"checkout.order.completed","payload":{"state":"COMPLETED"}}');
  check('PhonePe v2 callback body and authorization survive proxying', () => { assert.match(captured.body, /checkout.order.completed/); assert.equal(captured.headers.authorization, 'sha256-webhook-hash'); });
  const blocked = await call('POST', 'auth/logout', { origin: 'https://unrelated.example' });
  check('Cross-origin account mutation is refused', () => assert.equal(blocked.status, 403));
  const invalid = await call('GET', 'fail?email=qa%40example.com');
  check('API validation status and query parameters are preserved', () => { assert.equal(invalid.status, 422); assert.equal(captured.url, '/api/v1/fail?email=qa%40example.com'); });
  await new Promise((resolve) => upstream.close(resolve));
  const unavailable = await call('GET', 'cart');
  check('Unreachable API produces a structured retryable error', () => assert.equal(unavailable.status, 502));

  const apiUrl = await sourceUrl('../src/lib/api.ts');
  const api = await import(apiUrl);
  const nativeFetch = globalThis.fetch;
  globalThis.window = {};
  let fetchArgs;
  globalThis.fetch = async (...args) => { fetchArgs = args; return Response.json({ success: true, data: {} }); };
  try {
    api.setApiAccessToken('current-access-token');
    await api.post('/checkout/orders', { email: 'qa@example.com' });
    check('Checkout uses the first-party endpoint with the account token', () => { assert.equal(fetchArgs[0], '/api/store/checkout/orders'); assert.equal(fetchArgs[1].headers.get('authorization'), 'Bearer current-access-token'); assert.equal(fetchArgs[1].credentials, 'include'); });
    await api.get('/checkout/session');
    check('Browser session reads are never cached', () => assert.equal(fetchArgs[1].cache, 'no-store'));
    api.setApiAccessToken(null);
    await api.get('/cart');
    check('Sign-out removes the account authorization header', () => assert.equal(fetchArgs[1].headers.get('authorization'), null));
    const payments = await sourceModule('../src/lib/payments.ts', [["'./api'", JSON.stringify(apiUrl)]]);
    const phonepe = { provider: 'phonepe', label: 'PhonePe', flow: 'redirect', logo: 'phonepe', testMode: true };
    const cod = { provider: 'cod', label: 'Cash on Delivery', flow: 'cod', logo: 'cod' };
    check('Configured PhonePe is preferred while COD remains available', () => assert.equal(payments.defaultPaymentProvider([cod, phonepe]), 'phonepe'));
    check('Unconfigured online payment cannot become the default', () => { assert.equal(payments.defaultPaymentProvider([cod]), 'cod'); assert.equal(payments.defaultPaymentProvider([]), null); });
    await payments.startOrderPayment({ orderNumber: 'NBP-TEST-1', email: 'QA@example.com', provider: 'phonepe', currency: 'INR', origin: 'http://localhost:3000' });
    check('PhonePe submit explicitly selects the provider and preserves guest return context', () => {
      assert.equal(fetchArgs[0], '/api/store/checkout/orders/NBP-TEST-1/payment?email=qa%40example.com');
      const body = JSON.parse(fetchArgs[1].body);
      assert.equal(body.provider, 'phonepe');
      const returned = new URL(body.returnUrl);
      assert.equal(returned.searchParams.get('email'), 'qa@example.com');
      assert.equal(returned.searchParams.get('order'), 'NBP-TEST-1');
      assert.equal(returned.searchParams.get('provider'), 'phonepe');
    });
    await payments.startOrderPayment({ orderNumber: 'NBP-TEST-1', email: 'QA@example.com', provider: 'phonepe', currency: 'INR', origin: 'http://localhost:3000' });
    check('PhonePe retry starts payment on the existing store order', () => { assert.match(fetchArgs[0], /NBP-TEST-1\/payment/); assert.equal(JSON.parse(fetchArgs[1].body).provider, 'phonepe'); });
    const attempt = { provider: 'phonepe', status: 'pending', clientSecret: null, redirectUrl: 'https://mercury-uat.phonepe.com/transact/test' };
    check('PhonePe hosted checkout opens externally', () => assert.deepEqual(payments.paymentDestination(attempt, 'NBP-TEST-1', 'qa@example.com'), { external: true, url: attempt.redirectUrl }));
    check('Pending or returned payment goes to verification, never directly to confirmation', () => {
      const next = payments.paymentDestination({ ...attempt, redirectUrl: null }, 'NBP-TEST-1', 'qa@example.com');
      assert.equal(next.external, false); assert.match(next.url, /^\/checkout\/processing\?/); assert.doesNotMatch(next.url, /confirmation/);
    });
    check('Unexpected checkout hosts cannot receive the shopper', () => {
      for (const url of ['https://phonepe.com.attacker.example/pay', 'javascript:alert(1)', 'http://phonepe.com/pay']) assert.throws(() => payments.paymentDestination({ ...attempt, redirectUrl: url }, 'NBP-TEST-1', 'qa@example.com'));
    });
    const { createElement } = await import('react');
    const { renderToStaticMarkup } = await import('react-dom/server');
    const { PaymentMethods } = await sourceModule('../src/components/PaymentMethods.tsx', [[ '"react/jsx-runtime"', JSON.stringify(pathToFileURL(require.resolve('react/jsx-runtime')).href) ]]);
    const renderMethods = (methods, selected, showUnavailablePhonePe) => renderToStaticMarkup(createElement(PaymentMethods, { methods, selected, showUnavailablePhonePe, onChange: () => {} }));
    const availableMarkup = renderMethods([phonepe, cod], 'phonepe', true);
    check('Payment UI renders selectable PhonePe, payment instruments, test mode and COD', () => {
      assert.match(availableMarkup, /Pay online with PhonePe/); assert.match(availableMarkup, /netbanking/); assert.match(availableMarkup, /Test mode/); assert.match(availableMarkup, /Cash on Delivery/);
      const input = availableMarkup.match(/<input[^>]*value="phonepe"[^>]*>/)?.[0]; assert.ok(input); assert.match(input, /checked/); assert.doesNotMatch(input, /disabled/);
    });
    const unavailableMarkup = renderMethods([cod], 'cod', true);
    check('Missing PhonePe credentials show a disabled option while COD stays selected', () => {
      assert.match(unavailableMarkup, /Currently unavailable/);
      const input = unavailableMarkup.match(/<input[^>]*value="phonepe"[^>]*>/)?.[0]; assert.ok(input); assert.match(input, /disabled/); assert.doesNotMatch(input, /checked/);
      const codInput = unavailableMarkup.match(/<input[^>]*value="cod"[^>]*>/)?.[0]; assert.match(codInput, /checked/);
    });
    check('No methods or international delivery cannot offer an enabled PhonePe fallback', () => {
      const empty = renderMethods([], null, true); assert.match(empty, /disabled/);
      assert.doesNotMatch(renderMethods([cod], 'cod', false), /PhonePe/);
    });
    const storage = new Map();
    globalThis.localStorage = { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: (key) => storage.delete(key) };
    const store = await sourceModule('../src/lib/store.ts', [
      ["'./api'", JSON.stringify(apiUrl)],
      ["'zustand'", JSON.stringify(pathToFileURL(require.resolve('zustand')).href)],
      ["'zustand/middleware'", JSON.stringify(pathToFileURL(require.resolve('zustand/middleware')).href)],
    ]);
    let releaseRefresh;
    const refreshGate = new Promise((resolve) => { releaseRefresh = resolve; });
    let refreshCount = 0;
    globalThis.fetch = async () => { refreshCount++; await refreshGate; return Response.json({ success: true, data: { user: { id: 'user', email: 'qa@example.com' }, accessToken: 'restored-token' } }); };
    const refresh1 = store.useAuth.getState().refresh();
    const refresh2 = store.useAuth.getState().refresh();
    releaseRefresh();
    await Promise.all([refresh1, refresh2]);
    check('Concurrent session restoration rotates the cookie only once', () => { assert.equal(refreshCount, 1); assert.equal(store.useAuth.getState().accessToken, 'restored-token'); });
    let releaseCart;
    const cartGate = new Promise((resolve) => { releaseCart = resolve; });
    let cartReads = 0;
    let cartWrites = 0;
    globalThis.fetch = async (url, init) => {
      if (init.method === 'POST') cartWrites++; else { cartReads++; await cartGate; }
      return Response.json({ success: true, data: { id: 'cart', token: 'cart-token', items: [], notices: [] } });
    };
    const load1 = store.useCart.getState().load();
    const load2 = store.useCart.getState().load();
    const add = store.useCart.getState().addItem('product');
    check('Add-to-basket waits for the original cart to finish loading', () => assert.equal(cartWrites, 0));
    releaseCart();
    await Promise.all([load1, load2, add]);
    check('Concurrent checkout boot shares one cart read', () => { assert.equal(cartReads, 1); assert.equal(cartWrites, 1); assert.equal(store.useCart.getState().status, 'ready'); });
    store.useAuth.getState().clear();
    check('Sign-out clears account basket and wishlist state', () => { assert.equal(store.useCart.getState().cart, null); assert.deepEqual(store.useWishlist.getState().items, []); });
    delete globalThis.localStorage;
  } finally { globalThis.fetch = nativeFetch; delete globalThis.window; }
  console.log(`\n${count}/${count} storefront flow checks passed`);
} finally {
  upstream.close();
  if (previousUrl === undefined) delete process.env.API_URL; else process.env.API_URL = previousUrl;
}
