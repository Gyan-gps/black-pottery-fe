'use client';

import { useState } from 'react';
import { Notice, Spinner } from './ui';

/**
 * Newsletter sign-up.
 *
 * There is no marketing-list endpoint in the first release, so rather than
 * pretending to subscribe people and silently dropping their address, this form
 * says plainly that it is not connected yet. A fake success message would be
 * worse than no form.
 */
export function NewsletterForm() {
  const [email, setEmail] = useState('');
  const [state, setState] = useState<'idle' | 'submitting' | 'unavailable'>('idle');

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!email.trim()) return;
    setState('submitting');
    // Deliberate short delay so the state change is legible rather than a flash.
    await new Promise((resolve) => setTimeout(resolve, 300));
    setState('unavailable');
  };

  if (state === 'unavailable') {
    return (
      <div className="border border-paper/15 bg-paper/5 px-4 py-3">
        <p className="font-sans text-[0.8125rem] leading-relaxed text-paper/70">
          Our mailing list is not open yet. Email{' '}
          <a href="mailto:hello@nizamabadblackpottery.com" className="text-paper underline underline-offset-4">
            hello@nizamabadblackpottery.com
          </a>{' '}
          and we will add you by hand.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={submit}>
      <label htmlFor="newsletter-email" className="block font-sans text-eyebrow uppercase tracking-[0.18em] text-paper/40">
        New pieces, occasionally
      </label>
      <p className="mt-2 font-sans text-[0.75rem] leading-relaxed text-paper/50">
        A note when a new shape comes out of the kiln. No more than once a month.
      </p>

      <div className="mt-4 flex">
        <input
          id="newsletter-email"
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          required
          autoComplete="email"
          className="min-h-11 min-w-0 flex-1 border border-paper/20 bg-transparent px-3.5 py-2.5 font-sans text-[0.8125rem] text-paper placeholder:text-paper/30 focus:border-paper/50 focus:outline-none"
        />
        <button
          type="submit"
          disabled={state === 'submitting'}
          className="min-h-11 border border-l-0 border-paper/20 px-5 font-sans text-micro uppercase tracking-[0.1em] text-paper transition-colors hover:bg-paper hover:text-ink-950 disabled:opacity-50"
        >
          {state === 'submitting' ? <Spinner className="h-3.5 w-3.5" /> : 'Join'}
        </button>
      </div>
    </form>
  );
}
