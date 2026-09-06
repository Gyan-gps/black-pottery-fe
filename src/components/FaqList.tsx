'use client';

import { Accordion } from './ui';

/**
 * A list of questions. Emits FAQPage structured data alongside the visible list,
 * because these pages answer real search queries and deserve the rich result.
 */
export function FaqList({ items }: { items: { question: string; answer: string }[] }) {
  if (!items.length) return null;

  const schema = {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: items.map((item) => ({
      '@type': 'Question',
      name: item.question,
      acceptedAnswer: { '@type': 'Answer', text: item.answer },
    })),
  };

  return (
    <>
      <div className="border-t border-ink-100">
        {items.map((item, index) => (
          <Accordion key={item.question} title={item.question} defaultOpen={index === 0}>
            <p className="max-w-prose font-serif text-[1.0625rem] leading-[1.75] text-ink-600">{item.answer}</p>
          </Accordion>
        ))}
      </div>

      <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} />
    </>
  );
}
