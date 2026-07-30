import { ArrowDown, ArrowUpRight } from 'lucide-react';
import { site } from '../../../config/site.config';
import { activity, projects } from '@/lib/projects';
import { ButtonLink } from '@/components/ui/primitives';
import { Counter, Reveal } from '@/components/motion/motion';

const liveCount = projects.filter((p) => p.status === 'live').length;

const STATS = [
  { label: 'Projects shipped', value: activity.totals.projectsShipped },
  { label: 'Live deployments', value: activity.totals.deployments },
  { label: 'Repositories', value: activity.totals.repositories },
  { label: 'Technologies', value: activity.totals.technologies },
];

export function Hero() {
  return (
    <section className="grain relative flex min-h-[100svh] items-center overflow-hidden px-5 pt-32 pb-20 sm:px-8">
      {/* One light source, low and off-centre. */}
      <div
        className="spotlight left-1/2 top-0 h-[38rem] w-[52rem] -translate-x-1/2 -translate-y-1/3"
        style={{ background: 'radial-gradient(circle, oklch(0.5 0.13 265 / 0.4), transparent 70%)' }}
        aria-hidden
      />
      <div
        className="absolute inset-x-0 top-0 h-px"
        style={{
          background:
            'linear-gradient(90deg, transparent, oklch(1 0 0 / 0.14) 50%, transparent)',
        }}
        aria-hidden
      />

      <div className="relative mx-auto w-full max-w-6xl">
        <Reveal>
          <div className="inline-flex items-center gap-2.5 rounded-full border border-border-hair bg-bg-2/60 px-3.5 py-1.5">
            <span className="relative flex size-1.5">
              <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
              <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
            </span>
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted">
              {liveCount} live {liveCount === 1 ? 'deployment' : 'deployments'}
            </span>
          </div>
        </Reveal>

        <Reveal delay={0.06}>
          <h1 className="mt-8 max-w-5xl text-balance text-display font-semibold text-fg">
            I build products,
            <br />
            <span className="text-fg-subtle">not prototypes.</span>
          </h1>
        </Reveal>

        <Reveal delay={0.12}>
          <p className="mt-7 max-w-xl text-pretty text-lead text-fg-muted">
            I&rsquo;m {site.name} — {site.role.toLowerCase()}. This page indexes itself: every
            project below is discovered from my GitHub and Vercel accounts, screenshotted from its
            live deployment, and written up from its own commit history.
          </p>
        </Reveal>

        <Reveal delay={0.18}>
          <div className="mt-10 flex flex-wrap items-center gap-3">
            <ButtonLink href="/work" size="lg" variant="primary">
              See the work
              <ArrowUpRight />
            </ButtonLink>
            <ButtonLink href="/ship-log" size="lg" variant="secondary">
              Ship log
            </ButtonLink>
          </div>
        </Reveal>

        <Reveal delay={0.26}>
          <dl className="mt-20 grid max-w-3xl grid-cols-2 gap-x-6 gap-y-9 sm:grid-cols-4">
            {STATS.map((stat) => (
              <div key={stat.label} className="flex flex-col gap-1.5">
                <dt className="order-2 font-mono text-[0.6875rem] uppercase tracking-[0.14em] text-fg-faint">
                  {stat.label}
                </dt>
                <dd className="order-1 text-4xl font-semibold tracking-tight text-fg tabular-nums sm:text-5xl">
                  <Counter value={stat.value} />
                </dd>
              </div>
            ))}
          </dl>
        </Reveal>
      </div>

      <a
        href="#featured"
        aria-label="Skip to featured work"
        className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 text-fg-faint transition-colors hover:text-fg-muted md:block"
      >
        <ArrowDown className="size-5 animate-bounce" />
      </a>
    </section>
  );
}
