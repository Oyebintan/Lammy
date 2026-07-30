import type { Accent, ProjectStatus } from '@/lib/types';

/**
 * Curation policy for automatic project discovery.
 *
 * The default is inclusion: a repo pushed next year shows up with no code
 * change here. Exclusion is rule-based and deliberately small, and every
 * override below only renames, groups, or annotates something the discovery
 * pass already found — nothing in this file can invent a project.
 */
export interface ProjectOverride {
  name?: string;
  tagline?: string;
  featured?: boolean;
  order?: number;
  accent?: Accent;
  status?: ProjectStatus;
  /**
   * Production URL for deployments that live outside Vercel (Render, Hugging
   * Face Spaces, GitHub Pages), which the Vercel/GitHub deployment APIs cannot
   * report. Capture verifies reachability before this is ever shown as live.
   */
  liveUrlOverride?: string;
  /** Extra repos folded into this project — a backend plus its demo front end. */
  mergeRepos?: string[];
  /** Included even though an automatic rule would otherwise drop it. */
  forceInclude?: boolean;
}

export const curation = {
  owner: 'Oyebintan',
  vercelTeamId: 'team_NbtaApRmcBWbfVVg7Eggo6sY',

  /** Repos that are real work but not products. */
  deny: ['skills-getting-started-with-github-copilot', 'Oyebintan'],
  denyPatterns: [/^skills-/i, /-test$/i, /^test-/i],

  rules: {
    excludeForks: true,
    excludeArchived: true,
    excludeTemplates: true,
    /** Repos with no description, no README and no deployment are scaffolding. */
    requireDescriptionOrReadme: true,
    minPushedAt: '2024-01-01',
  },

  overrides: {
    'siwes-finder': {
      name: 'SIWES Finder',
      tagline:
        'Industrial placement platform for Nigerian students — web app, Android app, and dashboards for students, employers and schools.',
      featured: true,
      order: 1,
      accent: 'emerald',
    },
    brandforge: {
      name: 'BrandForge',
      tagline:
        'AI brand-identity studio. Five questions in, a complete brand kit out — strategy, voice, visual identity and a exportable PDF.',
      featured: true,
      order: 2,
      accent: 'amber',
    },
    lammydeart: {
      name: 'Lammy de Art',
      tagline:
        'Design portfolio and catalogue for brand identity, packaging and campaign work.',
      featured: true,
      order: 3,
      accent: 'rose',
      // A fork by git lineage, but the deployed design portfolio is original work.
      forceInclude: true,
    },
    'email-spam-classifier': {
      name: 'Hybrid Spam Classifier',
      tagline:
        'Two-stage feature selection feeding a deep neural network — 98.49% accuracy across 16,690 held-out emails.',
      featured: true,
      order: 4,
      accent: 'violet',
      status: 'research',
      mergeRepos: ['Final-Year-Project'],
    },
    'career-recommender': {
      name: 'Career Recommender',
      tagline:
        'Transparent, rule-based career matching across 42 careers with a personalised skill-gap analysis.',
      order: 5,
      accent: 'sky',
    },
    'teniola-graduation-tribute': {
      name: 'OOU Times',
      tagline:
        'A newspaper-themed graduation tribute — broadsheet typography, a live ticker, and a compile-to-confetti colophon.',
      order: 6,
      accent: 'lime',
    },
  } satisfies Record<string, ProjectOverride>,
} as const;

export type Curation = typeof curation;
