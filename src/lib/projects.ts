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
