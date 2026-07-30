import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { site } from '../../../config/site.config';
import { activity, featuredProjects, projects } from '@/lib/projects';
import { ButtonLink, StatusDot } from '@/components/ui/primitives';
import { ProjectShot } from '@/components/project/project-shot';
import { Counter } from '@/components/motion/motion';
import { SpotlightCard } from '@/components/motion/spotlight';
import { prettyUrl } from '@/lib/utils';

const liveCount = projects.filter((p) => p.status === 'live').length;
const lead = featuredProjects[0];

const STATS = [
  { label: 'Shipped', value: activity.totals.projectsShipped },
  { label: 'Live', value: activity.totals.deployments },
  { label: 'Repos', value: activity.totals.repositories },
  { label: 'Tech', value: activity.totals.technologies },
];

/** Deduped stack labels for the marquee ribbon. */
const ribbon = [
  ...new Set(projects.flatMap((p) => p.caseStudy.technologies.value)),
].slice(0, 18);

export function Hero() {
  return (
    // The nav is fixed and 72px tall, so the top padding only has to clear it
    // plus a little breathing room. It used to clear it by another 56px, which
    // on a laptop window left a fifth of the screen empty before anything
    // started — and pushed the stats row below the fold.
    <section
      data-motion
      className="grain relative overflow-hidden px-5 pt-24 pb-16 sm:px-8 sm:pt-26 lg:pb-24"
    >
      {/* Aurora field. Three slow-drifting blooms give the black background
          depth without competing with the type. */}
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
        {/* The gradients carry their own falloff — see `.aurora` in
            globals.css for why there is no blur filter here any more. */}
        {/* No blur filter — see `.aurora` in globals.css. The stop ramps below
            approximate a gaussian falloff and every one of them ends at alpha
            zero in its own hue rather than at the `transparent` keyword, which
            interpolates through a different colour and leaves a visible ring
            against pure black. */}
        <div
          className="aurora aurora-a -left-[18%] -top-[30%] h-[46rem] w-[46rem]"
          style={{
            background:
              'radial-gradient(circle, oklch(0.55 0.19 265 / 0.34) 0%, oklch(0.55 0.19 265 / 0.26) 20%, oklch(0.55 0.19 265 / 0.17) 36%, oklch(0.55 0.19 265 / 0.09) 52%, oklch(0.55 0.19 265 / 0.04) 68%, oklch(0.55 0.19 265 / 0.01) 84%, oklch(0.55 0.19 265 / 0) 100%)',
          }}
        />
        <div
          className="aurora aurora-b left-[34%] -top-[38%] h-[40rem] w-[50rem]"
          style={{
            background:
              'radial-gradient(circle, oklch(0.6 0.16 190 / 0.22) 0%, oklch(0.6 0.16 190 / 0.17) 20%, oklch(0.6 0.16 190 / 0.11) 36%, oklch(0.6 0.16 190 / 0.06) 52%, oklch(0.6 0.16 190 / 0.03) 68%, oklch(0.6 0.16 190 / 0.01) 84%, oklch(0.6 0.16 190 / 0) 100%)',
          }}
        />
        <div
          className="aurora aurora-c right-[-16%] -top-[4%] h-[38rem] w-[38rem]"
          style={{
            background:
              'radial-gradient(circle, oklch(0.6 0.2 320 / 0.2) 0%, oklch(0.6 0.2 320 / 0.15) 20%, oklch(0.6 0.2 320 / 0.1) 36%, oklch(0.6 0.2 320 / 0.055) 52%, oklch(0.6 0.2 320 / 0.025) 68%, oklch(0.6 0.2 320 / 0.008) 84%, oklch(0.6 0.2 320 / 0) 100%)',
          }}
        />
      </div>
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{ background: 'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.16) 50%, transparent)' }}
        aria-hidden
      />

      <div className="relative mx-auto grid w-full max-w-6xl items-center gap-12 lg:grid-cols-[1.05fr_0.95fr] lg:gap-16">
        {/* Copy */}
        <div className="flex flex-col">
          <div className="hero-in" style={{ '--hero-delay': '0ms' } as React.CSSProperties}>
            <div className="glass inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5">
              <StatusDot live />
              <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted">
                {liveCount} live {liveCount === 1 ? 'deployment' : 'deployments'}
              </span>
            </div>
          </div>

          <h1
            className="hero-in mt-6 text-balance text-display font-semibold text-fg sm:mt-8"
            style={{ '--hero-delay': '70ms' } as React.CSSProperties}
          >
            I build products,
            <br />
            <span className="text-fg-subtle">not prototypes.</span>
          </h1>

          <p
            className="hero-in mt-5 max-w-md text-pretty text-lead text-fg-muted sm:mt-6"
            style={{ '--hero-delay': '140ms' } as React.CSSProperties}
          >
            I&rsquo;m {site.name} — {site.role.toLowerCase()}. This page indexes itself: every
            project is pulled from my GitHub and Vercel accounts and written up from its own
            commit history.
          </p>

          <div
            className="hero-in mt-7 flex flex-wrap items-center gap-3 sm:mt-8"
            style={{ '--hero-delay': '210ms' } as React.CSSProperties}
          >
            <ButtonLink href="/work" size="lg" variant="primary">
              See the work
              <ArrowUpRight />
            </ButtonLink>
            <ButtonLink href="/ship-log" size="lg" variant="secondary">
              Ship log
            </ButtonLink>
          </div>

          {/* Compact enough to sit above the fold on a phone alongside
              everything above it, rather than being stranded below it. */}
          <dl
            className="hero-in mt-10 grid grid-cols-4 gap-x-4 gap-y-5 border-t border-border-hair pt-6 sm:mt-12 sm:gap-x-6"
            style={{ '--hero-delay': '280ms' } as React.CSSProperties}
          >
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1">
                <dd className="order-1 text-2xl font-semibold tracking-tight text-fg tabular-nums sm:text-4xl">
                  <Counter value={stat.value} />
                </dd>
                <dt className="order-2 font-mono text-[0.625rem] uppercase tracking-[0.12em] text-fg-faint sm:text-[0.6875rem]">
                  {stat.label}
                </dt>
              </div>
            ))}
          </dl>
        </div>

        {/* Preview panel — the hero's visual anchor, and a real project rather
            than decoration. */}
        {lead ? (
          <div
            className="hero-in relative"
            style={{ '--hero-delay': '340ms' } as React.CSSProperties}
            data-accent={lead.accent}
          >
            <SpotlightCard className="glass-strong group relative overflow-hidden rounded-[1.75rem] p-2.5">
              <Link href={`/work/${lead.slug}`} className="relative z-[2] block">
                <div className="relative aspect-[16/11] w-full overflow-hidden rounded-[1.35rem] bg-bg-1">
                  <ProjectShot
                    project={lead}
                    priority
                    sizes="(min-width: 1024px) 46vw, 100vw"
                    className="size-full transition-transform duration-700 group-hover:scale-[1.04]"
                  />
                  {/* The label sits on top of a real screenshot, so the scrim
                      has to reach near-solid at the base — a soft fade let the
                      captured page's own UI show through behind the text. */}
                  <div
                    className="pointer-events-none absolute inset-0"
                    style={{
                      background:
                        'linear-gradient(to top, oklch(0 0 0) 0%, oklch(0 0 0 / 0.95) 30%, oklch(0 0 0 / 0.55) 52%, transparent 78%)',
                    }}
                  />

                  <div className="absolute inset-x-0 bottom-0 flex items-end justify-between gap-3 p-5">
                    <div className="flex min-w-0 flex-col gap-1.5">
                      <span className="flex items-center gap-2">
                        <StatusDot live={lead.status === 'live'} />
                        <span className="font-mono text-[0.625rem] uppercase tracking-[0.16em] text-fg-muted">
                          Featured
                        </span>
                      </span>
                      <span className="truncate text-h3 font-semibold tracking-tight text-fg">
                        {lead.name}
                      </span>
                      {lead.liveUrl ? (
                        <span className="truncate font-mono text-[0.6875rem] text-fg-faint">
                          {prettyUrl(lead.liveUrl)}
                        </span>
                      ) : null}
                    </div>
                    <span className="grid size-9 shrink-0 place-items-center rounded-full bg-fg text-bg-0 transition-transform duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5">
                      <ArrowUpRight className="size-4" />
                    </span>
                  </div>
                </div>
              </Link>
            </SpotlightCard>
          </div>
        ) : null}
      </div>

      {/* Stack ribbon — quiet continuous motion that signals breadth without
          another block of text. */}
      <div className="relative mx-auto mt-14 w-full max-w-6xl overflow-hidden sm:mt-20">
        <div
          className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-bg-0 to-transparent"
          aria-hidden
        />
        <div
          className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-bg-0 to-transparent"
          aria-hidden
        />
        <div className="marquee-track flex w-max gap-2.5">
          {[0, 1].map((copy) => (
            <div key={copy} className="flex gap-2.5" aria-hidden={copy === 1}>
              {ribbon.map((tech) => (
                <span
                  key={`${copy}-${tech}`}
                  className="whitespace-nowrap rounded-full border border-border-hair bg-bg-2/50 px-3.5 py-1.5 font-mono text-xs text-fg-subtle"
                >
                  {tech}
                </span>
              ))}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
