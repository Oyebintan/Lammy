import { readFile } from 'node:fs/promises';
import { join } from 'node:path';
import type { ReactElement } from 'react';
import type { Accent } from './types';

/**
 * Shared furniture for the Open Graph cards.
 *
 * These render through Satori, which is not a browser: it implements a subset
 * of flexbox and nothing else. Two consequences shape everything below —
 * every element with more than one child needs an explicit `display: flex`,
 * and none of the site's CSS applies, so the design tokens are repeated here
 * as literals rather than imported.
 */

export const OG_SIZE = { width: 1200, height: 630 } as const;
export const OG_CONTENT_TYPE = 'image/png';

/* The accent ramp, converted from the oklch tokens in globals.css. Satori has
   no oklch support, so these are the sRGB equivalents of the same colours. */
const ACCENT_HEX: Record<Accent, string> = {
  emerald: '#23d091',
  violet: '#a57afe',
  amber: '#f8ad24',
  sky: '#32bcf7',
  rose: '#ff6c86',
  lime: '#a3dd42',
};

export const FG = '#f5f5f5';
export const FG_MUTED = '#aeb1b6';
export const FG_FAINT = '#777a82';

export function accentHex(accent: Accent | undefined): string {
  return ACCENT_HEX[accent ?? 'sky'] ?? ACCENT_HEX.sky;
}

/**
 * Blend a colour toward black and return an opaque hex.
 *
 * Every gradient on these cards is built from the output of this rather than
 * from translucent stops, because Satori mishandles both ways of expressing
 * one: `#rrggbbaa` renders as an opaque block clipped to the element box, and
 * `rgba()` stops come out near-white. Since the cards sit on black anyway,
 * pre-blending gives exactly the intended colour with nothing left to
 * interpret.
 */
export function onBlack(hex: string, amount: number): string {
  const n = Number.parseInt(hex.slice(1), 16);
  const channel = (shift: number) =>
    Math.round(((n >> shift) & 255) * amount)
      .toString(16)
      .padStart(2, '0');
  return `#${channel(16)}${channel(8)}${channel(0)}`;
}

/**
 * Satori reads neither woff2 nor variable axes, so these are the static TTF
 * subsets built by `scripts/subset-fonts.py`. They are read at build time and
 * never served to a browser.
 */
export async function ogFonts() {
  const dir = join(process.cwd(), 'src', 'fonts', 'og');
  const [regular, semibold, mono] = await Promise.all([
    readFile(join(dir, 'Geist-Regular-subset.ttf')),
    readFile(join(dir, 'Geist-SemiBold-subset.ttf')),
    readFile(join(dir, 'GeistMono-Regular-subset.ttf')),
  ]);

  return [
    { name: 'Geist', data: regular, style: 'normal' as const, weight: 400 as const },
    { name: 'Geist', data: semibold, style: 'normal' as const, weight: 600 as const },
    { name: 'GeistMono', data: mono, style: 'normal' as const, weight: 400 as const },
  ];
}

/**
 * The card shell: true black, one accent bloom, a hairline top rule and the
 * wordmark. Everything specific to a card goes in `children`.
 */
export function OgFrame({
  accent,
  eyebrow,
  children,
}: {
  accent: string;
  eyebrow: string;
  children: ReactElement | ReactElement[];
}) {
  return (
    <div
      style={{
        width: '100%',
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        /* A full-bleed diagonal wash rather than the site's radial bloom:
           Satori renders a radial gradient as a rectangle clipped to its
           element box, so the soft circle came out as a hard-edged block. */
        background: `linear-gradient(135deg, ${onBlack(accent, 0.2)} 0%, ${onBlack(accent, 0.09)} 26%, ${onBlack(accent, 0.03)} 44%, #000000 62%)`,
        padding: '64px 72px',
        fontFamily: 'Geist',
        position: 'relative',
      }}
    >
      <div
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, #000000, ${accent} 50%, #000000)`,
        }}
      />

      {/* `<Lammy/>` — the same wordmark the site uses, rebuilt in the subset
          of flexbox Satori understands. */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
        <div style={{ display: 'flex', alignItems: 'baseline', fontSize: 30 }}>
          <div style={{ display: 'flex', fontFamily: 'GeistMono', color: accent }}>&lt;</div>
          <div style={{ display: 'flex', fontWeight: 600, color: FG, padding: '0 3px' }}>Lammy</div>
          <div style={{ display: 'flex', fontFamily: 'GeistMono', color: accent }}>/&gt;</div>
        </div>
        <div style={{ display: 'flex', width: 5, height: 5, borderRadius: 9999, background: FG_FAINT }} />
        <div
          style={{
            display: 'flex',
            fontFamily: 'GeistMono',
            fontSize: 19,
            letterSpacing: 2,
            color: FG_FAINT,
          }}
        >
          {eyebrow.toUpperCase()}
        </div>
      </div>

      {children}
    </div>
  );
}

/** Keeps a footer string on one line — these are URLs and some slugs are long. */
function clip(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text;
}

/** The mono footer rule shared by both cards. */
export function OgFooter({ left, right }: { left: string; right: string }) {
  return (
    <div
      style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        borderTop: '1px solid #ffffff1f',
        paddingTop: 22,
        fontFamily: 'GeistMono',
        fontSize: 21,
        color: FG_FAINT,
      }}
    >
      <div style={{ display: 'flex' }}>{clip(left, 40)}</div>
      <div style={{ display: 'flex' }}>{clip(right, 34)}</div>
    </div>
  );
}
