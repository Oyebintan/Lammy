/**
 * Core data contracts for the Lammy product showcase.
 *
 * Integrity rule enforced throughout: every narrative claim carries provenance.
 * A field that cannot be traced to real evidence is `null` and its section does
 * not render. There is no placeholder tier and no inferred-metric tier.
 */

/** Where a piece of narrative or a number actually came from. */
export type Evidence =
  | { type: 'readme'; repo: string; url: string; heading?: string }
  | { type: 'commit'; repo: string; sha: string; message: string; date: string; url: string }
  | { type: 'release'; repo: string; tag: string; date: string; url: string }
  | { type: 'file'; repo: string; path: string; url: string; excerpt?: string }
  | { type: 'language'; repo: string; name: string; bytes: number }
  | { type: 'deployment'; url: string; date: string }
  | { type: 'repo-metadata'; repo: string; field: string; value: string; url: string };

export type Provenance =
  | { kind: 'authored' }
  | { kind: 'derived'; from: Evidence[] };

export interface Sourced<T> {
  value: T;
  via: Provenance;
}

/**
 * A quantitative claim. `source` is required and non-optional by construction —
 * a metric with nowhere to point cannot be represented in this type at all.
 */
export interface Metric {
  label: string;
  value: string;
  source: Evidence;
}

export interface Challenge {
  title: string;
  detail: string;
  /** At least one entry; validated at build time. */
  evidence: Evidence[];
}

export interface Outcome {
  summary: string | null;
  metrics: Metric[];
}

export interface CaseStudy {
  problem: Sourced<string> | null;
  solution: Sourced<string> | null;
  technologies: Sourced<string[]>;
  keyFeatures: Sourced<string[]> | null;
  challenges: Sourced<Challenge[]> | null;
  architecture: Sourced<string> | null;
  /** `null` unless the project has real, sourced results. */
  outcome: Sourced<Outcome> | null;
}

export type CaptureStatus = 'ok' | 'unreachable' | 'protected' | 'error' | 'never-attempted';

export interface Screenshot {
  /** Public path, e.g. `/shots/siwes-finder/desktop-1440.webp`. Null until captured. */
  base: string | null;
  widths: number[];
  aspectRatio: number;
  capturedAt: string | null;
  status: CaptureStatus;
  /** Perceptual hash used to suppress no-op recaptures. */
  phash: string | null;
  /** Tiny inline placeholder shown while the real image loads. */
  blurDataURL: string | null;
}

export type ProjectStatus = 'live' | 'shipped' | 'research' | 'archived';

export interface RepoRef {
  owner: string;
  name: string;
  url: string;
  defaultBranch: string;
  createdAt: string;
  pushedAt: string;
  languages: Record<string, number>;
  stars: number;
  topics: string[];
  license: string | null;
}

export interface Project {
  slug: string;
  name: string;
  tagline: string;
  /** One or more repos. Some products span a backend repo and a demo front end. */
  repos: RepoRef[];
  primaryRepo: RepoRef;
  liveUrl: string | null;
  /** How we know `liveUrl` is the real production address. */
  liveUrlEvidence: Evidence | null;
  status: ProjectStatus;
  featured: boolean;
  order: number;
  accent: Accent;
  /** Earliest credible ship date across repo creation and first deployment. */
  startedAt: string;
  shippedAt: string | null;
  screenshot: Screenshot;
  caseStudy: CaseStudy;
}

export type Accent = 'emerald' | 'violet' | 'amber' | 'sky' | 'rose' | 'lime';

export type ShipKind = 'repo_created' | 'first_deploy' | 'merge' | 'release' | 'milestone';

export interface ShipEvent {
  id: string;
  slug: string;
  projectName: string;
  accent: Accent;
  kind: ShipKind;
  title: string;
  body: string | null;
  date: string;
  commit?: { sha: string; url: string };
  release?: { tag: string; url: string };
  prNumber?: number;
  url?: string;
}

export interface LanguageStat {
  name: string;
  bytes: number;
  share: number;
}

export interface Activity {
  generatedAt: string;
  totals: {
    repositories: number;
    projectsShipped: number;
    deployments: number;
    technologies: number;
    commitsTracked: number;
  };
  languages: LanguageStat[];
  recentCommits: Array<{
    repo: string;
    sha: string;
    message: string;
    date: string;
    url: string;
  }>;
  /** ISO date -> commit count, for the contribution strip. */
  contributions: Record<string, number>;
}

export interface Manifest {
  generatedAt: string;
  owner: string;
  projects: Project[];
  shipLog: ShipEvent[];
  activity: Activity;
}
