import Link from 'next/link';
import clsx from 'clsx';
import type { ContentBlock } from '@/lib/types';
import { toParagraphs, flagFor } from '@/lib/format';
import { ProductImageView } from './ProductImage';
import { ProductGrid } from './ProductCard';
import { Rating } from './ui';
import { FaqList } from './FaqList';

/**
 * Renders the brand content stored in the database.
 *
 * Each block type gets a deliberate layout rather than one generic container —
 * that is the difference between a page that reads as designed and one that reads
 * as a CMS dump. A block type we do not recognise renders nothing, so an editor
 * adding something new can never break the page.
 */

const THEMES = {
  light: 'bg-paper text-ink-900',
  dark: 'bg-ink-900 text-paper',
  ink: 'bg-ink-950 text-paper',
  clay: 'bg-clay-50 text-ink-900',
} as const;

const mutedFor = (theme: keyof typeof THEMES) =>
  theme === 'light' || theme === 'clay' ? 'text-ink-500' : 'text-paper/60';

const eyebrowFor = (theme: keyof typeof THEMES) =>
  theme === 'light' || theme === 'clay' ? 'text-ink-400' : 'text-paper/45';

function Prose({ body, className }: { body: string | null; className?: string }) {
  const paragraphs = toParagraphs(body);
  if (!paragraphs.length) return null;
  return (
    <div className={className}>
      {paragraphs.map((paragraph, index) => (
        <p key={index} className={index > 0 ? 'mt-5' : undefined}>
          {paragraph}
        </p>
      ))}
    </div>
  );
}

function Cta({ cta, variant = 'primary', theme }: { cta: { label: string; href: string } | null; variant?: 'primary' | 'secondary'; theme: keyof typeof THEMES }) {
  if (!cta) return null;
  const dark = theme === 'dark' || theme === 'ink';

  return (
    <Link
      href={cta.href}
      className={clsx(
        'btn',
        variant === 'primary'
          ? dark
            ? 'border-paper bg-paper text-ink-950 hover:bg-transparent hover:text-paper'
            : 'border-ink-900 bg-ink-900 text-paper hover:bg-ink-700 hover:border-ink-700'
          : dark
            ? 'border-paper/40 text-paper hover:border-paper hover:bg-paper hover:text-ink-950'
            : 'border-ink-900/25 text-ink-900 hover:border-ink-900 hover:bg-ink-900 hover:text-paper',
      )}
    >
      {cta.label}
    </Link>
  );
}

// ── Individual blocks ───────────────────────────────────────────────────────

