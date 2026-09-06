import type { Money, Dimensions } from './types';

/**
 * Presentation helpers. Everything a customer reads as a number goes through here,
 * so a price never renders two different ways on two different pages.
 */

const ZERO_DECIMAL = new Set(['JPY', 'KRW', 'VND', 'CLP', 'ISK']);
const THREE_DECIMAL = new Set(['BHD', 'JOD', 'KWD', 'OMR', 'TND']);

const exponentOf = (currency: string) => {
  const c = currency.toUpperCase();
  if (ZERO_DECIMAL.has(c)) return 0;
  if (THREE_DECIMAL.has(c)) return 3;
  return 2;
};

/** Sensible locale per currency, so ₹1,29,900 groups the Indian way. */
const LOCALE_BY_CURRENCY: Record<string, string> = {
  INR: 'en-IN', USD: 'en-US', EUR: 'de-DE', GBP: 'en-GB', AUD: 'en-AU', CAD: 'en-CA', JPY: 'ja-JP',
};

export function formatMoney(money: Money | null | undefined, options: { locale?: string; compact?: boolean } = {}): string {
  if (!money) return '';
  const currency = money.currency.toUpperCase();
  const exponent = exponentOf(currency);
  const value = money.amount / 10 ** exponent;
  const locale = options.locale ?? LOCALE_BY_CURRENCY[currency] ?? 'en-US';

  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    // Whole amounts drop the decimals: ₹2,450 reads better than ₹2,450.00.
    minimumFractionDigits: Number.isInteger(value) ? 0 : exponent,
    maximumFractionDigits: exponent,
    ...(options.compact ? { notation: 'compact' } : {}),
  }).format(value);
}

export const toMajor = (money: Money) => money.amount / 10 ** exponentOf(money.currency);

/** "26 × 13 cm" — omits any dimension the piece does not have. */
export function formatDimensions(d: Dimensions | null | undefined): string {
  if (!d) return '';
  const unit = d.unit ?? 'cm';
  if (d.diameter && d.height) return `${d.height} × ⌀${d.diameter} ${unit}`;
  const parts = [d.height, d.width, d.depth].filter((v): v is number => typeof v === 'number' && v > 0);
  if (!parts.length) return d.diameter ? `⌀${d.diameter} ${unit}` : '';
  return `${parts.join(' × ')} ${unit}`;
}

export function formatWeight(weight: { value: number; unit: string } | null | undefined): string {
  if (!weight?.value) return '';
  if (weight.unit === 'g' && weight.value >= 1000) return `${(weight.value / 1000).toFixed(1)} kg`;
  return `${weight.value} ${weight.unit}`;
}

/** "5–7 September" or "5 September – 2 October" — a range a human can act on. */
export function formatDeliveryWindow(from: string | Date, to: string | Date, locale = 'en-GB'): string {
  const start = new Date(from);
  const end = new Date(to);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return '';

  const day = new Intl.DateTimeFormat(locale, { day: 'numeric' });
  const full = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long' });

  if (start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()) {
    return `${day.format(start)}–${full.format(end)}`;
  }
  return `${full.format(start)} – ${full.format(end)}`;
}

export function formatDate(value: string | Date | null | undefined, locale = 'en-GB'): string {
  if (!value) return '';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'long', year: 'numeric' }).format(date);
}

/** "3 days ago" — used on reviews and order timelines. */
export function formatRelative(value: string | Date, locale = 'en-GB'): string {
  const date = new Date(value);
  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.round(diffMs / 86_400_000);

  const rtf = new Intl.RelativeTimeFormat(locale, { numeric: 'auto' });
  if (Math.abs(diffDays) < 1) {
    const hours = Math.round(diffMs / 3_600_000);
    if (Math.abs(hours) < 1) return rtf.format(Math.round(diffMs / 60_000), 'minute');
    return rtf.format(hours, 'hour');
  }
  if (Math.abs(diffDays) < 30) return rtf.format(diffDays, 'day');
  if (Math.abs(diffDays) < 365) return rtf.format(Math.round(diffDays / 30), 'month');
  return rtf.format(Math.round(diffDays / 365), 'year');
}

/** "4–7 working days" */
export function formatDeliveryDays(min: number, max: number): string {
  if (min === max) return `${min} working day${min === 1 ? '' : 's'}`;
  return `${min}–${max} working days`;
}

export const pluralize = (count: number, singular: string, plural = `${singular}s`) =>
  `${count} ${count === 1 ? singular : plural}`;

/** A country's flag emoji derived from its ISO code, so no flag assets are needed. */
export function flagFor(countryCode: string | null | undefined): string {
  if (!countryCode || countryCode.length !== 2) return '';
  return String.fromCodePoint(
    ...countryCode.toUpperCase().split('').map((c) => 0x1f1a5 + c.charCodeAt(0)),
  );
}

/** Splits stored copy into paragraphs, preserving the author's blank lines. */
export const toParagraphs = (text: string | null | undefined): string[] =>
  (text ?? '').split(/\n{2,}/).map((p) => p.trim()).filter(Boolean);
