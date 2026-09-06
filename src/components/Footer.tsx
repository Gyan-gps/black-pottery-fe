import Link from 'next/link';
import type { Category } from '@/lib/types';
import { NewsletterForm } from './NewsletterForm';

/**
 * The footer. Ordered by what a customer actually looks for at the bottom of a
 * page: what else is there, how does it reach me, and can I trust you.
 */
export function Footer({ categories }: { categories: Category[] }) {
  const productTypes = categories.filter((c) => c.kind === 'product-type' && c.showInNavigation).slice(0, 8);

  const columns = [
    {
      title: 'Shop',
      links: [
        { href: '/shop', label: 'All pieces' },
        ...productTypes.map((c) => ({ href: `/shop/${c.slug}`, label: c.name })),
        { href: '/collections', label: 'Collections' },
      ],
    },
    {
      title: 'The Craft',
      links: [
        { href: '/craft', label: 'How it is made' },
        { href: '/our-story', label: 'Our story' },
        { href: '/journal/what-is-nizamabad-black-pottery', label: 'What is black pottery?' },
        { href: '/journal/black-pottery-care-guide', label: 'Care guide' },
        { href: '/journal', label: 'Journal' },
      ],
    },
    {
      title: 'Help',
      links: [
        { href: '/shipping', label: 'Shipping & delivery' },
        { href: '/returns', label: 'Returns & refunds' },
        { href: '/faq', label: 'FAQ' },
        { href: '/orders/track', label: 'Track an order' },
        { href: '/contact', label: 'Contact us' },
      ],
    },
  ];

  return (
    <footer className="mt-section border-t border-ink-100 bg-ink-950 text-paper/70">
      <div className="shell py-16 lg:py-20">
        <div className="grid gap-12 lg:grid-cols-[1.4fr_repeat(3,1fr)] lg:gap-8">
          <div className="max-w-sm">
            <p className="font-serif text-xl leading-tight text-paper">Nizamabad Black Pottery</p>
            <p className="mt-1 font-sans text-[0.5625rem] uppercase tracking-[0.34em] text-paper/40">
              Handcrafted in India
            </p>

            <p className="mt-6 font-serif text-[0.9375rem] leading-relaxed text-paper/60">
              Hand-shaped black clay, made by craftspeople in Nizamabad and sent to homes around the world.
            </p>

            <div className="mt-8">
              <NewsletterForm />
            </div>
          </div>

          {columns.map((column) => (
            <nav key={column.title} aria-label={column.title}>
              <h2 className="font-sans text-eyebrow uppercase tracking-[0.18em] text-paper/40">{column.title}</h2>
              <ul className="mt-5 space-y-2.5">
                {column.links.map((link) => (
                  <li key={link.href}>
                    <Link
                      href={link.href}
                      className="font-sans text-[0.8125rem] text-paper/60 transition-colors hover:text-paper"
                    >
                      {link.label}
                    </Link>
                  </li>
                ))}
              </ul>
            </nav>
          ))}
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-paper/10 pt-8 sm:flex-row sm:items-center sm:justify-between">
          <p className="font-sans text-[0.6875rem] text-paper/40">
            © {new Date().getFullYear()} Nizamabad Black Pottery. All rights reserved.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <Link href="/privacy" className="font-sans text-[0.6875rem] text-paper/40 hover:text-paper/70">
              Privacy
            </Link>
            <Link href="/terms" className="font-sans text-[0.6875rem] text-paper/40 hover:text-paper/70">
              Terms
            </Link>
            <Link href="/accessibility" className="font-sans text-[0.6875rem] text-paper/40 hover:text-paper/70">
              Accessibility
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
