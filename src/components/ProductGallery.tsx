'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import clsx from 'clsx';
import type { ProductImage } from '@/lib/types';
import { ProductImageView, ImageAttribution } from './ProductImage';
import { IconChevronLeft, IconChevronRight, IconClose, IconZoom, Overlay } from './ui';

/**
 * The product gallery.
 *
 * For handmade work the detail and texture frames do most of the selling, so the
 * thumbnails are labelled by what they show rather than numbered. Mobile gets a
 * native scroll-snap carousel (smooth, no JS animation); desktop gets a filmstrip
 * plus a zoom view.
 */

const ROLE_LABELS: Record<string, string> = {
  product: 'Full view',
  front: 'Front',
  side: 'Side',
  detail: 'Detail',
  texture: 'Texture',
  scale: 'In scale',
  lifestyle: 'In a room',
  packaging: 'Packaging',
};

export function ProductGallery({ images, productName }: { images: ProductImage[]; productName: string }) {
  const [active, setActive] = useState(0);
  const [zoomOpen, setZoomOpen] = useState(false);
  const scrollerRef = useRef<HTMLDivElement>(null);

  const count = images.length;

  const go = useCallback(
    (index: number) => {
      if (!count) return;
      // Wraps, so arrow keys never dead-end at either edge.
      const next = (index + count) % count;
      setActive(next);
      const scroller = scrollerRef.current;
      if (scroller) {
        scroller.scrollTo({ left: next * scroller.clientWidth, behavior: 'smooth' });
      }
    },
    [count],
  );

  // Keeps the active index in step when the shopper swipes rather than taps.
  useEffect(() => {
    const scroller = scrollerRef.current;
    if (!scroller) return;

    let frame = 0;
    const onScroll = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(() => {
        const index = Math.round(scroller.scrollLeft / scroller.clientWidth);
        setActive((current) => (current === index ? current : index));
      });
    };

    scroller.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      scroller.removeEventListener('scroll', onScroll);
      cancelAnimationFrame(frame);
    };
  }, []);

  if (!count) {
    return <div className="aspect-product w-full bg-ink-100" aria-hidden="true" />;
  }

  const activeImage = images[active];

  return (
    <div>
      <div className="lg:flex lg:gap-5">
        {/* Desktop filmstrip, first in the DOM so it reads before the large image */}
        {count > 1 && (
          <div className="hidden lg:block">
            <ul className="sticky top-28 flex w-20 flex-col gap-3" role="tablist" aria-label={`${productName} images`}>
              {images.map((image, index) => (
                <li key={image.id}>
                  <button
                    type="button"
                    role="tab"
                    aria-selected={index === active}
                    aria-label={`${ROLE_LABELS[image.role] ?? 'View'} ${index + 1} of ${count}`}
                    onClick={() => setActive(index)}
                    className={clsx(
                      'block w-full overflow-hidden border transition-colors',
                      index === active ? 'border-ink-900' : 'border-transparent hover:border-ink-300',
                    )}
                  >
                    <ProductImageView image={image} sizes="80px" aspect="product" />
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Main image */}
        <div className="relative min-w-0 flex-1">
          {/* Mobile: scroll-snap carousel */}
          <div
            ref={scrollerRef}
            className="no-scrollbar flex snap-x snap-mandatory overflow-x-auto lg:hidden"
            role="region"
            aria-label={`${productName} images`}
          >
            {images.map((image) => (
              <div key={image.id} className="w-full shrink-0 snap-center">
                <ProductImageView
                  image={image}
                  sizes="100vw"
                  priority={image === images[0]}
                  aspect="product"
                  showIllustrativeNote
                />
              </div>
            ))}
          </div>

          {/* Desktop: the selected frame */}
          <button
            type="button"
            onClick={() => setZoomOpen(true)}
            className="group relative hidden w-full cursor-zoom-in lg:block"
            aria-label="Open image at full size"
          >
            <ProductImageView
              image={activeImage}
              sizes="(min-width: 1280px) 45vw, 50vw"
              priority={active === 0}
              aspect="product"
              showIllustrativeNote
            />
            <span className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center bg-paper/85 text-ink-700 opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100">
              <IconZoom className="h-4 w-4" />
            </span>
          </button>

          {/* Mobile dots */}
          {count > 1 && (
            <div className="mt-4 flex items-center justify-center gap-2 lg:hidden">
              {images.map((image, index) => (
                <button
                  key={image.id}
                  type="button"
                  onClick={() => go(index)}
                  aria-label={`Go to image ${index + 1}`}
                  aria-current={index === active}
                  className={clsx(
                    'h-1.5 rounded-full transition-all',
                    index === active ? 'w-6 bg-ink-900' : 'w-1.5 bg-ink-300',
                  )}
                />
              ))}
            </div>
          )}

          {activeImage && (
            <p className="mt-3 hidden font-sans text-micro text-ink-400 lg:block">
              {ROLE_LABELS[activeImage.role] ?? activeImage.alt}
            </p>
          )}
        </div>
      </div>

      <ImageAttribution images={images} />

      {/* Full-size view */}
      <Overlay
        open={zoomOpen}
        onClose={() => setZoomOpen(false)}
        labelledBy="zoom-title"
        side="center"
        className="max-h-[92vh] max-w-6xl bg-ink-950"
      >
        <div className="flex items-center justify-between border-b border-paper/10 px-5 py-3">
          <h2 id="zoom-title" className="font-sans text-micro uppercase tracking-[0.12em] text-paper/60">
            {productName} — {ROLE_LABELS[activeImage.role] ?? 'View'} ({active + 1}/{count})
          </h2>
          <button type="button" onClick={() => setZoomOpen(false)} className="-mr-2 p-2 text-paper/70 hover:text-paper" aria-label="Close">
            <IconClose />
          </button>
        </div>

        <div className="relative flex min-h-0 flex-1 items-center justify-center p-4">
          <ProductImageView
            image={activeImage}
            sizes="90vw"
            aspect="none"
            className="max-h-[72vh] w-auto"
            imageClassName="object-contain"
          />

          {count > 1 && (
            <>
              <button
                type="button"
                onClick={() => go(active - 1)}
                className="absolute left-3 flex h-11 w-11 items-center justify-center bg-paper/10 text-paper hover:bg-paper/20"
                aria-label="Previous image"
              >
                <IconChevronLeft />
              </button>
              <button
                type="button"
                onClick={() => go(active + 1)}
                className="absolute right-3 flex h-11 w-11 items-center justify-center bg-paper/10 text-paper hover:bg-paper/20"
                aria-label="Next image"
              >
                <IconChevronRight />
              </button>
            </>
          )}
        </div>
      </Overlay>
    </div>
  );
}
