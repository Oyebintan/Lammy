# Code audit — 2026-08-01

Findings only. **Nothing here has been fixed.** Each item says what is wrong,
the evidence, and the proposed change, so the work can be picked up piecemeal.

Ordered by consequence, not by effort.

---

## A. Dead code

### A1 — `config/projects.config.ts` is imported by nothing (101 lines)

The most dangerous item in the repo, because it does not look dead. It is a
fully authored, carefully documented curation policy — owner, Vercel team ID,
deny list, deny patterns, inclusion rules, per-project overrides — and **no
file imports it**. Verified: zero matches for `projects.config` across `src`,
`scripts` and `content`.

Meanwhile `scripts/discover.mjs` carries its own copy of the same data:

| `config/projects.config.ts` | `scripts/discover.mjs` |
|---|---|
| `curation.owner` | `OWNER` (line 22) |
| `curation.vercelTeamId` | `VERCEL_TEAM` (line 25) |
| `curation.deny` | `DENY` (line 27) |
| `curation.denyPatterns` | `DENY_PATTERNS` (line 33) |
| `curation.rules.minPushedAt` | `MIN_PUSHED_AT` (line 34) |
| `curation.overrides` | `OVERRIDES` (line 37) |

The two have already drifted — the script's `DENY` has four entries, the config
has two. Editing the config to add a project override changes nothing and gives
no error, which is the worst possible failure mode.

**Root cause:** `discover.mjs` is plain ESM and cannot import a `.ts` file.

**Fix:** move the curation data to `config/curation.mjs` (plain JS, no types)
and import it from both sides — `discover.mjs` directly, and a thin
`config/curation.ts` that re-exports it with types for any future app-side use.
Delete `projects.config.ts`. One source of truth, still typed where types are
useful.

**Risk:** low. Verify by running `npm run discover -- --dry-run` and diffing the
manifest against the current one — it should be byte-identical.

### A2 — `Skeleton` and the `.shimmer` animation

`src/components/ui/primitives.tsx:230` exports a `Skeleton` component that
nothing renders. It is the only consumer of `.shimmer`
(`globals.css:398`) and `@keyframes shimmer` (`globals.css:410`).

Nothing on the site has a loading state — every page is prerendered — so this
was speculative from the start.

**Fix:** delete all three. ~20 lines.

### A3 — `compactNumber` in `src/lib/utils.ts:13`

Never called. The counters render raw integers.

**Fix:** delete.

### A4 — `Manifest` interface in `src/lib/types.ts:158`

Never used. `src/lib/projects.ts:8` declares a **local `RawManifest`** with
almost the same shape instead — the difference being that `RawManifest.projects`
is `DiscoveredProject[]` (correct: the manifest has no case study or screenshot)
while `Manifest.projects` is `Project[]` (wrong: it claims fields the JSON does
not contain).

So the exported type is both dead *and* incorrect, and a future edit that
"helpfully" applies it would break the hydration step.

**Fix:** delete `Manifest`, move `RawManifest` into `types.ts` under that name,
and import it in `projects.ts`.

### A5 — `Site` type in `config/site.config.ts:25`

`export type Site = typeof site` — never referenced.

**Fix:** delete, or keep only if something starts consuming it.

### A6 — `canonicalTech` exported from `src/lib/projects.ts`

Only `allTechnologies` is used externally; `canonicalTech` is called internally.

**Fix:** drop the `export` keyword.

### A7 — `axe-core` as a direct devDependency

`@axe-core/playwright` depends on it. No script imports `axe-core` directly.

**Fix:** remove from `package.json`; confirm `npm run a11y` still passes.

---

## B. Structural

### B1 — `scripts/a11y.mjs` now does four unrelated jobs (163 lines)

It checks WCAG violations, horizontal overflow, target size, **and** whether
`.glass` resolves a real `backdrop-filter`. The name promises one of those.
The glass check in particular is a rendering-regression test that happens to
live in the accessibility script because that is where a browser was already
running.

**Fix:** rename to `scripts/audit-ui.mjs` and split the body into named checks
(`checkAxe`, `checkOverflow`, `checkTargetSize`, `checkGlass`), each returning
failures rather than mutating a shared counter. Keep one browser launch. Update
`package.json` and `.github/workflows/ci.yml`.

### B2 — Four Playwright scripts repeat the same setup

`a11y.mjs`, `jank.mjs`, `scroll.mjs` and `capture.mjs` each re-implement:
resolving `CHROMIUM_PATH`, resolving `BASE_URL`, launching, creating a dark
1440/390 context, and (in two of them) the identical Slow-4G + 4×CPU throttle
constants.

**Fix:** `scripts/lib/browser.mjs` exporting `launch()`, `context({ device })`
and `throttle(cdp, { network, cpu })`. Each script keeps its own assertions;
only the boilerplate moves. Roughly 60 duplicated lines collapse to one module.

### B3 — `src/lib/og.tsx` re-declares the design tokens as hex

Lines 21–32 hard-code the six accents plus three foreground colours because
Satori cannot parse `oklch()`. The authoritative values live in
`globals.css:475-492`. Nothing ties them together, so changing an accent in the
stylesheet silently leaves the social cards on the old colour.

**Fix:** generate them. Add the oklch→sRGB conversion (already written once, in
throwaway form, during the favicon work) to `scripts/` and emit
`src/lib/tokens.generated.ts` from the CSS, or invert it — define the palette
once in TS and emit the CSS custom properties. Either way, one source. Until
then, at minimum add a comment in `globals.css` pointing at `og.tsx` so the
next person changing an accent knows there are two places.

### B4 — `src/components/ui/primitives.tsx` is a grab bag (253 lines, 11 exports)

