'use client';

import Image from 'next/image';
import clsx from 'clsx';
import type { ProductImage as ProductImageType } from '@/lib/types';

/**
 * Image rendering.
 *
 * Two things matter here. First, performance: a product card must never download
 * a 2000px original, so we hand next/image an explicit `sizes` that matches the
 * grid. Second, honesty: development placeholders are visibly labelled rather
 * than passed off as photographs of the actual piece.
 */

/** A data-URI SVG placeholder cannot be optimised, and does not need to be. */
const isInlineSvg = (url: string) => url.startsWith('data:');

const FALLBACK_BLUR =
  'data:image/svg+xml;base64,PHN2ZyB4bWxucz0iaHR0cDovL3d3dy53My5vcmcvMjAwMC9zdmciIHdpZHRoPSI4IiBoZWlnaHQ9IjEwIj48cmVjdCB3aWR0aD0iOCIgaGVpZ2h0PSIxMCIgZmlsbD0iI2U5ZTJkNiIvPjwvc3ZnPg==';

export function ProductImageView({
  image,
  sizes,
  priority = false,
  className,
  imageClassName,
  aspect = 'product',
  showIllustrativeNote = false,
}: {
  image: ProductImageType | null | undefined;
  sizes: string;
  priority?: boolean;
  className?: string;
  imageClassName?: string;
  aspect?: 'product' | 'hero' | 'wide' | 'square' | 'none';
  /** Shows the placeholder disclosure. On product galleries this is required. */
  showIllustrativeNote?: boolean;
}) {
  const aspectClass = {
    product: 'aspect-product',
    hero: 'aspect-hero',
    wide: 'aspect-wide',
    square: 'aspect-square',
    none: '',
  }[aspect];

  if (!image?.url) {
    return (
      <div className={clsx('flex items-center justify-center bg-ink-100', aspectClass, className)} aria-hidden="true">
        <span className="font-sans text-micro text-ink-300">No image</span>
      </div>
    );
  }

  return (
    <div className={clsx('relative overflow-hidden bg-ink-100', aspectClass, className)}>
      <Image
        src={image.url}
        alt={image.alt}
        fill
        sizes={sizes}
        priority={priority}
        // Below-the-fold images stay lazy; the hero opts out explicitly.
        loading={priority ? undefined : 'lazy'}
        unoptimized={isInlineSvg(image.url)}
        placeholder="blur"
        blurDataURL={image.blurDataUrl ?? FALLBACK_BLUR}
        className={clsx('object-cover', imageClassName)}
      />

      {showIllustrativeNote && image.isIllustrative && (
        <span className="absolute bottom-2 left-2 bg-ink-950/70 px-2 py-1 font-sans text-[0.5625rem] uppercase tracking-[0.1em] text-paper/90">
          Representative image
        </span>
      )}
    </div>
  );
}

/** A small fixed-size thumbnail, for search results, cart lines and order rows. */
export function ProductThumb({
  image,
  size = 64,
  className,
}: {
  image: { url: string; alt: string; thumbnailUrl?: string; blurDataUrl?: string | null } | null | undefined;
  size?: number;
  className?: string;
}) {
  if (!image?.url) {
    return <div className={clsx('bg-ink-100', className)} style={{ width: size, height: size }} aria-hidden="true" />;
  }

  return (
    <Image
      src={image.thumbnailUrl || image.url}
      alt={image.alt}
      width={size}
      height={size}
      unoptimized={isInlineSvg(image.thumbnailUrl || image.url)}
      className={clsx('object-cover', className)}
      style={{ width: size, height: size }}
    />
  );
}

/**
 * The attribution line for development imagery. Rendered once beneath a gallery
 * rather than on every frame, so the disclosure is present without being noisy.
 */
export function ImageAttribution({ images }: { images: ProductImageType[] }) {
  const illustrative = images.filter((i) => i.isIllustrative);
  if (!illustrative.length) return null;

  const credited = illustrative.filter((i) => i.attribution?.author);

  return (
    <p className="mt-3 font-sans text-[0.6875rem] leading-relaxed text-ink-400">
      Photography shown is representative of the shape and finish, not of the individual piece you will receive.
      {credited.length > 0 && (
        <>
          {' '}
          Images via{' '}
          {credited.slice(0, 3).map((image, index) => (
            <span key={image.id}>
              {index > 0 && ', '}
              {image.attribution?.url ? (
                <a href={image.attribution.url} rel="noopener noreferrer nofollow" target="_blank" className="underline underline-offset-2">
                  {image.attribution.author}
                </a>
              ) : (
                image.attribution?.author
              )}
            </span>
          ))}
          .
        </>
      )}
    </p>
  );
}
