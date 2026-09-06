'use client';

import { useEffect, useState } from 'react';
import { get } from '@/lib/api';
import type { Address, Country, CountryDetail } from '@/lib/types';
import { Field, SelectField, Notice } from './ui';

/**
 * The shipping address form.
 *
 * The shape of this form is data, not code: the region label, whether it is
 * required, the postcode label and its pattern all come from the Country record.
 * That is what makes "State / ZIP code" for Texas and "County / Postcode" for
 * Devon the same component.
 */
export function AddressForm({
  value,
  onChange,
  countries,
  errors = {},
  idPrefix = 'ship',
  disabled,
}: {
  value: Partial<Address>;
  onChange: (address: Partial<Address>) => void;
  countries: Country[];
  errors?: Record<string, string>;
  idPrefix?: string;
  disabled?: boolean;
}) {
  const [detail, setDetail] = useState<CountryDetail | null>(null);
  const [loadingDetail, setLoadingDetail] = useState(false);

  const countryCode = value.countryCode;

  useEffect(() => {
    if (!countryCode) {
      setDetail(null);
      return;
    }

    let cancelled = false;
    setLoadingDetail(true);

    (async () => {
      try {
        const data = await get<CountryDetail>(`/geo/countries/${countryCode}`);
        if (!cancelled) setDetail(data);
      } catch {
        if (!cancelled) setDetail(null);
      } finally {
        if (!cancelled) setLoadingDetail(false);
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [countryCode]);

  const set = (field: keyof Address, fieldValue: string) => onChange({ ...value, [field]: fieldValue });

  const shippable = countries.filter((c) => c.isShippingSupported);
  const regions = detail?.addressForm.regions ?? [];

  return (
    <div className="space-y-5">
      {/* Country first: it determines every field beneath it. */}
      <SelectField
        id={`${idPrefix}-country`}
        label="Country or region"
        required
        value={value.countryCode ?? ''}
        onChange={(e) => {
          // A new country invalidates the old region and postcode.
          onChange({ ...value, countryCode: e.target.value, regionCode: '', region: '', postalCode: '' });
        }}
        options={shippable.map((c) => ({ value: c.code, label: `${c.flag ? `${c.flag} ` : ''}${c.name}` }))}
        placeholder="Choose a country"
        error={errors.countryCode}
        disabled={disabled}
      />

      {detail && !detail.isShippingSupported && (
        <Notice tone="warning" title={`We cannot ship to ${detail.name} yet`}>
          {detail.restrictionReason ??
            'We have not set up a shipping route there. Email us and we will see what can be arranged.'}
        </Notice>
      )}

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-first-name`}
          label="First name"
          required
          autoComplete="given-name"
          value={value.firstName ?? ''}
          onChange={(e) => set('firstName', e.target.value)}
          error={errors.firstName}
          disabled={disabled}
        />
        <Field
          id={`${idPrefix}-last-name`}
          label="Last name"
          autoComplete="family-name"
          value={value.lastName ?? ''}
          onChange={(e) => set('lastName', e.target.value)}
          error={errors.lastName}
          disabled={disabled}
        />
      </div>

      <Field
        id={`${idPrefix}-company`}
        label="Company"
        autoComplete="organization"
        value={value.company ?? ''}
        onChange={(e) => set('company', e.target.value)}
        error={errors.company}
        disabled={disabled}
      />

      <Field
        id={`${idPrefix}-line1`}
        label="Street address"
        required
        autoComplete="address-line1"
        value={value.line1 ?? ''}
        onChange={(e) => set('line1', e.target.value)}
        error={errors.line1}
        disabled={disabled}
      />

      <Field
        id={`${idPrefix}-line2`}
        label="Apartment, suite, etc."
        autoComplete="address-line2"
        value={value.line2 ?? ''}
        onChange={(e) => set('line2', e.target.value)}
        error={errors.line2}
        disabled={disabled}
      />

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-city`}
          label="City"
          required
          autoComplete="address-level2"
          value={value.city ?? ''}
          onChange={(e) => set('city', e.target.value)}
          error={errors.city}
          disabled={disabled}
        />

        {/* A known region list becomes a select; otherwise a free-text field. */}
        {regions.length > 0 ? (
          <SelectField
            id={`${idPrefix}-region`}
            label={detail?.addressForm.regionLabel ?? 'State / Province'}
            required={detail?.addressForm.regionRequired}
            value={value.regionCode ?? ''}
            onChange={(e) => {
              const region = regions.find((r) => r.code === e.target.value);
              onChange({ ...value, regionCode: e.target.value, region: region?.name ?? '' });
            }}
            options={regions.map((r) => ({ value: r.code, label: r.name }))}
            placeholder={`Choose a ${(detail?.addressForm.regionLabel ?? 'region').toLowerCase()}`}
            error={errors.region ?? errors.regionCode}
            disabled={disabled || loadingDetail}
          />
        ) : (
          <Field
            id={`${idPrefix}-region`}
            label={detail?.addressForm.regionLabel ?? 'State / Province'}
            required={detail?.addressForm.regionRequired}
            autoComplete="address-level1"
            value={value.region ?? ''}
            onChange={(e) => set('region', e.target.value)}
            error={errors.region}
            disabled={disabled}
          />
        )}
      </div>

      <div className="grid gap-5 sm:grid-cols-2">
        <Field
          id={`${idPrefix}-postal-code`}
          label={detail?.addressForm.postalCodeLabel ?? 'Postal code'}
          required={detail?.addressForm.postalCodeRequired ?? true}
          autoComplete="postal-code"
          inputMode={countryCode === 'IN' || countryCode === 'US' ? 'numeric' : 'text'}
          value={value.postalCode ?? ''}
          onChange={(e) => set('postalCode', e.target.value)}
          error={errors.postalCode}
          disabled={disabled}
        />

        <Field
          id={`${idPrefix}-phone`}
          label="Phone"
          type="tel"
          required
          autoComplete="tel"
          inputMode="tel"
          value={value.phone ?? ''}
          onChange={(e) => set('phone', e.target.value)}
          // Couriers genuinely do call, so say why we are asking.
          hint={
            detail?.phoneCode
              ? `Include the country code, e.g. +${detail.phoneCode}. The courier may call about delivery.`
              : 'The courier may call about delivery.'
          }
          error={errors.phone}
          disabled={disabled}
        />
      </div>

      <Field
        id={`${idPrefix}-notes`}
        label="Delivery notes"
        value={value.deliveryNotes ?? ''}
        onChange={(e) => set('deliveryNotes', e.target.value)}
        hint="A gate code, a safe place, anything the driver should know."
        error={errors.deliveryNotes}
        disabled={disabled}
      />
    </div>
  );
}
