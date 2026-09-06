'use client';

/**
 * The last resort: an error in the root layout itself, where the normal shell is
 * unavailable. Deliberately dependency-free — no fonts, no components, inline
 * styles only, because whatever failed may have taken those with it.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: '#faf8f4', color: '#16130f', fontFamily: 'Georgia, serif' }}>
        <div style={{ maxWidth: '32rem', margin: '0 auto', padding: '6rem 1.5rem', textAlign: 'center' }}>
          <h1 style={{ fontSize: '2rem', fontWeight: 400, margin: 0 }}>Something went badly wrong</h1>
          <p style={{ marginTop: '1.25rem', lineHeight: 1.7, color: '#5a5045' }}>
            The site failed to load. Please try again in a moment — nothing you were doing has been lost.
          </p>
          <button
            type="button"
            onClick={reset}
            style={{
              marginTop: '2rem', padding: '0.875rem 1.75rem', background: '#16130f', color: '#faf8f4',
              border: 'none', cursor: 'pointer', fontSize: '0.8125rem', letterSpacing: '0.1em', textTransform: 'uppercase',
            }}
          >
            Try again
          </button>
        </div>
      </body>
    </html>
  );
}
