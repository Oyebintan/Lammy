import { cn } from '@/lib/utils';
import { site } from '../../../config/site.config';

/**
 * The wordmark: `<Lammy/>`.
 *
 * A monogram in a box said nothing about what this site is. The tag form says
 * it in one glance, which is worth more than a letter — and it costs no image,
 * scales with the type, and stays crisp at any size.
 *
 * The brackets are mono and dimmed so the name still reads as the name rather
 * than as punctuation; they take the accent on hover so the whole thing
 * responds as one object.
 */
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={cn('inline-flex items-baseline', className)}>
      <span className="font-mono text-fg-faint transition-colors duration-200 group-hover:text-[var(--accent)]">
        &lt;
      </span>
      <span className="px-[0.08em] font-semibold tracking-tight text-fg">{site.name}</span>
      <span className="font-mono text-fg-faint transition-colors duration-200 group-hover:text-[var(--accent)]">
        /&gt;
      </span>
    </span>
  );
}
