import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { formatMonthYear, projects } from '@/lib/projects';

/** One entry per project, ordered oldest first — the arc, not the noise. */
const entries = [...projects]
  .sort((a, b) => (a.startedAt < b.startedAt ? -1 : 1))
  .map((p) => ({
    slug: p.slug,
    name: p.name,
    accent: p.accent,
    date: p.startedAt,
    tagline: p.tagline,
    live: p.status === 'live',
  }));

export function Timeline() {
  return (
    <Section id="timeline" className="border-t border-border-hair">
      <Reveal>
        <SectionHeading
          eyebrow="Timeline"
          title="The build journey"
          description="Where each project entered the picture, oldest first."
        />
      </Reveal>

      <div className="relative mt-14">
        {/* Spine */}
        <div
          className="absolute left-[7px] top-2 bottom-2 w-px sm:left-[calc(8rem+7px)]"
          style={{
            background:
              'linear-gradient(to bottom, transparent, var(--border-strong) 12%, var(--border-strong) 88%, transparent)',
          }}
          aria-hidden
        />

        <ol className="flex flex-col gap-9">
          {entries.map((entry, i) => (
            <Reveal as="li" key={entry.slug} delay={i * 0.05}>
              <div
                data-accent={entry.accent}
                className="group relative flex flex-col gap-1.5 pl-8 sm:flex-row sm:gap-8 sm:pl-0"
              >
                <time
                  dateTime={entry.date}
                  className="order-2 shrink-0 font-mono text-xs text-fg-faint sm:order-1 sm:w-32 sm:pt-1 sm:text-right"
                >
                  {formatMonthYear(entry.date)}
                </time>

                <span
                  className="absolute left-0 top-1.5 size-[15px] rounded-full border-2 border-bg-0 bg-[var(--accent)] transition-transform duration-300 group-hover:scale-125 sm:left-32"
                  style={{ boxShadow: '0 0 0 4px oklch(0 0 0), 0 0 22px color-mix(in oklch, var(--accent) 55%, transparent)' }}
                  aria-hidden
                />

                <div className="order-1 flex flex-col gap-1.5 sm:order-2 sm:pl-8">
                  <Link
                    href={`/work/${entry.slug}`}
                    className="inline-flex w-fit items-center gap-1.5 text-h3 font-medium tracking-tight text-fg transition-colors hover:text-[var(--accent)]"
                  >
                    {entry.name}
                    <ArrowUpRight className="size-4 opacity-0 transition-opacity group-hover:opacity-100" />
                  </Link>
                  <p className="max-w-xl text-pretty text-sm leading-relaxed text-fg-muted">
                    {entry.tagline}
                  </p>
                </div>
              </div>
            </Reveal>
          ))}
        </ol>
      </div>

      <Reveal>
        <Link
          href="/ship-log"
          className="mt-12 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
        >
          See every shipped change
          <ArrowUpRight className="size-4" />
        </Link>
      </Reveal>
    </Section>
  );
}
