import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ArrowUpRight } from 'lucide-react';
import { GithubMark } from '@/components/ui/icons';
import {
  Badge,
  ButtonLink,
  EvidenceChip,
  StatusDot,
  Surface,
} from '@/components/ui/primitives';
import { ProjectShot } from '@/components/project/project-shot';
import { Reveal } from '@/components/motion/reveal';
import { formatMonthYear, getProject, projectSlugs } from '@/lib/projects';
import { prettyUrl } from '@/lib/utils';
import { site } from '../../../../config/site.config';
import type { Evidence, Sourced } from '@/lib/types';

export const dynamic = 'error';

export function generateStaticParams() {
  return projectSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) return {};

  return {
    title: project.name,
    description: project.tagline,
    alternates: { canonical: `/work/${project.slug}` },
    openGraph: {
      type: 'article',
      title: `${project.name} — ${site.name}`,
      description: project.tagline,
      url: `${site.url}/work/${project.slug}`,
    },
    twitter: {
      card: 'summary_large_image',
      title: `${project.name} — ${site.name}`,
      description: project.tagline,
    },
  };
}

/** Renders a narrative block only when it exists, with its provenance attached. */
function Chapter({
  index,
  title,
  sourced,
  children,
}: {
  index: string;
  title: string;
  sourced?: Sourced<unknown> | null;
  children: React.ReactNode;
}) {
  const evidence: Evidence[] =
    sourced && sourced.via.kind === 'derived' ? sourced.via.from.slice(0, 4) : [];

  return (
    <Reveal>
      <section className="flex flex-col gap-5 border-t border-border-hair pt-10 sm:flex-row sm:gap-12">
        <div className="flex shrink-0 items-baseline gap-3 sm:w-44 sm:flex-col sm:gap-1.5">
          <span className="font-mono text-xs text-fg-faint">{index}</span>
          <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-fg-muted">{title}</h2>
        </div>
        <div className="flex min-w-0 flex-1 flex-col gap-5">
          {children}
          {evidence.length > 0 ? (
            <div className="flex flex-wrap gap-1.5">
              {evidence.map((e, i) => (
                <EvidenceChip key={`${e.type}-${i}`} evidence={e} />
              ))}
            </div>
          ) : null}
        </div>
      </section>
    </Reveal>
  );
}

