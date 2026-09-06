'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import clsx from 'clsx';
import { useCart, useAuth } from '@/lib/store';
import { IconBag, IconHeart, IconMenu, IconClose, IconSearch, IconUser, Overlay } from './ui';
import { CurrencySwitcher } from './CurrencySwitcher';
import { SearchPanel } from './SearchPanel';
import type { Category, CurrencyOption } from '@/lib/types';

/**
 * The site header. Transparent over a dark hero on the homepage and solid
 * everywhere else, because a craft brand's first impression should be the
 * photograph, not the navigation.
 */
export function Header({
  categories,
  currencies,
  announcement,
}: {
  categories: Category[];
  currencies: CurrencyOption[];
  announcement?: string;
}) {
  const pathname = usePathname();
  const [scrolled, setScrolled] = useState(false);
  const [menuOpen, setMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);

  const itemCount = useCart((s) => s.cart?.totals.itemCount ?? 0);
  const openDrawer = useCart((s) => s.openDrawer);
  const user = useAuth((s) => s.user);

  const isHome = pathname === '/';
  // Only the homepage has a dark full-bleed hero to sit over.
  const overlaid = isHome && !scrolled;

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  // A route change should never leave the mobile menu hanging open.
  useEffect(() => {
    setMenuOpen(false);
    setSearchOpen(false);
  }, [pathname]);

  const productTypes = categories.filter((c) => c.kind === 'product-type' && c.showInNavigation);

  const navLinks = [
    { href: '/shop', label: 'Shop' },
    { href: '/collections', label: 'Collections' },
    { href: '/craft', label: 'The Craft' },
    { href: '/our-story', label: 'Our Story' },
    { href: '/journal', label: 'Journal' },
  ];

  return (
    <>
      {announcement && (
        <div className="bg-ink-900 px-4 py-2.5 text-center font-sans text-micro tracking-wide text-paper/90">
          {announcement}
        </div>
      )}

      <header
        className={clsx(
          'sticky top-0 z-40 transition-colors duration-300 ease-craft',
          false ? 'bg-transparent text-paper' : 'border-b border-ink-100 bg-paper/95 text-ink-900 backdrop-blur-md',
        )}
      >
        <div className="shell flex h-[var(--header-height)] items-center justify-between gap-6">
          {/* Mobile menu trigger */}
          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            className="-ml-2 p-2 lg:hidden"
            aria-label="Open menu"
            aria-expanded={menuOpen}
          >
            <IconMenu />
          </button>

          {/* Primary navigation */}
          <nav className="hidden flex-1 items-center gap-7 lg:flex" aria-label="Primary">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className={clsx(
                  'font-sans text-micro uppercase tracking-[0.12em] transition-opacity hover:opacity-60',
                  pathname.startsWith(link.href) && 'underline underline-offset-[6px]',
                )}
              >
                {link.label}
              </Link>
            ))}
          </nav>

          {/* Wordmark — centred on desktop, so the navigation frames it */}
          <Link
            href="/"
            className="absolute left-1/2 -translate-x-1/2 text-center lg:static lg:translate-x-0"
            aria-label="Nizamabad Black Pottery, home"
          >
            <span className="block font-serif text-[0.9375rem] leading-tight tracking-[0.02em] sm:text-lg">
              Nizamabad
            </span>
            <span className="block font-sans text-[0.5rem] uppercase tracking-[0.36em] opacity-70 sm:text-[0.5625rem]">
              Black Pottery
            </span>
          </Link>

          {/* Utilities */}
          <div className="flex flex-1 items-center justify-end gap-1 sm:gap-2">
            <div className="hidden sm:block">
              <CurrencySwitcher currencies={currencies} compact />
            </div>

            <button
              type="button"
              onClick={() => setSearchOpen(true)}
              className="p-2.5 transition-opacity hover:opacity-60"
              aria-label="Search"
            >
              <IconSearch />
            </button>

            <Link href="/wishlist" className="hidden p-2.5 transition-opacity hover:opacity-60 sm:block" aria-label="Wishlist">
              <IconHeart />
            </Link>

            <Link
              href={user ? '/account' : '/sign-in'}
              className="hidden p-2.5 transition-opacity hover:opacity-60 sm:block"
              aria-label={user ? 'Your account' : 'Sign in'}
            >
              <IconUser />
            </Link>

            <button
              type="button"
              onClick={openDrawer}
              className="relative p-2.5 transition-opacity hover:opacity-60"
              aria-label={itemCount ? `Basket, ${itemCount} item${itemCount === 1 ? '' : 's'}` : 'Basket, empty'}
            >
              <IconBag />
              {itemCount > 0 && (
                <span
                  className={clsx(
                    'absolute right-1 top-1 flex h-4 min-w-4 items-center justify-center rounded-full px-1 font-sans text-[0.5625rem] tabular-nums',
                    overlaid ? 'bg-paper text-ink-900' : 'bg-ink-900 text-paper',
                  )}
                >
                  {itemCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </header>

      {/* Mobile navigation */}
      <Overlay open={menuOpen} onClose={() => setMenuOpen(false)} labelledBy="mobile-menu-title" side="right">
        <div className="flex items-center justify-between border-b border-ink-100 px-gutter py-5">
          <h2 id="mobile-menu-title" className="eyebrow">
            Menu
          </h2>
          <button type="button" onClick={() => setMenuOpen(false)} className="-mr-2 p-2" aria-label="Close menu">
            <IconClose />
          </button>
        </div>

        <nav className="flex-1 overflow-y-auto px-gutter py-8" aria-label="Mobile">
          <ul className="space-y-1">
            {navLinks.map((link) => (
              <li key={link.href}>
                <Link href={link.href} className="block py-3 font-serif text-2xl text-ink-900">
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>

          {productTypes.length > 0 && (
            <div className="mt-10 border-t border-ink-100 pt-8">
              <h3 className="eyebrow mb-4">Shop by piece</h3>
              <ul className="space-y-0.5">
                {productTypes.map((type) => (
                  <li key={type.slug}>
                    <Link
                      href={`/shop/${type.slug}`}
                      className="flex items-center justify-between py-2.5 font-sans text-[0.9375rem] text-ink-600"
                    >
                      {type.name}
                      <span className="font-sans text-micro text-ink-300">{type.productCount}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="mt-10 space-y-1 border-t border-ink-100 pt-8">
            <Link href="/wishlist" className="block py-2.5 font-sans text-[0.9375rem] text-ink-600">
              Wishlist
            </Link>
            <Link href={user ? '/account' : '/sign-in'} className="block py-2.5 font-sans text-[0.9375rem] text-ink-600">
              {user ? 'Your account' : 'Sign in'}
            </Link>
            <Link href="/orders/track" className="block py-2.5 font-sans text-[0.9375rem] text-ink-600">
              Track an order
            </Link>
          </div>

          <div className="mt-10 border-t border-ink-100 pt-8">
            <CurrencySwitcher currencies={currencies} />
          </div>
        </nav>
      </Overlay>

      <SearchPanel open={searchOpen} onClose={() => setSearchOpen(false)} />
    </>
  );
}
