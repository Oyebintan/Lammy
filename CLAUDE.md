@AGENTS.md

# Working on Lammy

A personal portfolio that indexes itself: projects are discovered from GitHub
and Vercel, screenshotted from their live deployments, and documented from
their own commit history.

**Read `README.md` first for what the system is and how the pipeline fits
together.** This file is the other half — how to change it without re-learning
what earlier sessions learned the hard way. `docs/AUDIT.md` lists known debt
with proposed fixes; check it before assuming something is intentional.

---

## Invariants

Break any of these and something fails quietly rather than loudly.

**The build takes no secrets and no network.** `npm run build` reads committed
JSON from `data/` and nothing else. CI enforces it with a build job that has no
secrets in scope, so a build that starts needing a token fails there. Every page
carries `export const dynamic = 'error'`, which turns an accidental runtime data
dependency into a build error instead of a silent downgrade to server
rendering. The one exception is `/api/chat`, which is `force-dynamic` by nature.

**Content may not be invented.** This is enforced by types, not discipline:
`Sourced<T>`, `Evidence` and `Metric` in `src/lib/types.ts` make `source` a
required field, so an unsourced claim is a compile error. Today only the spam
classifier has a real `outcome` — 98.49% accuracy across 16,690 held-out
samples, from that repo's own `outputs_dl/metrics.json`. Every other project's
`outcome` is `null` and must stay that way until there is a number to point at.
If you find yourself writing a plausible-sounding result, stop.

**Never prefix a secret with `NEXT_PUBLIC_`.** That inlines it into the browser
bundle. The chat provider keys are read server-side only.

**Do not run `npm run discover` in a sandbox.** The GitHub listing endpoints
403 there, and the script falls back to a known-repo list — running it locally
would overwrite CI's fuller result with a smaller one. `--dry-run` is safe and
writes nothing. If `data/manifest.json` needs a change, patch it surgically with
a one-off script and let the nightly job reconcile.

**Curation lives in `config/curation.mjs`, and only there.** Plain ESM because
`scripts/discover.mjs` is a Node script that cannot import TypeScript. An
earlier typed `config/projects.config.ts` was imported by nothing while the
script carried its own divergent copy — and the unused one had gone stale, so
adopting it would have dropped the production URL off four projects. If you
find two copies of anything here again, check which one is actually wired up
before believing either.

---

## Commands

```bash
npm run dev            # next dev
npm run build          # must pass with zero env vars set
npm run typecheck      # tsc --noEmit
npm run lint           # eslint

npm run a11y           # accessibility + layout gate  (needs a running server)
npm run scroll         # scroll-behaviour gate         (needs a running server)
npm run jank           # smoothness probe, manual only (needs a running server)

npm run discover       # rewrites data/manifest.json    — CI only, see above
npm run capture        # rewrites data/screenshots.json + public/shots
npm run refresh        # both
```

The three gates need `npm run start` up on port 3000. In this sandbox they also
need `CHROMIUM_PATH=/opt/pw-browsers/chromium-1194/chrome-linux/chrome`.

`scripts/subset-fonts.py` regenerates the font subsets and needs
`pip install fonttools brotli`. Its outputs are committed, so this runs roughly
once a year, when the `geist` package is upgraded.

---

## The gates, and what each is really for

Every extra check below was added *after* the corresponding bug shipped. None of
them are hypothetical.

**`npm run a11y`** — five checks in one browser session (the name has outlived
its scope; `docs/AUDIT.md` B1 proposes renaming and splitting it):
- WCAG 2.1 AA serious/critical violations via axe.
- **Horizontal overflow.** axe does not test this. A grid item widened the
  document past the viewport and mobile Safari's response was to zoom the whole
  page out, which reads as "the site is broken" rather than "one element is too
  wide".
- **24px minimum target size** (WCAG 2.2). axe does not test this either; a set
  of 20px footer links shipped under a passing gate. Links inside a sentence are
  exempt, as the spec allows.
- **`.glass` resolves a real `backdrop-filter`.** See the first trap below.
- **The Open Graph cards render.** Not just non-blank — also not washed out.
  Satori's `rgba()` failure produces a full-size, high-variance PNG of white
  text on white, so size and flatness checks both miss it; mean brightness is
  what catches it. These cards are near-black by design (measured 10–17); the
  broken render measured 108.

**`npm run scroll`** — refresh returns to the top, back/forward does *not*, and
`#anchor` links still work. Three requirements that pull against each other
through a single browser switch, which is why this is a test and not a comment.

**`npm run jank`** — deliberately **not** in CI. Frame timings depend on what
else the machine is doing, so any threshold would either catch nothing or fail
at random. Run it by hand and compare against another run on the same machine.
Healthy is single-digit frames over 32ms out of 99, p95 near 20ms.

There are no unit tests. `docs/AUDIT.md` C5 proposes six pure functions worth
covering with `node:test`.

---

## Traps already paid for

Each of these shipped as a real bug. The mechanism matters more than the fix.

