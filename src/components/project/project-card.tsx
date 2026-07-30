import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { GithubMark } from '@/components/ui/icons';
import { Badge, StatusDot } from '@/components/ui/primitives';
import { ProjectShot } from './project-shot';
import { SpotlightCard } from '@/components/motion/spotlight';
import { formatMonthYear, } from '@/lib/projects';
import { cn, prettyUrl } from '@/lib/utils';
import type { Project } from '@/lib/types';

const STATUS_LABEL: Record<Project['status'], string> = {
  live: 'Live',
  shipped: 'Shipped',
  research: 'Research',
  archived: 'Archived',
};

export function ProjectCard({
  project,
  featured = false,
  priority = false,
}: {
  project: Project;
  featured?: boolean;
  priority?: boolean;
}) {
  const tech = project.caseStudy.technologies.value.slice(0, 4);

  return (
    <SpotlightCard
      className={cn(
        'group relative flex flex-col overflow-hidden rounded-[var(--radius-panel)] border border-border-hair bg-bg-2',
        'transition-all duration-300 hover:-translate-y-1 hover:border-border-strong',
        'hover:shadow-[0_24px_60px_-32px_color-mix(in_oklch,var(--accent)_55%,transparent)]',
        featured && 'md:flex-row',
      )}
    >
    <div data-accent={project.accent} className="contents">
      {/* Shot */}
      <div
        className={cn(
          'relative z-[2] overflow-hidden bg-bg-1',
          featured ? 'md:w-[58%] aspect-[16/10] md:aspect-auto' : 'aspect-[16/10]',
        )}
      >
        <ProjectShot
          project={project}
          priority={priority}
          sizes={featured ? '(min-width: 768px) 58vw, 100vw' : '(min-width: 768px) 45vw, 100vw'}
          className="size-full transition-transform duration-500 group-hover:scale-[1.03]"
        />
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-bg-0/70 via-transparent to-transparent" />
      </div>

      {/* Body */}
      {/* Not `relative`: the title's stretched link positions against the nearest
          positioned ancestor, so this being relative confined the click target to
          the text and left the screenshot unclickable. z-index still applies —
          this is a flex item. */}
      <div className={cn('z-[2] flex flex-1 flex-col gap-4 p-6', featured && 'md:justify-center md:p-9')}>
        <div className="flex items-center gap-2.5">
          <StatusDot live={project.status === 'live'} />
          <span className="font-mono text-[0.6875rem] uppercase tracking-[0.16em] text-fg-faint">
            {STATUS_LABEL[project.status]}
          </span>
          <span className="text-fg-faint/50">·</span>
          <span className="font-mono text-[0.6875rem] text-fg-faint">
            {formatMonthYear(project.startedAt)}
          </span>
        </div>

        <div className="flex flex-col gap-2.5">
          <h3
            className={cn(
              'font-semibold tracking-tight text-fg',
              featured ? 'text-h2' : 'text-h3',
            )}
          >
            <Link
              href={`/work/${project.slug}`}
              className="after:absolute after:inset-0 after:z-[3] after:content-['']"
            >
              {project.name}
            </Link>
          </h3>
          <p
            className={cn(
              'text-pretty text-fg-muted',
              featured ? 'text-lead max-w-xl' : 'text-sm leading-relaxed',
            )}
          >
            {project.tagline}
          </p>
        </div>

        {tech.length > 0 ? (
          <div className="flex flex-wrap gap-1.5">
            {tech.map((t) => (
              <Badge key={t} size="sm" variant="outline">
                {t}
              </Badge>
            ))}
          </div>
        ) : null}

        <div className="mt-auto flex flex-wrap items-center gap-x-4 gap-y-2 pt-2 text-xs">
          <span className="inline-flex items-center gap-1.5 font-medium text-fg transition-colors group-hover:text-[var(--accent)]">
            Read case study
            <ArrowUpRight className="size-3.5 transition-transform duration-200 group-hover:translate-x-0.5 group-hover:-translate-y-0.5" />
          </span>
          {project.liveUrl ? (
            <span className="relative z-10 inline-flex items-center gap-1.5 font-mono text-fg-faint">
              {prettyUrl(project.liveUrl)}
            </span>
          ) : (
            <span className="relative z-10 inline-flex items-center gap-1.5 font-mono text-fg-faint">
              <GithubMark className="size-3.5" />
              {project.primaryRepo.name}
            </span>
          )}
        </div>
      </div>
    </div>
    </SpotlightCard>
  );
}
