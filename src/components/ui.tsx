'use client';

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import clsx from 'clsx';

/**
 * Interface primitives. Every accessible behaviour the rest of the app relies on
 * — focus trapping, live regions, labelled controls — lives here once, so no
 * screen has to remember to do it.
 */

// ── Icons ───────────────────────────────────────────────────────────────────
// Inline SVG rather than an icon package: a dozen glyphs is not worth a dependency,
// and these inherit currentColor and stroke width from the type around them.

type IconProps = { className?: string; strokeWidth?: number };

const icon = (path: ReactNode, viewBox = '0 0 24 24') =>
  function Icon({ className = 'h-5 w-5', strokeWidth = 1.5 }: IconProps) {
    return (
      <svg
        viewBox={viewBox}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        strokeLinejoin="round"
        className={className}
        aria-hidden="true"
      >
        {path}
      </svg>
    );
  };

export const IconBag = icon(
  <>
    <path d="M6 8h12l-1 12H7L6 8z" />
    <path d="M9 8V6a3 3 0 0 1 6 0v2" />
  </>,
);
export const IconSearch = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="m20 20-3.5-3.5" />
  </>,
);
export const IconHeart = icon(
  <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20z" />,
);
export const IconHeartFilled = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 20s-7-4.6-7-9.4A3.9 3.9 0 0 1 12 8a3.9 3.9 0 0 1 7 2.6C19 15.4 12 20 12 20z" />
  </svg>
);
export const IconUser = icon(
  <>
    <circle cx="12" cy="8" r="3.5" />
    <path d="M5 20c0-3.3 3.1-5.5 7-5.5s7 2.2 7 5.5" />
  </>,
);
export const IconClose = icon(<path d="M6 6l12 12M18 6L6 18" />);
export const IconMenu = icon(<path d="M4 7h16M4 12h16M4 17h16" />);
export const IconChevronDown = icon(<path d="m6 9 6 6 6-6" />);
export const IconChevronRight = icon(<path d="m9 6 6 6-6 6" />);
export const IconChevronLeft = icon(<path d="m15 6-6 6 6 6" />);
export const IconMinus = icon(<path d="M5 12h14" />);
export const IconPlus = icon(<path d="M12 5v14M5 12h14" />);
export const IconCheck = icon(<path d="m5 13 4 4 10-10" />);
export const IconAlert = icon(
  <>
    <circle cx="12" cy="12" r="9" />
    <path d="M12 7.5v5M12 16h.01" />
  </>,
);
export const IconTruck = icon(
  <>
    <path d="M3 7h11v9H3z" />
    <path d="M14 10h4l3 3v3h-7z" />
    <circle cx="7" cy="17.5" r="1.8" />
    <circle cx="17" cy="17.5" r="1.8" />
  </>,
);
export const IconShare = icon(
  <>
    <circle cx="18" cy="6" r="2.5" />
    <circle cx="6" cy="12" r="2.5" />
    <circle cx="18" cy="18" r="2.5" />
    <path d="m8.2 10.8 7.6-3.6M8.2 13.2l7.6 3.6" />
  </>,
);
export const IconZoom = icon(
  <>
    <circle cx="11" cy="11" r="7" />
    <path d="M11 8.5v5M8.5 11h5M20 20l-3.5-3.5" />
  </>,
);
export const IconStar = ({ className = 'h-4 w-4', filled = false }: IconProps & { filled?: boolean }) => (
  <svg viewBox="0 0 24 24" className={className} aria-hidden="true" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth={1.4}>
    <path d="m12 3.5 2.6 5.4 5.9.8-4.3 4.1 1 5.9-5.2-2.8-5.2 2.8 1-5.9L3.5 9.7l5.9-.8z" />
  </svg>
);
export const IconWhatsApp = ({ className = 'h-5 w-5' }: IconProps) => (
  <svg viewBox="0 0 24 24" fill="currentColor" className={className} aria-hidden="true">
    <path d="M12 2a10 10 0 0 0-8.6 15L2 22l5.2-1.4A10 10 0 1 0 12 2Zm0 18.2a8.2 8.2 0 0 1-4.2-1.2l-.3-.2-3.1.8.8-3-.2-.3A8.2 8.2 0 1 1 12 20.2Zm4.5-6.1c-.2-.1-1.5-.7-1.7-.8s-.4-.1-.6.1-.6.8-.8 1-.3.2-.5.1a6.7 6.7 0 0 1-3.3-2.9c-.3-.4.2-.4.7-1.4.1-.2 0-.4 0-.5s-.6-1.4-.8-1.9-.4-.4-.6-.4h-.5a1 1 0 0 0-.7.3A2.9 2.9 0 0 0 6.8 11a5.1 5.1 0 0 0 1.1 2.7 11.6 11.6 0 0 0 4.4 3.9c1.6.7 2.3.7 3.1.6a2.6 2.6 0 0 0 1.7-1.2 2.1 2.1 0 0 0 .1-1.2c0-.1-.2-.2-.4-.3Z" />
  </svg>
);