function Hero({ block, isFirst }: { block: ContentBlock; isFirst: boolean }) {
  const theme = block.theme ?? 'ink';

  return (
    <section className={clsx('relative isolate', THEMES[theme])}>
      {block.image && (
        <div className="absolute inset-0 -z-10">
          <ProductImageView
            image={block.image}
            sizes="100vw"
            // The hero is the largest contentful paint; it must not lazy-load.
            priority={isFirst}
            aspect="none"
            className="h-full w-full"
            imageClassName="object-cover"
          />
          {/* A gradient, not a flat scrim, so the photograph still reads. */}
          <div className="absolute inset-0 bg-gradient-to-t from-ink-950/85 via-ink-950/45 to-ink-950/25" />
        </div>
      )}

      <div className="shell flex min-h-[78vh] flex-col justify-end pb-16 pt-32 lg:min-h-[88vh] lg:pb-24">
        <div className="max-w-2xl animate-fade-up">
          {block.eyebrow && <p className={clsx('eyebrow mb-5', eyebrowFor(theme))}>{block.eyebrow}</p>}

          {isFirst ? (
            <h1 className="font-serif text-display-xl text-balance">{block.title}</h1>
          ) : (
            <h2 className="font-serif text-display-lg text-balance">{block.title}</h2>
          )}

          {block.subtitle && (
            <p className={clsx('mt-6 max-w-xl font-serif text-lg leading-relaxed lg:text-xl', mutedFor(theme))}>
              {block.subtitle}
            </p>
          )}

          {(block.cta || block.secondaryCta) && (
            <div className="mt-10 flex flex-wrap gap-3">
              <Cta cta={block.cta} theme={theme} />
              <Cta cta={block.secondaryCta} variant="secondary" theme={theme} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** An image beside text, alternating side so a run of them does not feel static. */
function ImageText({ block, reversed }: { block: ContentBlock; reversed: boolean }) {
  const theme = block.theme ?? 'light';

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell">
        <div className={clsx('grid items-center gap-10 lg:grid-cols-2 lg:gap-20', reversed && 'lg:[&>*:first-child]:order-2')}>
          {block.image ? (
            <ProductImageView
              image={block.image}
              sizes="(min-width: 1024px) 45vw, 92vw"
              aspect="hero"
              className="w-full"
            />
          ) : (
            <div />
          )}

          <div className="max-w-xl">
            {block.eyebrow && <p className={clsx('eyebrow mb-4', eyebrowFor(theme))}>{block.eyebrow}</p>}
            {block.title && <h2 className="font-serif text-display-md text-balance">{block.title}</h2>}
            {block.subtitle && (
              <p className={clsx('mt-4 font-serif text-lg leading-relaxed', mutedFor(theme))}>{block.subtitle}</p>
            )}
            <Prose body={block.body} className={clsx('mt-6 font-serif text-[1.0625rem] leading-[1.75]', mutedFor(theme))} />

            {block.data?.steps && (
              <ol className="mt-8 space-y-4">
                {block.data.steps.map((step: { title: string; body: string }, index: number) => (
                  <li key={step.title} className="flex gap-4">
                    <span className={clsx('shrink-0 font-sans text-micro tabular-nums', eyebrowFor(theme))}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <span>
                      <span className="block font-sans text-[0.8125rem] uppercase tracking-[0.1em]">{step.title}</span>
                      <span className={clsx('mt-1 block font-serif text-[0.9375rem] leading-relaxed', mutedFor(theme))}>
                        {step.body}
                      </span>
                    </span>
                  </li>
                ))}
              </ol>
            )}

            {block.data?.points && (
              <dl className="mt-8 space-y-5">
                {block.data.points.map((point: { title: string; body: string }) => (
                  <div key={point.title}>
                    <dt className="font-sans text-[0.8125rem] uppercase tracking-[0.1em]">{point.title}</dt>
                    <dd className={clsx('mt-1 font-serif text-[0.9375rem] leading-relaxed', mutedFor(theme))}>
                      {point.body}
                    </dd>
                  </div>
                ))}
              </dl>
            )}

            {(block.cta || block.secondaryCta) && (
              <div className="mt-9 flex flex-wrap gap-3">
                <Cta cta={block.cta} variant="secondary" theme={theme} />
                <Cta cta={block.secondaryCta} variant="secondary" theme={theme} />
              </div>
            )}
          </div>
        </div>
      </div>
    </section>
  );
}

function ProductBlock({ block }: { block: ContentBlock }) {
  const products = block.products ?? [];
  if (!products.length) return null;

  const theme = block.theme ?? 'light';
  const href = block.cta?.href ?? (block.collection ? `/collections/${block.collection.slug}` : '/shop');

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell">
        <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-xl">
            {block.eyebrow && <p className={clsx('eyebrow mb-3', eyebrowFor(theme))}>{block.eyebrow}</p>}
            <h2 className="font-serif text-display-md text-balance">{block.title ?? block.collection?.title}</h2>
            {(block.subtitle || block.collection?.subtitle) && (
              <p className={clsx('mt-3 font-serif text-lg leading-relaxed', mutedFor(theme))}>
                {block.subtitle ?? block.collection?.subtitle}
              </p>
            )}
          </div>

          <Link
            href={href}
            className={clsx(
              'font-sans text-micro uppercase tracking-[0.12em] underline underline-offset-[6px] transition-opacity hover:opacity-60',
              theme === 'light' || theme === 'clay' ? 'text-ink-900' : 'text-paper',
            )}
          >
            {block.cta?.label ?? 'View all'}
          </Link>
        </div>

        <ProductGrid products={products.slice(0, 8)} priorityCount={0} />
      </div>
    </section>
  );
}

function Timeline({ block }: { block: ContentBlock }) {
  const steps = block.data?.steps ?? [];
  if (!steps.length) return null;
  const theme = block.theme ?? 'light';

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell">
        {block.title && <h2 className="mb-14 max-w-2xl font-serif text-display-md text-balance">{block.title}</h2>}

        <ol className="grid gap-x-10 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
          {steps.map((step: { title: string; body: string }, index: number) => (
            <li key={step.title} className="border-t border-current/15 pt-6">
              <span className={clsx('font-sans text-micro tabular-nums', eyebrowFor(theme))}>
                {String(index + 1).padStart(2, '0')}
              </span>
              <h3 className="mt-3 font-serif text-xl">{step.title.replace(/^\d+\.\s*/, '')}</h3>
              <p className={clsx('mt-3 font-serif text-[0.9375rem] leading-[1.7]', mutedFor(theme))}>{step.body}</p>
            </li>
          ))}
        </ol>
      </div>
    </section>
  );
}

function Reviews({ block }: { block: ContentBlock }) {
  const reviews = block.reviews ?? [];
  // No social proof is better than an empty testimonial section.
  if (!reviews.length) return null;

  const theme = block.theme ?? 'light';

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell">
        <div className="mb-12 max-w-xl">
          {block.eyebrow && <p className={clsx('eyebrow mb-3', eyebrowFor(theme))}>{block.eyebrow}</p>}
          <h2 className="font-serif text-display-md">{block.title ?? 'What people say'}</h2>
        </div>

        <div className="grid gap-8 md:grid-cols-2 lg:grid-cols-3">
          {reviews.slice(0, 6).map((review) => (
            <figure key={review.id} className="border-t border-current/15 pt-6">
              <Rating value={review.rating} count={1} showCount={false} />
              {review.title && <figcaption className="mt-4 font-serif text-lg">{review.title}</figcaption>}
              <blockquote className={clsx('mt-3 font-serif text-[0.9375rem] leading-[1.75]', mutedFor(theme))}>
                {review.body.length > 260 ? `${review.body.slice(0, 260).trimEnd()}…` : review.body}
              </blockquote>
              <figcaption className={clsx('mt-5 font-sans text-micro', eyebrowFor(theme))}>
                {review.authorName}
                {review.authorCountryCode && ` ${flagFor(review.authorCountryCode)}`}
                {review.isVerifiedPurchase && <span className="ml-2 text-success">Verified purchase</span>}
                {review.product && (
                  <>
                    {' · '}
                    <Link href={`/products/${review.product.slug}`} className="underline underline-offset-2">
                      {review.product.name}
                    </Link>
                  </>
                )}
              </figcaption>
            </figure>
          ))}
        </div>
      </div>
    </section>
  );
}

