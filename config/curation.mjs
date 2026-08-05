/**
 * Curation policy for automatic project discovery.
 *
 * The default is inclusion: a repo pushed next year shows up with no change
 * here. Exclusion is rule-based and deliberately small, and every override
 * below only renames, groups or annotates something discovery already found —
 * nothing in this file can invent a project.
 *
 * Plain ESM on purpose. `scripts/discover.mjs` is a Node script and cannot
 * import TypeScript, and an earlier attempt to keep this as a `.ts` file ended
 * with the script carrying its own divergent copy while the typed one sat
 * unimported. Accent values must match the `Accent` union in
 * `src/lib/types.ts`; status values must match `ProjectStatus`.
 */

export const OWNER = 'Oyebintan';

/** Overridable so a fork does not have to edit source to point at its own team. */
export const VERCEL_TEAM = process.env.VERCEL_TEAM_ID || 'team_NbtaApRmcBWbfVVg7Eggo6sY';

/** Repos that are real work but not products. */
export const DENY = new Set([
  'skills-getting-started-with-github-copilot',
  'Oyebintan', // profile README
  'Lammy', // this site — a portfolio listing itself reads as a bug, not a feature
  'Final-Year-Project-DL', // the repo's own description is "Project Duplicate"
]);

export const DENY_PATTERNS = [/^skills-/i, /-test$/i, /^test-/i];

export const MIN_PUSHED_AT = '2024-01-01';

/**
 * Per-project overrides. Only renames, groups and annotates — cannot introduce
 * a project.
 *
 * `liveUrlOverride` exists for deployments outside Vercel (Render, Hugging Face
 * Spaces, GitHub Pages), which the Vercel and GitHub deployment APIs cannot
 * report. Capture verifies reachability before any of these is shown as live,
 * so a stale entry degrades to "unreachable" rather than to a broken link.
 */
export const OVERRIDES = {
  'siwes-finder': {
    name: 'SIWES Finder',
    tagline:
      'Industrial placement platform for Nigerian students — web app, Android app, and dashboards for students, employers and schools.',
    featured: true,
    order: 1,
    accent: 'emerald',
    // Distribution repo for the SIWES Finder Android build. Its GitHub
    // description ("Final Year project App") is stale and misattributes it.
    mergeRepos: ['Android-APK'],
  },
  brandforge: {
    name: 'BrandForge',
    tagline:
      'AI brand-identity studio. Five questions in, a complete brand kit out — strategy, voice, visual identity and an exportable PDF.',
    featured: true,
    order: 2,
    accent: 'amber',
  },
  lammydeart: {
    name: 'Lammy de Art',
    tagline: 'Design portfolio and catalogue for brand identity, packaging and campaign work.',
    featured: true,
    order: 3,
    accent: 'rose',
    // A fork by git lineage, but the deployed design portfolio is original work.
    forceInclude: true,
    // The Vercel project `thelammydeart` lists this domain and its latest
    // production deployment is READY. The repo homepage field points at an
    // address that project does not serve, so it is not trusted here.
    liveUrlOverride: 'https://thelammydeart.vercel.app',
  },
  'email-spam-classifier': {
    name: 'Hybrid Spam Classifier',
    tagline:
      'Final year project. Two-stage feature selection feeding a deep neural network — 98.49% accuracy across 16,690 held-out emails.',
    featured: true,
    order: 4,
    accent: 'violet',
    // The demo front end is served from GitHub Pages on the Final-Year-Project
    // repo, which is merged into this project.
    liveUrlOverride: 'https://oyebintan.github.io/Final-Year-Project/',
    mergeRepos: ['Final-Year-Project'],
  },
  'career-recommender': {
    name: 'Career Recommender',
    tagline:
      'Transparent, rule-based career matching across 42 careers with a personalised skill-gap analysis.',
    order: 5,
    accent: 'sky',
    liveUrlOverride: 'https://lammyde-career-recommender.hf.space',
  },
  'teniola-graduation-tribute': {
    name: 'OOU Times',
    tagline:
      'A newspaper-themed graduation tribute — broadsheet typography, a live ticker, and a compile-to-confetti colophon.',
    order: 6,
    accent: 'lime',
    liveUrlOverride: 'https://oyebintan.github.io/teniola-graduation-tribute/',
  },
};