// ── Rating ──────────────────────────────────────────────────────────────────

export function Rating({
  value,
  count,
  size = 'sm',
  showCount = true,
}: {
  value: number;
  count?: number;
  size?: 'sm' | 'md';
  showCount?: boolean;
}) {
  // No reviews means no stars: an empty five-star row implies a bad rating.
  if (!count) return null;
  const dimension = size === 'md' ? 'h-4 w-4' : 'h-3.5 w-3.5';

  return (
    <span className="inline-flex items-center gap-1.5">
      <span className="flex text-ink-900" role="img" aria-label={`Rated ${value} out of 5`}>
        {[1, 2, 3, 4, 5].map((star) => (
          <IconStar key={star} className={dimension} filled={star <= Math.round(value)} />
        ))}
      </span>
      {showCount && (
        <span className="font-sans text-micro text-ink-400">
          {value.toFixed(1)} ({count})
        </span>
      )}
    </span>
  );
}

// ── Badges ──────────────────────────────────────────────────────────────────

const BADGE_STYLES: Record<string, string> = {
  'out-of-stock': 'bg-ink-100 text-ink-500',
  'low-stock': 'bg-clay-100 text-clay-800',
  'best-seller': 'bg-ink-900 text-paper',
  new: 'bg-white text-ink-900 ring-1 ring-inset ring-ink-200',
  'one-of-a-kind': 'bg-clay-600 text-white',
  sale: 'bg-danger text-white',
};

export function Badge({ type, children }: { type: keyof typeof BADGE_STYLES | string; children: ReactNode }) {
  return (
    <span
      className={clsx(
        'inline-flex items-center px-2 py-1 font-sans text-[0.625rem] uppercase tracking-[0.12em]',
        BADGE_STYLES[type] ?? BADGE_STYLES.new,
      )}
    >
      {children}
    </span>
  );
}

// ── Feedback ────────────────────────────────────────────────────────────────

/**
 * An inline message. `role="alert"` on errors so a screen reader announces the
 * problem the moment it appears, rather than leaving the user to discover it.
 */
export function Notice({
  tone = 'info',
  title,
  children,
  onDismiss,
}: {
  tone?: 'info' | 'success' | 'warning' | 'error';
  title?: string;
  children: ReactNode;
  onDismiss?: () => void;
}) {
  const tones = {
    info: 'border-ink-200 bg-ink-50 text-ink-700',
    success: 'border-success/30 bg-success/5 text-success',
    warning: 'border-warning/30 bg-warning/5 text-warning',
    error: 'border-danger/30 bg-danger/5 text-danger',
  };

  return (
    <div
      role={tone === 'error' ? 'alert' : 'status'}
      className={clsx('flex items-start gap-3 border px-4 py-3 font-sans text-[0.8125rem] leading-relaxed', tones[tone])}
    >
      {tone === 'error' || tone === 'warning' ? (
        <IconAlert className="mt-0.5 h-4 w-4 shrink-0" />
      ) : tone === 'success' ? (
        <IconCheck className="mt-0.5 h-4 w-4 shrink-0" />
      ) : null}
      <div className="min-w-0 flex-1">
        {title && <p className="mb-0.5 font-medium">{title}</p>}
        <div>{children}</div>
      </div>
      {onDismiss && (
        <button type="button" onClick={onDismiss} className="-m-1 p-1 opacity-60 hover:opacity-100" aria-label="Dismiss">
          <IconClose className="h-4 w-4" />
        </button>
      )}
    </div>
  );
}

/**
 * The empty state. Always says what happened and offers the next step — the
 * project rule is that no screen ever dead-ends on "nothing here".
 */