**Never hand-write a `-webkit-` prefix.** Writing `backdrop-filter` and then
`-webkit-backdrop-filter` after it makes Lightning CSS collapse the pair and
keep *only* the prefixed form — which current Chromium does not support
(`CSS.supports('-webkit-backdrop-filter', 'blur(1px)')` is `false`). Every glass
surface on the site rendered as a plain transparent window in Chrome and Edge:
a see-through nav bar, a mobile menu drawn over the hero headline, a chat panel
with screenshots showing through the text. Let the toolchain prefix.

**Zero opacity is not "painted".** A browser does not count an element at
`opacity: 0` toward the largest contentful paint, so a 0 → 1 entrance animation
records LCP at the *end* of the animation. Above the fold, fade from a non-zero
start (0.45 is what the hero uses) — it keeps the softness and the text is
legible from the first frame. Below the fold there is no LCP to protect, so fade
from zero freely. Related: blur is not the lever for legibility over a
translucent panel — more blur spreads bright pixels wider. Opacity is.

**Grid items default to `min-width: auto`.** That defeats `overflow-x-auto` on a
child: instead of scrolling, the content grows the column. Add `min-w-0`.

**`filter: blur()` on anything large and moving is re-rasterised every frame.**
One declaration on the hero's colour blooms cost 46 dropped frames out of 237
while scrolling. A radial gradient that fades to transparent is already a soft
bloom — the blur was smoothing something that was never sharp.

**Satori (the OG image renderer) is not a browser.** It implements a subset of
flexbox and nothing else: every element with more than one child needs an
explicit `display: flex`. It mishandles `#rrggbbaa` (renders as an opaque block
clipped to the element box) *and* `rgba()` gradient stops (comes out near-white),
and clips radial gradients to the element box. Build gradients from opaque
colours pre-blended toward black — see `onBlack()` in `src/lib/og.tsx`. It also
reads neither woff2 nor variable fonts, hence the static TTF subsets in
`src/fonts/og/`.

**A stretched link's `::after` resolves against the nearest *positioned*
ancestor.** A `relative` inner div silently shrank a project card's click target
to just the title text, leaving the screenshot inert.

**`history.scrollRestoration` is one switch for two opposite requirements.** Set
it from the navigation type (`manual` for reload/navigate, `auto` for
`back_forward`) and never call `scrollTo` on load — that yanks a visitor who
started scrolling while the page was still loading, which is worse than the bug
being fixed.

---

## Where things live

```
src/app/            routes; every page is `dynamic = 'error'`
  opengraph-image.tsx             site social card  ─┐ Satori, not a browser:
  work/[slug]/opengraph-image.tsx per-project card  ─┘ no site CSS applies
  globals.css       design tokens + every animation
src/components/     ui/ primitives, sections/, project/, chat/, motion/
src/lib/
  projects.ts       hydrates the manifest into typed Projects
  types.ts          the provenance contracts — read before touching content
  og.tsx            Satori-only; re-declares the palette as hex (AUDIT B3)
  chat/             provider abstraction, rate limit, local fallback
content/
  case-studies.ts   hand-authored prose that must compile
config/
  site.config.ts    name, URLs, nav
  curation.mjs      discovery policy — plain ESM so discover.mjs can import it
data/               generated by scripts/, committed, read at build
public/shots/       generated screenshots, committed
scripts/            discovery, capture, the three gates, font subsetting
docs/AUDIT.md       known debt with proposed fixes
```

Two things that surprise people: `data/` and `public/shots/` are **generated but
committed** (that is what makes the build offline), and `content/case-studies.ts`
is prose in a `.ts` file **on purpose** — the types are what stop unsourced
claims.

---

## Deploying

The default branch is `claude/lammy-portfolio-platform-fmef90` and Vercel builds
from it. A nightly workflow (`.github/workflows/refresh.yml`, 04:00 UTC) runs
discovery and capture, commits any changed data, and that commit triggers the
redeploy. It fires often enough that **you should expect to rebase before
pushing** — fetch first.

A failed refresh leaves the last good data serving rather than breaking the
site.

---

## Environment

Everything is optional. Nothing is needed to build or run the site.

| Variable | Used by | Without it |
|---|---|---|
| `GITHUB_TOKEN` / `GH_TOKEN` | `discover` | Unauthenticated rate limits; listing endpoints may 403 |
| `VERCEL_TOKEN` | `discover` | Deployment URLs come from the repo homepage field and the GitHub Deployments API only |
| `GEMINI_API_KEY` / `GOOGLE_API_KEY`, `GEMINI_MODEL` | `/api/chat` | Falls through to the next provider |
| `ANTHROPIC_API_KEY`, `ANTHROPIC_MODEL` | `/api/chat` | Falls through to the local responder |
| `CHROMIUM_PATH` | gates, `capture` | Playwright's own download is used |
| `BASE_URL` | gates | Defaults to `http://127.0.0.1:3000` |
| `CPU` | `jank` | Defaults to 4× throttle |

With no chat keys set the assistant answers from a zero-cost local responder
built from the manifest — degraded, not broken. That is the default and it costs
nothing to run.