export default async function ProjectPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);
  if (!project) notFound();

  const cs = project.caseStudy;

  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'SoftwareSourceCode',
    name: project.name,
    description: project.tagline,
    codeRepository: project.primaryRepo.url,
    programmingLanguage: cs.technologies.value,
    dateCreated: project.startedAt,
    author: { '@type': 'Person', name: site.legalName, url: site.url },
    ...(project.liveUrl ? { url: project.liveUrl } : {}),
  };

  return (
    <article data-accent={project.accent}>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      {/* Header */}
      <header className="grain relative overflow-hidden px-5 pt-32 pb-14 sm:px-8">
        <div
          className="spotlight left-1/2 top-0 h-[30rem] w-[46rem] -translate-x-1/2 -translate-y-1/2"
          style={{
            background:
              'radial-gradient(circle, color-mix(in oklch, var(--accent) 32%, transparent), transparent 70%)',
          }}
          aria-hidden
        />
        <div className="relative mx-auto w-full max-w-5xl">
          <Link
            href="/work"
            className="inline-flex items-center gap-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
          >
            <ArrowLeft className="size-4" />
            All work
          </Link>

          <div className="mt-8 flex items-center gap-2.5">
            <StatusDot live={project.status === 'live'} />
            <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-muted">
              {project.status}
            </span>
            <span className="text-fg-faint/50">·</span>
            <span className="font-mono text-[0.6875rem] text-fg-faint">
              {formatMonthYear(project.startedAt)}
            </span>
          </div>

          <h1 className="mt-5 text-balance text-h1 font-semibold tracking-tight text-fg">
            {project.name}
          </h1>
          <p className="mt-5 max-w-2xl text-pretty text-lead text-fg-muted">{project.tagline}</p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            {project.liveUrl ? (
              <ButtonLink href={project.liveUrl} external variant="primary">
                Visit live site
                <ArrowUpRight />
              </ButtonLink>
            ) : null}
            {project.repos.map((repo) => (
              <ButtonLink key={repo.name} href={repo.url} external variant="secondary">
                <GithubMark />
                {repo.name}
              </ButtonLink>
            ))}
          </div>
        </div>
      </header>

      {/* Hero shot */}
      <div className="px-5 sm:px-8">
        <Reveal immediate>
          <Surface
            tone="card"
            radius="xl"
            className="mx-auto w-full max-w-6xl overflow-hidden bg-bg-1"
          >
            <div className="relative aspect-[16/10] w-full sm:aspect-[16/9]">
              <ProjectShot
                project={project}
                priority
                sizes="(min-width: 1280px) 1200px, 100vw"
                className="size-full"
              />
            </div>
          </Surface>
          {project.screenshot.status === 'ok' && project.screenshot.capturedAt ? (
            <p className="mx-auto mt-3 w-full max-w-6xl text-right font-mono text-[0.6875rem] text-fg-faint">
              Captured automatically from {prettyUrl(project.liveUrl ?? '')} ·{' '}
              {formatMonthYear(project.screenshot.capturedAt)}
            </p>
          ) : null}
        </Reveal>
      </div>

      {/* Body */}
      <div className="mx-auto flex w-full max-w-5xl flex-col gap-12 px-5 py-20 sm:px-8">
        {cs.problem ? (
          <Chapter index="01" title="Problem" sourced={cs.problem}>
            <p className="text-pretty text-lead leading-relaxed text-fg-muted">
              {cs.problem.value}
            </p>
          </Chapter>
        ) : null}

        {cs.solution ? (
          <Chapter index="02" title="Solution" sourced={cs.solution}>
            <p className="text-pretty text-lead leading-relaxed text-fg-muted">
              {cs.solution.value}
            </p>
          </Chapter>
        ) : null}

        <Chapter index="03" title="Technologies" sourced={cs.technologies}>
          <ul className="flex flex-wrap gap-1.5">
            {cs.technologies.value.map((t) => (
              <li key={t}>
                <Badge variant="accent">{t}</Badge>
              </li>
            ))}
          </ul>
        </Chapter>

        {cs.keyFeatures ? (
          <Chapter index="04" title="Key features" sourced={cs.keyFeatures}>
            <ul className="flex flex-col gap-3">
              {cs.keyFeatures.value.map((f) => (
                <li key={f} className="flex gap-3 text-sm leading-relaxed text-fg-muted">
                  <span
                    className="mt-[0.45rem] size-1.5 shrink-0 rounded-full bg-[var(--accent)]"
                    aria-hidden
                  />
                  <span className="text-pretty">{f}</span>
                </li>
              ))}
            </ul>
          </Chapter>
        ) : null}

        {cs.architecture ? (
          <Chapter index="05" title="Architecture" sourced={cs.architecture}>
            <p className="text-pretty leading-relaxed text-fg-muted">{cs.architecture.value}</p>
          </Chapter>
        ) : null}

        {cs.challenges ? (
          <Chapter index="06" title="Challenges" sourced={cs.challenges}>
            <div className="flex flex-col gap-4">
              {cs.challenges.value.map((c) => (
                <Surface key={c.title} tone="card" className="flex flex-col gap-3 p-6">
                  <h3 className="text-h3 font-medium tracking-tight text-fg">{c.title}</h3>
                  <p className="text-pretty text-sm leading-relaxed text-fg-muted">{c.detail}</p>
                  <div className="flex flex-wrap gap-1.5 pt-1">
                    {c.evidence.map((e, i) => (
                      <EvidenceChip key={`${c.title}-${i}`} evidence={e} />
                    ))}
                  </div>
                </Surface>
              ))}
            </div>
          </Chapter>
        ) : null}

        {cs.outcome ? (
          <Chapter index="07" title="Outcome" sourced={cs.outcome}>
            {cs.outcome.value.summary ? (
              <p className="text-pretty leading-relaxed text-fg-muted">
                {cs.outcome.value.summary}
              </p>
            ) : null}
            {cs.outcome.value.metrics.length > 0 ? (
              <dl className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                {cs.outcome.value.metrics.map((m) => (
                  <Surface key={m.label} tone="card" className="flex flex-col gap-1 p-5">
                    <dd className="text-2xl font-semibold tracking-tight text-fg tabular-nums">
                      {m.value}
                    </dd>
                    <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                      {m.label}
                    </dt>
                  </Surface>
                ))}
              </dl>
            ) : null}
          </Chapter>
        ) : null}

        {/* Meta */}
        <Reveal>
          <section className="flex flex-col gap-5 border-t border-border-hair pt-10 sm:flex-row sm:gap-12">
            <div className="flex shrink-0 items-baseline gap-3 sm:w-44 sm:flex-col sm:gap-1.5">
              <span className="font-mono text-xs text-fg-faint">08</span>
              <h2 className="text-sm font-medium uppercase tracking-[0.14em] text-fg-muted">
                Links
              </h2>
            </div>
            <dl className="grid flex-1 gap-x-8 gap-y-4 sm:grid-cols-2">
              {project.liveUrl ? (
                <div className="flex flex-col gap-1">
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                    Deployment
                  </dt>
                  <dd>
                    <a
                      href={project.liveUrl}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
                    >
                      {prettyUrl(project.liveUrl)}
                    </a>
                  </dd>
                </div>
              ) : null}
              {project.repos.map((repo) => (
                <div key={repo.name} className="flex flex-col gap-1">
                  <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                    Repository
                  </dt>
                  <dd>
                    <a
                      href={repo.url}
                      target="_blank"
                      rel="noreferrer noopener"
                      className="text-sm text-fg-muted underline decoration-border-strong underline-offset-4 transition-colors hover:text-fg"
                    >
                      {repo.owner}/{repo.name}
                    </a>
                  </dd>
                </div>
              ))}
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                  Started
                </dt>
                <dd className="text-sm text-fg-muted">{formatMonthYear(project.startedAt)}</dd>
              </div>
              <div className="flex flex-col gap-1">
                <dt className="font-mono text-[0.6875rem] uppercase tracking-[0.12em] text-fg-faint">
                  Last push
                </dt>
                <dd className="text-sm text-fg-muted">
                  {formatMonthYear(project.primaryRepo.pushedAt)}
                </dd>
              </div>
            </dl>
          </section>
        </Reveal>
      </div>
    </article>
  );
}
