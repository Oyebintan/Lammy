import type { Metadata } from 'next';
import { GitMerge, GitCommitHorizontal, Rocket, Tag } from 'lucide-react';
import { IntentLink } from '@/components/ui/intent-link';
import { Badge, EmptyState, Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { formatDate, projects, shipLog, shipLogByMonth } from '@/lib/projects';
import type { Accent, ShipKind } from '@/lib/types';

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

/**
 * The rules that make the filter work, emitted once per build.
 *
 * They cannot be static utility classes because the selector has to name each
 * project slug, and the slugs come from discovery. Every rule is derived from
 * the same list that renders the buttons, so the two cannot drift.
 */
function FilterRules({ slugs }: { slugs: string[] }) {
  const css = slugs
    .filter((slug) => slug !== 'all')
    .flatMap((slug) => [
      /* Hide events belonging to any other project. */
      `.log:has(#ship-${slug}:checked) [data-project]:not([data-project="${slug}"]){display:none}`,
      /* And hide a month that is left with nothing in it. */
      `.log:has(#ship-${slug}:checked) [data-month]:not(:has([data-project="${slug}"])){display:none}`,
    ])
    .concat(
      slugs.map(
        (slug) =>
          `.log:has(#ship-${slug}:checked) label[for="ship-${slug}"]{background:var(--accent);border-color:transparent;color:var(--bg-0)}` +
          `.log:has(#ship-${slug}:checked) label[for="ship-${slug}"] span{color:var(--bg-0);opacity:.7}`,
      ),
      /* Keyboard users must be able to see where they are. */
      slugs.map(
        (slug) =>
          `.log #ship-${slug}:focus-visible+label[for="ship-${slug}"]{outline:2px solid oklch(0.8 0.02 265);outline-offset:3px}`,
      ),
    )
    .join('');

  return <style dangerouslySetInnerHTML={{ __html: css }} />;
}

export default function ShipLogPage() {
  const months = shipLogByMonth();

  /* One button per project that actually has events, newest activity first,
     so the row matches what the log contains rather than what exists. */
  const counts = new Map<string, { name: string; accent: Accent; count: number }>();
  for (const event of shipLog) {
    const seen = counts.get(event.slug);
    if (seen) seen.count += 1;
    else counts.set(event.slug, { name: event.projectName, accent: event.accent, count: 1 });
  }

  const filters = [
    { slug: 'all', label: 'All', accent: 'sky' as Accent, count: shipLog.length },
    ...[...counts.entries()]
      .sort((a, b) => b[1].count - a[1].count)
      .map(([slug, v]) => ({ slug, label: v.name, accent: v.accent, count: v.count })),
  ];

  const launches = projects
    .filter((p) => p.status === 'live')
    .sort((a, b) => (a.startedAt < b.startedAt ? 1 : -1));

  return (
    <Section className="pt-28 sm:pt-32">
      <Reveal immediate>
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
                {/* Wraps below `sm`. Side by side on a 320px screen the fixed
                    date stole enough width to truncate names to "Career
                    Reco…", which is worse than a second line. */}
                <IntentLink
                  href={`/work/${p.slug}`}
                  className="group flex flex-col gap-1 py-4 transition-colors sm:flex-row sm:items-center sm:justify-between sm:gap-4"
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
                  <span className="shrink-0 pl-[18px] font-mono text-xs text-fg-faint sm:pl-0">
                    Shipped{' '}
                    {new Date(p.startedAt).toLocaleDateString('en-US', {
                      month: 'long',
                      year: 'numeric',
                      timeZone: 'UTC',
                    })}
                  </span>
                </IntentLink>
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
        <div className="log mt-16 flex flex-col gap-10">
          <FilterRules slugs={filters.map((f) => f.slug)} />

          {/* A filter with no client JavaScript.
              The radios are the state, `:has()` reads it, and CSS does the
              hiding — so this needs no hydration on a page that otherwise
              ships almost none. Real radios also mean arrow-key navigation
              and screen-reader semantics come for free. */}
          <fieldset className="flex flex-col gap-3">
            <legend className="sr-only">Filter the log by project</legend>
            <div className="flex flex-wrap gap-2">
              {filters.map((f) => (
                <span key={f.slug} className="contents">
                  <input
                    type="radio"
                    name="ship-filter"
                    id={`ship-${f.slug}`}
                    defaultChecked={f.slug === 'all'}
                    className="sr-only"
                  />
                  <label
                    htmlFor={`ship-${f.slug}`}
                    data-accent={f.accent}
                    className="cursor-pointer rounded-full border border-border-hair px-3.5 py-1.5 font-mono text-xs text-fg-subtle transition-colors hover:border-border-strong hover:text-fg"
                  >
                    {f.label}
                    <span className="ml-1.5 text-fg-faint">{f.count}</span>
                  </label>
                </span>
              ))}
            </div>
          </fieldset>

          {months.map((month) => (
            <div
              key={month.key}
              data-month
              className="flex flex-col gap-6 sm:flex-row sm:gap-10"
            >
              <h2 className="shrink-0 font-mono text-xs uppercase tracking-[0.16em] text-fg-faint sm:w-36 sm:pt-1">
                {month.label}
              </h2>

              <ol className="flex min-w-0 flex-1 flex-col gap-px">
                {month.events.map((event, i) => {
                  const Icon = KIND_ICON[event.kind];
                  const Wrapper = event.url ? 'a' : 'div';
                  return (
                    <Reveal
                      as="li"
                      key={event.id}
                      delay={Math.min(i, 6) * 0.03}
                      data-project={event.slug}
                    >
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
