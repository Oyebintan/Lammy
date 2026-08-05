import { cva, type VariantProps } from 'class-variance-authority';
import Link from 'next/link';
import type { ComponentProps, ReactNode } from 'react';
import { cn } from '@/lib/utils';
import type { Evidence } from '@/lib/types';

/* -------------------------------------------------------------------------- */
/* Button                                                                      */
/* -------------------------------------------------------------------------- */

export const buttonVariants = cva(
  'inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-full font-medium transition-all duration-200 disabled:pointer-events-none disabled:opacity-50 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        primary:
          'bg-fg text-bg-0 hover:bg-fg/90 hover:-translate-y-px active:translate-y-0 shadow-[0_1px_0_0_oklch(1_0_0/0.2)_inset]',
        secondary:
          'bg-bg-2 text-fg hairline hover:bg-bg-3 hover:border-border-strong hover:-translate-y-px active:translate-y-0',
        ghost: 'text-fg-muted hover:text-fg hover:bg-bg-2',
        accent:
          'text-[var(--accent)] bg-[color-mix(in_oklch,var(--accent)_12%,transparent)] hover:bg-[color-mix(in_oklch,var(--accent)_18%,transparent)] border border-[color-mix(in_oklch,var(--accent)_28%,transparent)]',
      },
      size: {
        sm: 'h-8 px-3.5 text-[0.8125rem] [&_svg]:size-3.5',
        md: 'h-10 px-5 text-sm [&_svg]:size-4',
        lg: 'h-12 px-7 text-[0.9375rem] [&_svg]:size-[18px]',
      },
    },
    defaultVariants: { variant: 'primary', size: 'md' },
  },
);

type ButtonProps = ComponentProps<'button'> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, ...props }: ButtonProps) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

type ButtonLinkProps = ComponentProps<typeof Link> &
  VariantProps<typeof buttonVariants> & { external?: boolean };

export function ButtonLink({ className, variant, size, external, ...props }: ButtonLinkProps) {
  return (
    <Link
      className={cn(buttonVariants({ variant, size }), className)}
      {...(external ? { target: '_blank', rel: 'noreferrer noopener' } : {})}
      {...props}
    />
  );
}

/* -------------------------------------------------------------------------- */
/* Surface — the single elevation primitive every panel is built from          */
/* -------------------------------------------------------------------------- */

const surfaceVariants = cva('relative overflow-hidden', {
  variants: {
    tone: {
      card: 'bg-bg-2 hairline',
      raised: 'bg-bg-3 hairline',
      glass: 'glass',
      outline: 'bg-transparent hairline',
    },
    radius: {
      md: 'rounded-[var(--radius-card)]',
      lg: 'rounded-[var(--radius-panel)]',
      xl: 'rounded-[1.75rem]',
    },
  },
  defaultVariants: { tone: 'card', radius: 'lg' },
});

type SurfaceProps = ComponentProps<'div'> & VariantProps<typeof surfaceVariants>;

export function Surface({ className, tone, radius, ...props }: SurfaceProps) {
  return <div className={cn(surfaceVariants({ tone, radius }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Badge                                                                       */
/* -------------------------------------------------------------------------- */

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-full border font-medium transition-colors',
  {
    variants: {
      variant: {
        default: 'border-border-hair bg-bg-2 text-fg-muted',
        accent:
          'border-[color-mix(in_oklch,var(--accent)_30%,transparent)] bg-[color-mix(in_oklch,var(--accent)_10%,transparent)] text-[var(--accent)]',
        outline: 'border-border-hair bg-transparent text-fg-subtle',
      },
      size: {
        sm: 'px-2 py-0.5 text-[0.6875rem]',
        md: 'px-2.5 py-1 text-xs',
      },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

type BadgeProps = ComponentProps<'span'> & VariantProps<typeof badgeVariants>;

export function Badge({ className, variant, size, ...props }: BadgeProps) {
  return <span className={cn(badgeVariants({ variant, size }), className)} {...props} />;
}

/* -------------------------------------------------------------------------- */
/* Status dot                                                                  */
/* -------------------------------------------------------------------------- */

export function StatusDot({ live }: { live: boolean }) {
  if (!live) return <span className="size-1.5 rounded-full bg-fg-faint" aria-hidden />;
  return (
    <span className="relative flex size-1.5" aria-hidden>
      <span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-60" />
      <span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
    </span>
  );
}

/* -------------------------------------------------------------------------- */
/* Section scaffolding                                                         */
/* -------------------------------------------------------------------------- */

export function Section({
  id,
  className,
  children,
}: {
  id?: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className={cn('relative scroll-mt-24 px-5 py-24 sm:px-8 md:py-32', className)}>
      <div className="mx-auto w-full max-w-6xl">{children}</div>
    </section>
  );
}

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = 'left',
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: 'left' | 'center';
  className?: string;
}) {
  return (
    <div
      className={cn(
        'flex flex-col gap-4',
        align === 'center' && 'items-center text-center',
        className,
      )}
    >
      {eyebrow ? (
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">{eyebrow}</span>
      ) : null}
      <h2 className="max-w-3xl text-balance text-h2 font-semibold text-fg">{title}</h2>
      {description ? (
        <p className="max-w-2xl text-pretty text-lead text-fg-muted">{description}</p>
      ) : null}
    </div>
  );
}

/* -------------------------------------------------------------------------- */
/* Evidence chip — the provenance affordance used across case studies          */
/* -------------------------------------------------------------------------- */

const evidenceLabel = (e: Evidence): string => {
  switch (e.type) {
    case 'commit':
      return `${e.repo}@${e.sha.slice(0, 7)}`;
    case 'file':
      return e.path;
    case 'readme':
      return e.heading ? `README — ${e.heading}` : `${e.repo}/README`;
    case 'release':
      return e.tag;
    case 'language':
      return e.name;
    case 'deployment':
      return prettyHost(e.url);
    case 'repo-metadata':
      return `${e.repo} · ${e.field}`;
  }
};

function prettyHost(url: string) {
  try {
    return new URL(url).host;
  } catch {
    return url;
  }
}

export function EvidenceChip({ evidence }: { evidence: Evidence }) {
  const href = 'url' in evidence ? evidence.url : undefined;
  const label = evidenceLabel(evidence);
  const body = (
    <>
      <span className="size-1 rounded-full bg-fg-faint transition-colors group-hover:bg-[var(--accent)]" />
      <span className="truncate">{label}</span>
    </>
  );
  const className =
    'group inline-flex max-w-full items-center gap-1.5 rounded-md border border-border-hair bg-bg-2/60 px-2 py-1 font-mono text-[0.6875rem] text-fg-subtle transition-colors hover:border-border-strong hover:text-fg-muted';

  if (!href) return <span className={className}>{body}</span>;
  return (
    <a href={href} target="_blank" rel="noreferrer noopener" className={className} title={label}>
      {body}
    </a>
  );
}

/* -------------------------------------------------------------------------- */
/* States                                                                      */
/* -------------------------------------------------------------------------- */

export function EmptyState({
  icon,
  title,
  description,
  action,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <Surface tone="outline" className="flex flex-col items-center gap-3 px-6 py-16 text-center">
      {icon ? <div className="text-fg-faint">{icon}</div> : null}
      <h3 className="text-h3 font-medium text-fg">{title}</h3>
      {description ? <p className="max-w-md text-sm text-fg-subtle">{description}</p> : null}
      {action}
    </Surface>
  );
}
