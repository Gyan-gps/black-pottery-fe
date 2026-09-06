'use client';

import { useState } from 'react';
import { useCart } from '@/lib/store';
import { IconCheck, IconClose, Spinner } from './ui';

/**
 * The discount code field.
 *
 * Rejections come back from the API with a specific reason — expired, minimum not
 * met, already used — and are shown verbatim. "Invalid coupon" tells a shopper
 * nothing and usually loses the sale.
 */
export function CouponForm() {
  const cart = useCart((s) => s.cart);
  const applyCoupon = useCart((s) => s.applyCoupon);
  const removeCoupon = useCart((s) => s.removeCoupon);

  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);

  const applied = cart?.coupon;

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!code.trim()) return;

    setBusy(true);
    setError(null);
    const result = await applyCoupon(code.trim());
    setBusy(false);

    if (result.ok) {
      setCode('');
      setOpen(false);
    } else {
      setError(result.error ?? 'That code could not be applied.');
    }
  };

  if (applied) {
    return (
      <div className="flex items-center justify-between gap-3 border border-success/30 bg-success/5 px-3.5 py-3">
        <span className="inline-flex min-w-0 items-center gap-2">
          <IconCheck className="h-4 w-4 shrink-0 text-success" />
          <span className="truncate font-sans text-[0.8125rem] text-success">
            <span className="font-medium uppercase tracking-wide">{applied.code}</span> applied
          </span>
        </span>
        <button
          type="button"
          onClick={() => void removeCoupon()}
          className="-mr-1 shrink-0 p-1 text-success/70 hover:text-success"
          aria-label={`Remove discount code ${applied.code}`}
        >
          <IconClose className="h-4 w-4" />
        </button>
      </div>
    );
  }

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="font-sans text-micro text-ink-500 underline underline-offset-4 hover:text-ink-900"
      >
        Have a discount code?
      </button>
    );
  }

  return (
    <form onSubmit={submit} noValidate>
      <label htmlFor="coupon-code" className="label">
        Discount code
      </label>
      <div className="flex">
        <input
          id="coupon-code"
          value={code}
          onChange={(e) => {
            setCode(e.target.value.toUpperCase());
            setError(null);
          }}
          autoComplete="off"
          autoCapitalize="characters"
          aria-invalid={error ? true : undefined}
          aria-describedby={error ? 'coupon-error' : undefined}
          className={`field min-w-0 flex-1 uppercase tracking-wide ${error ? 'field-error' : ''}`}
          placeholder="WELCOME10"
        />
        <button
          type="submit"
          disabled={busy || !code.trim()}
          className="min-h-11 shrink-0 border border-l-0 border-ink-900 bg-ink-900 px-5 font-sans text-micro uppercase tracking-[0.1em] text-paper transition-colors hover:bg-ink-700 disabled:opacity-40"
        >
          {busy ? <Spinner className="h-3.5 w-3.5" /> : 'Apply'}
        </button>
      </div>
      {error && (
        <p id="coupon-error" className="error-text" role="alert">
          {error}
        </p>
      )}
    </form>
  );
}
