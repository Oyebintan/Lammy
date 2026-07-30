# Lammy

A living product showcase. Projects are discovered from GitHub and Vercel,
screenshotted from their live deployments, and documented from their own commit
history — no manual uploads, no hand-maintained project list.

**Live:** https://lammy.vercel.app

---

## How it works

The site is fully static. Nothing is fetched at request time, and nothing is
fetched at build time either — the build reads committed JSON. A scheduled job
refreshes that JSON and commits it, which triggers a redeploy.

```
 GitHub API ─┐
             ├─→ scripts/discover.mjs ─→ data/manifest.json ────┐
 Vercel API ─┘                                                  ├─→ next build ─→ static site
                scripts/capture.mjs ──→ data/screenshots.json ──┘
                       │                 public/shots/*.webp
                  Playwright + sharp
```

The property worth protecting: **`npm run build` succeeds with no secrets and
no network.** CI enforces it with a build job that has no secrets in scope. A
failed refresh leaves the last good data serving rather than breaking the site.

### Discovery — `scripts/discover.mjs`

Lists the account's repositories, applies curation rules, and resolves each
project's production URL from the repo homepage field, the GitHub Deployments
API, or the Vercel API when `VERCEL_TOKEN` is present.

Inclusion is the default, so a repository pushed next year appears with no code
change. Exclusion is rule-based and small: forks, archived repos, templates, the
profile README, and an explicit deny list. Duplicate Vercel projects pointing at
one repository collapse automatically — the most recently updated wins.

Per-project overrides can rename, group, feature and annotate, but cannot
introduce a project that discovery did not find.

### Screenshots — `scripts/capture.mjs`

Visits each live deployment, captures at 1440×900 (DPR 2), and emits WebP at
1440 and 720 plus an inline blur placeholder.

The hard part is not taking the picture, it is **not committing a new one every
night**. An animated page yields different pixels each run, which would mean a
commit per night and unbounded repository growth. Three defences:

1. `reducedMotion: 'reduce'` and `colorScheme: 'dark'` via emulated media.
2. An injected stylesheet that kills all animations and transitions.
3. A perceptual hash compared against the stored one — a capture within a
   Hamming distance of 4 is discarded and the existing image kept.

A capture is refreshed when it is missing, older than 14 days, or when the
project's repository has been pushed since the last capture.

Unreachable or access-protected deployments are recorded as such and render a
deterministic fallback card. The UI never shows a broken image, and never shows
something that could be mistaken for a screenshot of a site that isn't there.

### Case studies — `content/case-studies.ts`

Every narrative field carries provenance. `Sourced<T>` marks content as
`authored` or `derived`, and derived content links the commits, files and
release tags it came from — those become the evidence chips on each case-study
page.

Fields with no evidence are `null` and their section does not render. There is
no placeholder tier. `Metric` requires a non-optional `source`, so a number with
nowhere to point cannot be represented in the type system at all.

The visible consequence is deliberate asymmetry: the spam classifier reports
accuracy, precision, recall, F1 and ROC AUC because `outputs_dl/metrics.json` is
committed in that repository. The other projects have no Outcome section,
because inventing one would be the only way to have it.

---

## Local development

```bash
npm install
npm run dev          # http://localhost:3000
```

```bash
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run build        # production build
npm run a11y         # axe-core, all routes × 2 breakpoints, fails on serious/critical
```

Refreshing data locally:

```bash
npm run discover                       # rewrite data/manifest.json
node scripts/discover.mjs --dry-run    # preview, write nothing
npm run capture                        # recapture stale screenshots
node scripts/capture.mjs --force       # recapture everything
node scripts/capture.mjs --slug=brandforge --dry-run
```

### Environment

| Variable | Required | Purpose |
| --- | --- | --- |
| `GITHUB_TOKEN` | For discovery | Public repo reads. In Actions the built-in token is enough. |
| `VERCEL_TOKEN` | Optional | Improves production-alias fidelity. Discovery falls back to the repo homepage and the GitHub Deployments API without it. |

Neither is needed to build or run the site.

---

## Automation

- **`.github/workflows/refresh.yml`** — nightly at 04:00 UTC, plus
  `workflow_dispatch` and a `project-shipped` `repository_dispatch` so other
  repositories can trigger a refresh when they deploy. Rediscovers, recaptures,
  verifies the site still builds, and commits only if something changed.
- **`.github/workflows/ci.yml`** — typecheck, lint, a secretless build, and the
  accessibility gate on every push.

---

## Stack

Next.js 16 (App Router, Turbopack) · React 19 · TypeScript · Tailwind CSS v4 ·
Framer Motion · Playwright · sharp

### Notes on the implementation

**Scroll reveals are CSS, not JavaScript.** A motion library that
server-renders its `initial` state emits `opacity: 0` into the HTML, which means
the page is invisible until hydration — and permanently invisible if scripting
fails. Here the hidden state is scoped to `html.js`, set by an inline script
before first paint, so without JavaScript everything renders normally. Reduced
motion is handled in the same stylesheet.

**Screenshots bypass `next/image`.** They are already encoded at exact widths by
the capture pipeline; re-optimising them would burn quota to produce a larger
file. Everything else uses `next/image`.

**Text colours are measured, not eyeballed.** Every foreground token clears
WCAG AA against the pure-black background; the faintest label sits at 4.9:1.

**Every route asserts `dynamic = 'error'`.** If a change introduces a runtime
data dependency, the build fails loudly instead of silently downgrading to
server rendering.
