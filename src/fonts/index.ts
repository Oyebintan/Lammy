import localFont from 'next/font/local';

/**
 * Fonts, defined here rather than imported from `geist/font` so the loading
 * strategy is ours to set.
 *
 * The upstream package preloads both families at full character coverage:
 * 137KB the browser must have before it paints real text. Two changes:
 *
 * 1. The files are subsets built by `scripts/subset-fonts.py` — 58KB combined
 *    for the same visible repertoire.
 * 2. Only the sans face is preloaded. Mono sets small labels and code-style
 *    detail, none of which is what a visitor is waiting to read, so it loads
 *    at normal priority and swaps in. Preloading it made it compete with the
 *    face that actually blocks first paint.
 */
export const sans = localFont({
  src: './Geist-Variable-subset.woff2',
  variable: '--font-geist-sans',
  weight: '100 900',
  display: 'swap',
  preload: true,
});

export const mono = localFont({
  src: './GeistMono-Variable-subset.woff2',
  variable: '--font-geist-mono',
  weight: '100 900',
  display: 'swap',
  preload: true,
  adjustFontFallback: false,
  fallback: [
    'ui-monospace',
    'SFMono-Regular',
    'Menlo',
    'Monaco',
    'Liberation Mono',
    'DejaVu Sans Mono',
    'monospace',
  ],
});
