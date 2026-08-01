import { cn } from '@/lib/utils';
import type { Project } from '@/lib/types';

/**
 * Deterministic placeholder shown whenever there is no real capture.
 *
 * This is intentionally abstract rather than a mock browser window: it must
 * never be mistaken for a screenshot of the actual product. The seed keeps a
 * given project's card stable across builds.
 */
function FallbackArt({ project, className }: { project: Project; className?: string }) {
  const seed = project.slug.split('').reduce((a, c) => a + c.charCodeAt(0), 0);
  const rotation = seed % 360;
  const initials = project.name
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join('')
    .toUpperCase();

  return (
    <div
      className={cn('grain relative flex items-center justify-center overflow-hidden', className)}
      style={{
        background: `
          radial-gradient(120% 90% at 18% 8%, color-mix(in oklch, var(--accent) 26%, transparent) 0%, transparent 58%),
          radial-gradient(90% 70% at 88% 92%, color-mix(in oklch, var(--accent) 14%, transparent) 0%, transparent 62%),
          linear-gradient(${rotation}deg, oklch(0.09 0.004 265) 0%, oklch(0.045 0 0) 100%)
        `,
      }}
      aria-hidden
    >
      <div
        className="absolute inset-0 opacity-[0.16]"
        style={{
          backgroundImage:
            'linear-gradient(oklch(1 0 0 / 0.5) 1px, transparent 1px), linear-gradient(90deg, oklch(1 0 0 / 0.5) 1px, transparent 1px)',
          backgroundSize: '54px 54px',
          maskImage: 'radial-gradient(70% 60% at 50% 45%, black, transparent)',
        }}
      />
      <span className="relative font-mono text-4xl font-semibold tracking-tight text-[color-mix(in_oklch,var(--accent)_60%,white)] opacity-45">
        {initials}
      </span>
    </div>
  );
}

const STATUS_NOTE: Record<string, string> = {
  unreachable: 'Live site did not respond when last checked',
  protected: 'Deployment is access-protected',
  error: 'Capture failed on the last run',
  'never-attempted': 'No capture yet',
};

/**
 * True when a capture came back as a near-blank frame.
 *
 * The stored phash is a 16×16 average hash, so its set-bit count is a measure
 * of how much of the image differs from its own mean — a flat frame barely
 * moves off zero. One site's landing page is a mostly-empty splash, and the
 * card for it rendered as a large black rectangle that read as a broken image
 * rather than a screenshot.
 *
 * Measured across the current captures: five healthy ones sit between 27% and
 * 46%, the blank one at 7%. A 12% cut-off clears the nearest real capture by
 * more than double. The upper bound catches the same failure inverted — a
 * blown-out white frame.
 */
function isFlat(phash: string | null): boolean {
  if (!phash) return false;
  let bits = 0;
  let set = 0;
  for (const ch of phash) {
    const nibble = Number.parseInt(ch, 16);
    if (Number.isNaN(nibble)) return false;
    bits += 4;
    for (let i = 0; i < 4; i += 1) set += (nibble >> i) & 1;
  }
  if (bits === 0) return false;
  const ratio = set / bits;
  return ratio < 0.12 || ratio > 0.88;
}

export function ProjectShot({
  project,
  className,
  sizes = '(min-width: 1024px) 50vw, 100vw',
  priority = false,
}: {
  project: Project;
  className?: string;
  sizes?: string;
  priority?: boolean;
}) {
  const shot = project.screenshot;
  const blank = isFlat(shot.phash);
  const hasShot = shot.status === 'ok' && shot.base && shot.widths.length > 0 && !blank;

  if (!hasShot) {
    return (
      <div className={cn('relative', className)}>
        <FallbackArt project={project} className="size-full" />
        <span className="sr-only">
          {blank
            ? 'The live site captured as a near-blank frame, so generated artwork is shown'
            : (STATUS_NOTE[shot.status] ?? 'No screenshot available')}{' '}
          for {project.name}.
        </span>
      </div>
    );
  }

  const srcSet = shot.widths.map((w) => `${shot.base}-${w}.webp ${w}w`).join(', ');
  const largest = shot.widths[shot.widths.length - 1];

  return (
    /* Screenshots are already optimally encoded at exact widths by the capture
       pipeline, so they are served directly rather than through next/image —
       re-optimising them would cost quota and gain nothing. */
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={`${shot.base}-${largest}.webp`}
      srcSet={srcSet}
      sizes={sizes}
      alt={`Screenshot of the ${project.name} homepage`}
      width={largest}
      height={Math.round(largest / shot.aspectRatio)}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={cn('object-cover object-top', className)}
      style={
        shot.blurDataURL
          ? { backgroundImage: `url(${shot.blurDataURL})`, backgroundSize: 'cover' }
          : undefined
      }
    />
  );
}