export function EmptyState({
  title,
  description,
  action,
  icon,
}: {
  title: string;
  description: string;
  action?: ReactNode;
  icon?: ReactNode;
}) {
  return (
    <div className="flex flex-col items-center px-6 py-20 text-center">
      {icon && <div className="mb-6 text-ink-300">{icon}</div>}
      <h2 className="font-serif text-display-sm text-ink-900">{title}</h2>
      <p className="mt-3 max-w-md font-sans text-[0.9375rem] leading-relaxed text-ink-500">{description}</p>
      {action && <div className="mt-8">{action}</div>}
    </div>
  );
}

export function Spinner({ className = 'h-4 w-4' }: { className?: string }) {
  return (
    <svg className={clsx('animate-spin', className)} viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <circle cx="12" cy="12" r="9" stroke="currentColor" strokeOpacity="0.25" strokeWidth="2.5" />
      <path d="M21 12a9 9 0 0 0-9-9" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" />
    </svg>
  );
}

/** Announces async results to screen readers without stealing focus. */
export function LiveRegion({ message }: { message: string | null }) {
  return (
    <div aria-live="polite" aria-atomic="true" className="sr-only">
      {message}
    </div>
  );
}

// ── Form controls ───────────────────────────────────────────────────────────

type FieldProps = {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  children?: never;
} & Omit<React.InputHTMLAttributes<HTMLInputElement>, 'className'>;

/**
 * A labelled input with its error wired through aria-describedby and
 * aria-invalid, so the message is announced rather than merely displayed.
 */
export function Field({ label, error, hint, required, className, id: providedId, ...props }: FieldProps) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;
  const hintId = `${id}-hint`;

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
        {!required && <span className="ml-1.5 font-normal text-ink-300">(optional)</span>}
      </label>
      <input
        id={id}
        required={required}
        aria-invalid={error ? true : undefined}
        aria-describedby={clsx(error && errorId, hint && hintId) || undefined}
        className={clsx('field', error && 'field-error')}
        {...props}
      />
      {hint && !error && (
        <span id={hintId} className="help">
          {hint}
        </span>
      )}
      {error && (
        <span id={errorId} className="error-text">
          <IconAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

export function SelectField({
  label, error, hint, required, className, options, placeholder, id: providedId, ...props
}: {
  label: string;
  error?: string;
  hint?: string;
  required?: boolean;
  className?: string;
  placeholder?: string;
  options: { value: string; label: string }[];
} & Omit<React.SelectHTMLAttributes<HTMLSelectElement>, 'className'>) {
  const generatedId = useId();
  const id = providedId ?? generatedId;
  const errorId = `${id}-error`;

  return (
    <div className={className}>
      <label htmlFor={id} className="label">
        {label}
        {required && <span className="ml-0.5 text-danger" aria-hidden="true">*</span>}
      </label>
      <div className="relative">
        <select
          id={id}
          required={required}
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? errorId : undefined}
          className={clsx('field appearance-none pr-10', error && 'field-error')}
          {...props}
        >
          {placeholder && <option value="">{placeholder}</option>}
          {options.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>
        <IconChevronDown className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-ink-400" />
      </div>
      {hint && !error && <span className="help">{hint}</span>}
      {error && (
        <span id={errorId} className="error-text">
          <IconAlert className="mt-px h-3.5 w-3.5 shrink-0" />
          {error}
        </span>
      )}
    </div>
  );
}

/** A quantity stepper. Buttons rather than a number input, which is fiddly on mobile. */
export function QuantityStepper({
  value,
  min = 1,
  max = 20,
  onChange,
  disabled,
  label = 'Quantity',
}: {
  value: number;
  min?: number;
  max?: number;
  onChange: (value: number) => void;
  disabled?: boolean;
  label?: string;
}) {
  const id = useId();
  return (
    <div className="inline-flex items-center border border-ink-200" role="group" aria-labelledby={id}>
      <span id={id} className="sr-only">
        {label}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.max(min, value - 1))}
        disabled={disabled || value <= min}
        className="flex h-11 w-11 items-center justify-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-30"
        aria-label="Decrease quantity"
      >
        <IconMinus className="h-4 w-4" />
      </button>
      <span className="w-10 text-center font-sans text-[0.9375rem] tabular-nums" aria-live="polite">
        {value}
      </span>
      <button
        type="button"
        onClick={() => onChange(Math.min(max, value + 1))}
        disabled={disabled || value >= max}
        className="flex h-11 w-11 items-center justify-center text-ink-600 transition-colors hover:text-ink-900 disabled:opacity-30"
        aria-label="Increase quantity"
      >
        <IconPlus className="h-4 w-4" />
      </button>
    </div>
  );
}

