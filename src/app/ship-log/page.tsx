import type { Metadata } from 'next';
import Link from 'next/link';
import { GitMerge, GitCommitHorizontal, Rocket, Tag } from 'lucide-react';
import { Badge, EmptyState, Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/motion';
import { formatDate, projects, shipLog, shipLogByMonth } from '@/lib/projects';
import type { ShipKind } from '@/lib/types';

export const dynamic = 'error';

export const metadata: Metadata = {
  title: 'Ship Log',
  description:
    'Every shipped change, newest first — merges, releases and project launches, pulled straight from commit history and deployment records.',
  alternates: { canonical: '/ship-log' },
};

const KIND_ICON: Record<ShipKind, typeof GitMerge> = {
  repo_created: Rocket,
  first_deploy: Rocket,
  merge: GitMerge,
  release: Tag,
  milestone: GitCommitHorizontal,
};

const KIND_LABEL: Record<ShipKind, string> = {
  repo_created: 'Launched',
  first_deploy: 'Deployed',
  merge: 'Shipped',
  release: 'Released',
  milestone: 'Milestone',
};

export default function ShipLogPage() {
  const months = shipLogByMonth();

  const launches = projects
    .filter((p) => p.status === 'live')
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  return (
    <Section className="pt-36">
      <Reveal>
        <SectionHeading
          eyebrow="Ship log"
          title="Everything that went out the door"
          description={`${shipLog.length} events across ${projects.length} projects, assembled from commit history, release tags and deployment records.`}
        />
      </Reveal>

      {/* Launch summary */}
      {launches.length > 0 ? (
        <Reveal>
          <ul className="mt-12 flex flex-col divide-y divide-[var(--border)] border-y border-border-hair">
            {launches.map((p) => (
              <li key={p.slug} data-accent={p.accent}>
                <Link
                  href={`/work/${p.slug}`}
                  className="group flex items-center justify-between gap-4 py-4 transition-colors"
                >
                  <span className="flex min-w-0 items-center gap-3">
                    <span
                      className="size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                      aria-hidden
                    />
                    <span className="truncate text-h3 font-medium tracking-tight text-fg transition-colors group-hover:text-[var(--accent)]">
                      {p.name}
                    </span>
                  </span>
                  <span className="shrink-0 font-mono text-xs text-fg-faint">
                    Shipped{' '}
                    {new Date(p.startedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </Reveal>
      ) : null}

      {/* Full log */}
      {months.length === 0 ? (
        <div className="mt-14">
          <EmptyState
            title="Nothing logged yet"
            description="Ship events are derived from commit history the next time discovery runs."
          />
        </div>
      ) : (
        <div className="mt-16 flex flex-col gap-14">
          {months.map((month) => (
            <div key={month.key} className="flex flex-col gap-6 sm:flex-row sm:gap-10">
              <h2 className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-fg-faint sm:w-36 sm:pt-1">
                {month.label}
              </h2>

              <ol className="flex min-w-0 flex-1 flex-col gap-px">
                {month.events.map((event, i) => {
                  const Icon = KIND_ICON[event.kind];
                  const Wrapper = event.url ? 'a' : 'div';
                  return (
                    <Reveal as="li" key={event.id} delay={Math.min(i, 6) * 0.03}>
                      <Wrapper
                        data-accent={event.accent}
                        {...(event.url
                          ? { href: event.url, target: '_blank', rel: 'noreferrer noopener' }
                          : {})}
                        className="group flex items-start gap-4 rounded-xl px-3 py-3.5 transition-colors hover:bg-bg-2"
                      >
                        <Icon className="mt-0.5 size-4 shrink-0 text-fg-faint transition-colors group-hover:text-[var(--accent)]" />

                        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
                          <p className="text-pretty text-sm leading-snug text-fg-muted transition-colors group-hover:text-fg">
                            {event.title}
                          </p>
                          <div className="flex flex-wrap items-center gap-2">
                            <Badge size="sm" variant="accent">
                              {event.projectName}
                            </Badge>
                            <span className="font-mono text-[0.6875rem] text-fg-faint">
                              {KIND_LABEL[event.kind]}
                            </span>
                            {event.prNumber ? (
                              <span className="font-mono text-[0.6875rem] text-fg-faint">
                                #{event.prNumber}
                              </span>
                            ) : null}
                          </div>
                        </div>

                        <time
                          dateTime={event.date}
                          className="shrink-0 pt-0.5 font-mono text-[0.6875rem] text-fg-faint"
                        >
                          {formatDate(event.date)}
                        </time>
                      </Wrapper>
                    </Reveal>
                  );
                })}
              </ol>
            </div>
          ))}
        </div>
      )}
    </Section>
  );
}
