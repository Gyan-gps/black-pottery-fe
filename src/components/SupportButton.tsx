'use client';

import { usePathname } from 'next/navigation';
import { IconWhatsApp } from './ui';

const WHATSAPP_NUMBER = process.env.NEXT_PUBLIC_WHATSAPP_NUMBER;

/**
 * A direct line to a person. Only renders when a real number is configured —
 * a support button that goes nowhere is worse than none at all.
 *
 * Hidden during checkout, where the only thing that should compete for attention
 * is completing the order.
 */
export function SupportButton() {
  const pathname = usePathname();

  if (!WHATSAPP_NUMBER) return null;
  if (pathname.startsWith('/checkout')) return null;

  const message = encodeURIComponent('Hello — I have a question about a piece.');

  return (
    <a
      href={`https://wa.me/${WHATSAPP_NUMBER}?text=${message}`}
      target="_blank"
      rel="noopener noreferrer"
      className="fixed bottom-5 right-5 z-30 flex h-12 w-12 items-center justify-center rounded-full bg-ink-900 text-paper shadow-lg transition-transform hover:scale-105 focus-visible:ring-2 focus-visible:ring-ink-900 focus-visible:ring-offset-2 lg:bottom-8 lg:right-8"
      aria-label="Message us on WhatsApp"
    >
      <IconWhatsApp className="h-6 w-6" />
    </a>
  );
}