// ── Overlays ────────────────────────────────────────────────────────────────

/**
 * A modal/drawer with a real focus trap: focus moves in on open, cycles inside,
 * Escape closes, and focus returns to whatever opened it.
 */
export function Overlay({
  open,
  onClose,
  labelledBy,
  side = 'right',
  children,
  className,
}: {
  open: boolean;
  onClose: () => void;
  labelledBy: string;
  side?: 'right' | 'center' | 'bottom';
  children: ReactNode;
  className?: string;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const previouslyFocused = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!open) return;

    previouslyFocused.current = document.activeElement as HTMLElement;
    // Prevent the page behind from scrolling while the overlay is up.
    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const focusables = () =>
      Array.from(
        panelRef.current?.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])',
        ) ?? [],
      ).filter((el) => el.offsetParent !== null);

    const timer = window.setTimeout(() => (focusables()[0] ?? panelRef.current)?.focus(), 40);

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== 'Tab') return;

      const items = focusables();
      if (!items.length) return;
      const first = items[0];
      const last = items[items.length - 1];

      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener('keydown', onKeyDown);
    return () => {
      document.removeEventListener('keydown', onKeyDown);
      document.body.style.overflow = previousOverflow;
      window.clearTimeout(timer);
      previouslyFocused.current?.focus?.();
    };
  }, [open, onClose]);

  if (!open) return null;

  const panelPosition = {
    right: 'ml-auto h-full w-full max-w-md animate-[fade-in_0.25s_ease] sm:max-w-lg',
    center: 'm-auto w-full max-w-lg animate-fade-up',
    bottom: 'mt-auto w-full animate-fade-up',
  }[side];

  return (
    <div className="fixed inset-0 z-50 flex" role="presentation">
      <div
        className="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px] animate-fade-in"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={labelledBy}
        tabIndex={-1}
        className={clsx('relative flex flex-col bg-paper shadow-2xl focus:outline-none', panelPosition, className)}
      >
        {children}
      </div>
    </div>
  );
}

/** A disclosure section, used for the specification and care panels. */
export function Accordion({
  title,
  children,
  defaultOpen = false,
  count,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
  count?: number;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const contentId = useId();

  return (
    <div className="border-b border-ink-100">
      <h3>
        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full items-center justify-between gap-4 py-5 text-left transition-colors hover:text-ink-600"
        >
          <span className="font-sans text-[0.8125rem] uppercase tracking-[0.1em] text-ink-900">
            {title}
            {typeof count === 'number' && <span className="ml-2 text-ink-400">({count})</span>}
          </span>
          <IconChevronDown className={clsx('h-4 w-4 shrink-0 text-ink-400 transition-transform duration-300', open && 'rotate-180')} />
        </button>
      </h3>
      <div id={contentId} hidden={!open} className="pb-6">
        {children}
      </div>
    </div>
  );
}

// ── Skeletons ───────────────────────────────────────────────────────────────

export function ProductCardSkeleton() {
  return (
    <div>
      <div className="skeleton aspect-product w-full" />
      <div className="mt-4 space-y-2">
        <div className="skeleton h-3.5 w-3/4" />
        <div className="skeleton h-3.5 w-1/3" />
      </div>
    </div>
  );
}

export function ProductGridSkeleton({ count = 8 }: { count?: number }) {
  return (
    <div className="grid grid-cols-2 gap-x-4 gap-y-10 lg:grid-cols-3 lg:gap-x-6 xl:grid-cols-4">
      {Array.from({ length: count }).map((_, i) => (
        <ProductCardSkeleton key={i} />
      ))}
    </div>
  );
}

export function TextSkeleton({ lines = 3 }: { lines?: number }) {
  return (
    <div className="space-y-2.5">
      {Array.from({ length: lines }).map((_, i) => (
        <div key={i} className="skeleton h-3.5" style={{ width: i === lines - 1 ? '60%' : '100%' }} />
      ))}
    </div>
  );
}
