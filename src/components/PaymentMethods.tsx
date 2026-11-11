'use client';

import type { PaymentMethod } from '@/lib/types';

export function PaymentMethods({ methods, selected, onChange, showUnavailablePhonePe, disabled = false }: {
  methods: PaymentMethod[];
  selected: PaymentMethod['provider'] | null;
  onChange: (provider: PaymentMethod['provider']) => void;
  showUnavailablePhonePe: boolean;
  disabled?: boolean;
}) {
  const options: Array<PaymentMethod & { unavailable?: boolean }> = [...methods];
  if (showUnavailablePhonePe && !methods.some((method) => method.provider === 'phonepe')) {
    options.unshift({ provider: 'phonepe', label: 'PhonePe', flow: 'redirect', logo: 'phonepe', unavailable: true });
  }
  return <fieldset className="mt-6" disabled={disabled}>
    <legend className="sr-only">Payment method</legend>
    <div className="space-y-3">
      {options.map((method) => {
        const phonepe = method.provider === 'phonepe';
        const checked = !method.unavailable && selected === method.provider;
        const descriptionId = `payment-${method.provider}-description`;
        return <label key={method.provider} className={`flex items-start gap-4 border p-5 transition-colors ${method.unavailable ? 'cursor-not-allowed border-ink-100 bg-ink-50/40' : checked ? 'cursor-pointer border-ink-900 bg-ink-50/60' : 'cursor-pointer border-ink-200 hover:border-ink-400'}`}>
          <input type="radio" name="payment-provider" value={method.provider} checked={checked}
            disabled={method.unavailable || disabled} onChange={() => onChange(method.provider)}
            aria-describedby={descriptionId} aria-label={phonepe ? 'Pay online with PhonePe' : method.label}
            className="mt-1 h-4 w-4 shrink-0 border-ink-300 text-ink-900 focus:ring-ink-900" />
          <span className="min-w-0 flex-1">
            <span className="flex flex-wrap items-center gap-2 font-sans text-[0.9375rem] text-ink-900">
              {phonepe ? 'Pay online with PhonePe' : method.label}
              {method.testMode && <span className="border border-ink-200 px-2 py-0.5 text-[0.625rem] uppercase tracking-wider text-ink-500">Test mode</span>}
              {method.unavailable && <span className="text-micro text-ink-400">Currently unavailable</span>}
            </span>
            <span id={descriptionId} className="mt-1 block font-sans text-micro leading-relaxed text-ink-500">
              {method.unavailable ? 'Online payment is temporarily unavailable. Please choose another payment method.' : phonepe ? 'UPI, debit or credit cards, and netbanking. Complete your payment securely on PhonePe.' : method.provider === 'cod' ? 'Pay in cash when your order arrives.' : 'Enter your card details securely on the next screen.'}
            </span>
          </span>
          {phonepe && <span aria-hidden="true" className="shrink-0 rounded-sm border border-[#5f259f]/20 bg-[#5f259f]/5 px-3 py-1.5 font-sans text-[0.8125rem] font-semibold text-[#5f259f]">PhonePe</span>}
        </label>;
      })}
    </div>
  </fieldset>;
}
