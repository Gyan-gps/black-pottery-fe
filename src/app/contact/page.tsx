import type { Metadata } from 'next';
import Link from 'next/link';
import { absoluteUrl } from '@/lib/server';

export const metadata: Metadata = {
  title: 'Contact Us',
  description: 'How to reach Nizamabad Black Pottery about an order, a wholesale enquiry or a commission.',
  alternates: { canonical: absoluteUrl('/contact') },
};

/**
 * Contact.
 *
 * Deliberately not a contact form: there is no ticketing system behind one yet,
 * and a form that silently drops a message is worse than an email address that
 * reaches a person.
 */
export default function ContactPage() {
  const routes = [
    {
      title: 'About an order',
      body: 'Quote your order number and we can look it up straight away. If something arrived damaged, attach a photograph of the piece and the packaging within 48 hours.',
      email: 'hello@nizamabadblackpottery.com',
      action: { label: 'Track an order', href: '/orders/track' },
    },
    {
      title: 'Wholesale and larger quantities',
      body: 'For shops, hotels, restaurants, interior projects and corporate gifting. Tell us roughly what you need and when, and we will come back with a quote and a realistic lead time.',
      email: 'trade@nizamabadblackpottery.com',
    },
    {
      title: 'Press and collaborations',
      body: 'Images, the story of the craft, and who makes it.',
      email: 'press@nizamabadblackpottery.com',
    },
  ];

  return (
    <div className="shell py-section">
      <div className="mx-auto max-w-2xl">
        <h1 className="font-serif text-display-lg text-ink-900">Contact us</h1>
        <p className="mt-5 font-serif text-lg leading-relaxed text-ink-500">
          A small team answers these, usually within one working day. We are on Indian Standard Time.
        </p>

        <div className="mt-14 space-y-10">
          {routes.map((route) => (
            <section key={route.title} className="border-t border-ink-100 pt-8">
              <h2 className="font-serif text-display-sm text-ink-900">{route.title}</h2>
              <p className="mt-3 max-w-prose font-serif text-[1.0625rem] leading-relaxed text-ink-500">{route.body}</p>
              <div className="mt-5 flex flex-wrap items-center gap-4">
                <a href={`mailto:${route.email}`} className="btn-secondary btn-sm">
                  {route.email}
                </a>
                {route.action && (
                  <Link href={route.action.href} className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900">
                    {route.action.label}
                  </Link>
                )}
              </div>
            </section>
          ))}
        </div>

        <section className="mt-14 border-t border-ink-100 pt-8">
          <h2 className="eyebrow mb-4">Where the pottery is made</h2>
          <address className="not-italic font-serif text-[1.0625rem] leading-relaxed text-ink-600">
            Nizamabad, Azamgarh district
            <br />
            Uttar Pradesh, India
          </address>
          <p className="mt-4 font-sans text-micro leading-relaxed text-ink-400">
            The workshop is not a shop and is not open to visitors without an appointment. Email first and we will
            arrange it if we can.
          </p>
        </section>
      </div>
    </div>
  );
}
