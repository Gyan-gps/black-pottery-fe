import type { Config } from 'tailwindcss';

/**
 * The design system.
 *
 * The palette is drawn from the material itself: fired black clay, unfired clay,
 * and the paper-white of a gallery wall. Two typefaces only - a serif for anything
 * editorial, a grotesque for interface text - because a craft brand reads as
 * confident when it is restrained, not when it is decorated.
 */
const config: Config = {
  content: ['./src/**/*.{js,ts,jsx,tsx,mdx}'],
  theme: {
    extend: {
      colors: {
        // The fired body of the pottery, from surface sheen to the deepest core.
        ink: {
          DEFAULT: '#16130f',
          50: '#f6f4f1',
          100: '#e8e3dc',
          200: '#cfc7bc',
          300: '#a99e91',
          400: '#7d7266',
          500: '#5a5045',
          600: '#3f382f',
          700: '#2b2620',
          800: '#1e1a16',
          900: '#16130f',
          950: '#0c0a08',
        },
        // Unfired clay and the paper it is photographed against.
        clay: {
          DEFAULT: '#a8734a',
          50: '#faf6f1',
          100: '#f2e9de',
          200: '#e4d1bc',
          300: '#d1b193',
          400: '#bd8f6a',
          500: '#a8734a',
          600: '#8d5c3a',
          700: '#714830',
          800: '#5c3b2b',
          900: '#4c3226',
        },
        paper: {
          DEFAULT: '#faf8f4',
          50: '#fdfcfa',
          100: '#faf8f4',
          200: '#f3efe7',
          300: '#e9e2d6',
        },
        // The silver-toned inlay in the engraved work.
        silver: { DEFAULT: '#b9b4ab', light: '#d6d2ca' },
        // Semantic colours, used for state rather than decoration.
        success: '#3f6b4f',
        warning: '#9a6b28',
        danger: '#8c3a2e',
      },
      fontFamily: {
        serif: ['var(--font-serif)', 'Georgia', 'Times New Roman', 'serif'],
        sans: ['var(--font-sans)', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      fontSize: {
        // An editorial scale: display sizes clamp so headlines stay proportionate
        // from a 360px phone to a wide desktop without a dozen breakpoints.
        'display-xl': ['clamp(2.75rem, 7vw, 5.5rem)', { lineHeight: '1.02', letterSpacing: '-0.03em' }],
        'display-lg': ['clamp(2.25rem, 5vw, 4rem)', { lineHeight: '1.06', letterSpacing: '-0.025em' }],
        'display-md': ['clamp(1.75rem, 3.5vw, 2.75rem)', { lineHeight: '1.12', letterSpacing: '-0.02em' }],
        'display-sm': ['clamp(1.375rem, 2.5vw, 1.875rem)', { lineHeight: '1.2', letterSpacing: '-0.015em' }],
        eyebrow: ['0.6875rem', { lineHeight: '1.4', letterSpacing: '0.18em' }],
        micro: ['0.75rem', { lineHeight: '1.5', letterSpacing: '0.02em' }],
      },
      spacing: { section: 'clamp(4rem, 9vw, 8rem)', gutter: 'clamp(1.25rem, 4vw, 3rem)' },
      maxWidth: { prose: '68ch', shell: '90rem' },
      borderRadius: { none: '0', sm: '2px', DEFAULT: '3px' },
      transitionTimingFunction: { craft: 'cubic-bezier(0.22, 1, 0.36, 1)' },
      keyframes: {
        'fade-up': { from: { opacity: '0', transform: 'translateY(12px)' }, to: { opacity: '1', transform: 'none' } },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
        shimmer: { '100%': { transform: 'translateX(100%)' } },
      },
      animation: {
        'fade-up': 'fade-up 0.6s cubic-bezier(0.22, 1, 0.36, 1) both',
        'fade-in': 'fade-in 0.4s ease both',
      },
      aspectRatio: { product: '4 / 5', hero: '3 / 4', wide: '16 / 9' },
    },
  },
  plugins: [],
};

export default config;