`Button`, `ButtonLink`, `Surface`, `Badge`, `StatusDot`, `Section`,
`SectionHeading`, `EvidenceChip`, `EmptyState`, `Skeleton`, `buttonVariants` —
form controls, layout scaffolding and a domain-specific component
(`EvidenceChip` knows about the `Evidence` union) in one file.

**Fix:** split into `ui/button.tsx`, `ui/surface.tsx` (Surface, Badge,
StatusDot), `ui/section.tsx` (Section, SectionHeading, EmptyState), and move
`EvidenceChip` to `components/project/` where the rest of the case-study
vocabulary lives. Mechanical; the import churn is the only cost.

### B5 — `content/case-studies.ts` is 450 lines of prose in a TypeScript file

It compiles, which is the point — the `Sourced<T>` types make an unsourced
claim a type error. But editing prose means editing code, and the file is now
the second largest in the repo.

**Fix (optional, judgement call):** leave it. The type safety is the feature and
MDX would lose it. Worth revisiting only if a non-technical editor ever needs
access. Recorded so the size is a known trade rather than an oversight.

### B6 — `next.config.ts` is an empty scaffold

Still `/* config options here */` from `create-next-app`.

**Fix:** either delete the placeholder comment and document why it is empty
(everything is default, deliberately), or remove the file. Prefer keeping it
with a one-line comment — an empty config is a meaningful statement here.

---

## C. Correctness and robustness

### C1 — The chat rate limiter cannot work on serverless

`src/lib/chat/guard.ts:29` holds buckets in a module-scoped `Map`. Vercel
functions scale horizontally and recycle, so each instance has its own map: the
effective limit is `12 × instances`, and it resets whenever an instance is cold.

Not a live problem — the default provider is the zero-cost local responder, so
there is no bill to run up — but it becomes one the moment `GEMINI_API_KEY` is
set, which is a documented next step.

**Fix:** state the limitation in the file (it currently implies a real limit),
and gate the upgrade path on it: if a paid provider is configured, the limiter
must be backed by something shared (Vercel KV / Upstash Redis) or the route
should cap total spend another way. A comment is enough for now; the code change
belongs with the provider change.

### C2 — Hardcoded account identity in `scripts/discover.mjs`

`OWNER = 'Oyebintan'` (line 22) and `VERCEL_TEAM = 'team_Nbta…'` (line 25) are
inline. The Vercel team ID is not a secret, but it is deployment-specific
configuration sitting in a script.

**Fix:** folded into A1 — both belong in the shared curation module, with the
team ID overridable by `VERCEL_TEAM_ID` in the environment.

### C3 — No automated check that the OG images still render

`opengraph-image.tsx` renders through Satori, which fails in ways TypeScript
cannot catch — the three gradient attempts during implementation each compiled
and produced a broken image. A future edit to `og.tsx` can silently regress the
cards and nothing will fail.

**Fix:** add a check to the UI audit script: fetch `/opengraph-image` and one
project card, assert HTTP 200, `image/png`, non-trivial byte length, and that
the decoded image is not a single flat colour (the same set-bit heuristic used
for flat screenshots would do). Cheap, and it catches exactly the failure that
already happened three times.

### C4 — `error.tsx` logs to console in production

`src/app/error.tsx:14` does `console.error(error)` on every render of the error
boundary. Harmless, but it is the only unstructured logging in the app.

**Fix:** leave it, or route it through whatever error reporting is added later.
Recorded, not urgent.

### C5 — There are no unit tests

The four scripts are the entire test suite, and they are end-to-end browser
checks. Pure logic that would benefit from unit tests: `isFlat()` in
`project-shot.tsx`, `parseTurns()` and `checkRateLimit()` in `chat/guard.ts`,
`shipLogByMonth()` and `allTechnologies()` in `projects.ts`, and the phash
comparison in `capture.mjs`.

**Fix:** add `node:test` (built in, no dependency) with a `npm run test`
script covering those six functions. Perhaps 120 lines total, and it would run
in a second rather than the ~90s the browser gates take.

---

## D. Consistency

### D1 — Link prefetching is applied inconsistently

`IntentLink` is used on project cards and the ship-log launch list. Plain
`Link` — with default viewport prefetching — is still used in the nav, the
footer, the timeline, and the case-study pager.

The nav and footer are fine (a handful of links). The timeline renders one per
project and the pager two, so those arguably want the same treatment.

**Fix:** switch the timeline and pager to `IntentLink`; document in the
component's docstring that nav/footer stay on the default deliberately.

### D2 — Accent colour is set three different ways

`data-accent="emerald"` on an element (CSS custom property), `accentHex()` in
the OG cards, and `LEVEL_BG` literals in `github-activity.tsx`.

**Fix:** folded into B3. One palette, three consumers.

### D3 — `scripts/subset-fonts.py` is the only Python in the repo

It needs `pip install fonttools brotli`, which is not declared anywhere except
its own docstring, and it is not run by CI — the outputs are committed.

**Fix:** add a `requirements.txt` next to it, or port it to a Node script using
`fonttools`' WASM build. Low priority — it runs perhaps once a year, when geist
is upgraded — but the undeclared dependency should at least be in the README.

---

## Suggested order

1. **A1** — the config divergence, because it is a live trap.
2. **A2–A7** — dead code, mechanical, makes everything else easier to read.
3. **C3** — the OG render check, because that regression has happened before.
4. **B1, B2** — script consolidation.
5. **B3 / D2** — token unification.
6. **C5** — unit tests for the pure logic.
7. **B4** — splitting primitives; pure churn, do it last.

Items deliberately not proposed: B5 (case studies stay in TypeScript) and C4
(console.error is fine until there is somewhere better to send it).
