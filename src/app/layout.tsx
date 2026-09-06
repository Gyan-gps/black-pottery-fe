import type { Metadata, Viewport } from 'next';
import { Cormorant_Garamond, Inter } from 'next/font/google';
import '@/styles/globals.css';

import { getCategories, getCurrencies, getOrganizationSchema, storefrontContext, absoluteUrl } from '@/lib/server';
import { Providers } from '@/components/Providers';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { CartDrawer } from '@/components/CartDrawer';
import { SupportButton } from '@/components/SupportButton';

/**
 * A serif with real presence for editorial text, and a neutral grotesque for
 * interface chrome. Both self-hosted by next/font, so there is no render-blocking
 * request to Google and no layout shift when they load.
 */
const serif = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  variable: '--font-serif',
  display: 'swap',
});

const sans = Inter({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'),
  title: {
    default: 'Nizamabad Black Pottery | Handmade Black Clay, Shipped Worldwide',
    // Every page supplies its own name; the brand is appended once, here.
    template: '%s | Nizamabad Black Pottery',
  },
  description:
    'Hand-shaped black pottery from Nizamabad, India. Vases, planters, tableware and engraved pieces, made by hand and delivered worldwide.',
  applicationName: 'Nizamabad Black Pottery',
  openGraph: {
    type: 'website',
    siteName: 'Nizamabad Black Pottery',
    locale: 'en_GB',
  },
  twitter: { card: 'summary_large_image' },
  robots: { index: true, follow: true },
  alternates: { canonical: '/' },
};

export const viewport: Viewport = {
  themeColor: '#16130f',
  width: 'device-width',
  initialScale: 1,
  // Never lock zoom: pinch-to-zoom is an accessibility affordance, not a bug.
  maximumScale: 5,
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const [categories, currencyData, context, organizationSchema] = await Promise.all([
    getCategories(),
    getCurrencies(),
    storefrontContext(),
    getOrganizationSchema(),
  ]);

  return (
    <html lang="en" className={`${serif.variable} ${sans.variable}`}>
      <body>
        {/* First tab stop on every page, for keyboard and screen-reader users. */}
        <a href="#main" className="sr-focusable">
          Skip to content
        </a>

        <Providers serverCurrency={context.currency} serverCountry={context.country}>
          <Header
            categories={categories}
            currencies={currencyData.currencies}
            announcement="Handcrafted in India. Delivered worldwide."
          />

          <main id="main" tabIndex={-1} className="focus:outline-none">
            {children}
          </main>

          <Footer categories={categories} />
          <CartDrawer />
          <SupportButton />
        </Providers>

        {organizationSchema && (
          <script
            type="application/ld+json"
            // Built server-side from our own data, never from user input.
            dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationSchema) }}
          />
        )}
      </body>
    </html>
  );
}