function RichText({ block }: { block: ContentBlock }) {
  const theme = block.theme ?? 'light';

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell">
        <div className="max-w-prose">
          {block.eyebrow && <p className={clsx('eyebrow mb-4', eyebrowFor(theme))}>{block.eyebrow}</p>}
          {block.title && <h2 className="font-serif text-display-md text-balance">{block.title}</h2>}
          <Prose body={block.body} className={clsx('mt-6 font-serif text-[1.0625rem] leading-[1.8]', mutedFor(theme))} />
          {block.cta && (
            <div className="mt-9">
              <Cta cta={block.cta} variant="secondary" theme={theme} />
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

function CtaBlock({ block }: { block: ContentBlock }) {
  const theme = block.theme ?? 'ink';

  return (
    <section className={clsx('py-section', THEMES[theme])}>
      <div className="shell text-center">
        <h2 className="mx-auto max-w-2xl font-serif text-display-lg text-balance">{block.title}</h2>
        {block.subtitle && (
          <p className={clsx('mx-auto mt-5 max-w-lg font-serif text-lg', mutedFor(theme))}>{block.subtitle}</p>
        )}
        <div className="mt-10 flex flex-wrap justify-center gap-3">
          <Cta cta={block.cta} theme={theme} />
          <Cta cta={block.secondaryCta} variant="secondary" theme={theme} />
        </div>
      </div>
    </section>
  );
}

function Faq({ block }: { block: ContentBlock }) {
  const items = block.data?.items ?? [];
  if (!items.length) return null;

  return (
    <section className="py-section">
      <div className="shell">
        <div className="mx-auto max-w-3xl">
          {block.title && <h2 className="mb-10 font-serif text-display-md">{block.title}</h2>}
          <FaqList items={items} />
        </div>
      </div>
    </section>
  );
}

// ── Dispatcher ──────────────────────────────────────────────────────────────

export function ContentBlocks({ blocks }: { blocks: ContentBlock[] }) {
  // Tracks how many image-and-text blocks have rendered, so their sides alternate.
  let imageTextIndex = 0;

  return (
    <>
      {blocks.map((block, index) => {
        switch (block.blockType) {
          case 'hero':
            return <Hero key={block.id} block={block} isFirst={index === 0} />;

          case 'heritage':
          case 'craftsmanship':
          case 'finish':
          case 'made-by-hand':
          case 'modern-spaces':
          case 'global-shipping':
          case 'image-text':
            return <ImageText key={block.id} block={block} reversed={imageTextIndex++ % 2 === 1} />;

          case 'featured-collection':
          case 'featured-products':
            return <ProductBlock key={block.id} block={block} />;

          case 'timeline':
            return <Timeline key={block.id} block={block} />;

          case 'reviews':
            return <Reviews key={block.id} block={block} />;

          case 'rich-text':
          case 'quote':
            return <RichText key={block.id} block={block} />;

          case 'cta':
            return <CtaBlock key={block.id} block={block} />;

          case 'faq':
            return <Faq key={block.id} block={block} />;

          default:
            // An unknown block type is skipped rather than crashing the page.
            return null;
        }
      })}
    </>
  );
}
