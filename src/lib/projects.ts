import manifestJson from '../../data/manifest.json';
import screenshotsJson from '../../data/screenshots.json';
import { caseStudies } from '../../content/case-studies';
import type { Activity, CaseStudy, Project, Screenshot, ShipEvent } from './types';

type DiscoveredProject = Omit<Project, 'caseStudy' | 'screenshot'>;

interface RawManifest {
  generatedAt: string;
  owner: string;
  projects: DiscoveredProject[];
  shipLog: ShipEvent[];
  activity: Activity;
}

const manifest = manifestJson as unknown as RawManifest;
const screenshots = screenshotsJson as unknown as Record<string, Screenshot>;

const EMPTY_CASE_STUDY: CaseStudy = {
  problem: null,
  solution: null,
  technologies: { value: [], via: { kind: 'derived', from: [] } },
  keyFeatures: null,
  challenges: null,
  architecture: null,
  outcome: null,
};

const FALLBACK_SHOT: Screenshot = {
  base: null,
  widths: [],
  aspectRatio: 16 / 10,
  capturedAt: null,
  status: 'never-attempted',
  phash: null,
  blurDataURL: null,
};

/**
 * Discovery output is the skeleton; authored case studies and captured
 * screenshots are layered on top. Neither layer can introduce a project that
 * discovery did not find.
 */
function hydrate(p: DiscoveredProject): Project {
  const authored = caseStudies[p.slug];
  const derivedTech = {
    value: Object.keys(
      p.repos.reduce<Record<string, number>>((acc, r) => ({ ...acc, ...r.languages }), {}),
    ),
    via: {
      kind: 'derived' as const,
      from: p.repos.flatMap((r) =>
        Object.entries(r.languages).map(([name, bytes]) => ({
          type: 'language' as const,
          repo: r.name,
          name,
          bytes,
        })),
      ),
    },
  };

  return {
    ...p,
    screenshot: screenshots[p.slug] ?? FALLBACK_SHOT,
    caseStudy: authored ?? { ...EMPTY_CASE_STUDY, technologies: derivedTech },
  };
}

export const projects: Project[] = manifest.projects.map(hydrate);

export const featuredProjects: Project[] = projects.filter((p) => p.featured);

export const activity: Activity = manifest.activity;

export const shipLog: ShipEvent[] = manifest.shipLog;

export const generatedAt: string = manifest.generatedAt;

/**
 * Case studies cite versions at whatever granularity the project warranted —
 * one says "React", the next says "React 19" — which is correct per project
 * and wrong the moment those lists are merged: the skills grid and the hero
 * ribbon both showed the same technology twice.
 *
 * Aggregates collapse onto the most specific label that is true of at least
 * one project. Per-project badges deliberately do not use this: a card should
 * say what that case study says, not inherit a version from a sibling.
 */
const CANONICAL_TECH: Record<string, string> = {
  'Next.js': 'Next.js 16',
  React: 'React 19',
  'Tailwind CSS': 'Tailwind CSS v4',
};

/* Real entries in a repository's language stats, but not skills: two are file
   names, and PLpgSQL is what GitHub calls Supabase's generated SQL. */
const NOT_A_SKILL = new Set(['Procfile', 'Dockerfile', 'PLpgSQL']);

export function canonicalTech(name: string): string {
  return CANONICAL_TECH[name] ?? name;
}

/** Every technology cited across the site, deduped and canonicalised. */
export function allTechnologies(includeRepoLanguages = false): string[] {
  const seen = new Set<string>();
  for (const p of projects) {
    for (const t of p.caseStudy.technologies.value) seen.add(canonicalTech(t));
    if (!includeRepoLanguages) continue;
    for (const repo of p.repos) {
      for (const lang of Object.keys(repo.languages)) seen.add(canonicalTech(lang));
    }
  }
  for (const skip of NOT_A_SKILL) seen.delete(skip);
  return [...seen];
}

export function getProject(slug: string): Project | undefined {
  return projects.find((p) => p.slug === slug);
}

export function projectSlugs(): string[] {
  return projects.map((p) => p.slug);
}

/** Ship events grouped into calendar months, newest first. */
export function shipLogByMonth(): Array<{ key: string; label: string; events: ShipEvent[] }> {
  const groups = new Map<string, ShipEvent[]>();
  for (const event of shipLog) {
    const key = event.date.slice(0, 7);
    const bucket = groups.get(key);
    if (bucket) bucket.push(event);
    else groups.set(key, [event]);
  }
  return [...groups.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([key, events]) => ({
      key,
      label: new Date(`${key}-01T00:00:00Z`).toLocaleDateString('en-US', {
        month: 'long',
        year: 'numeric',
        timeZone: 'UTC',
      }),
      events: events.sort((a, b) => (a.date < b.date ? 1 : -1)),
    }));
}

export function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    timeZone: 'UTC',
  });
}

export function formatMonthYear(iso: string): string {
  return new Date(iso).toLocaleDateString('en-US', {
    month: 'long',
    year: 'numeric',
    timeZone: 'UTC',
  });
}
