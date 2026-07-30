#!/usr/bin/env node
/**
 * Discovers shipped projects from GitHub (and Vercel when a token is present)
 * and writes data/manifest.json.
 *
 * Design constraints:
 *  - The site build never calls this. It reads the committed manifest, so a
 *    build succeeds with no secrets and no network.
 *  - Screenshot state lives in data/screenshots.json and is never written here,
 *    so a discovery run cannot clobber capture results.
 *  - Vercel is optional. Repo homepage plus the GitHub Deployments API already
 *    resolve production URLs; VERCEL_TOKEN only improves alias fidelity.
 */
import { writeFile, readFile, mkdir } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');
const DRY_RUN = process.argv.includes('--dry-run');

const OWNER = 'Oyebintan';
const TOKEN = process.env.GITHUB_TOKEN || process.env.GH_TOKEN;
const VERCEL_TOKEN = process.env.VERCEL_TOKEN;
const VERCEL_TEAM = 'team_NbtaApRmcBWbfVVg7Eggo6sY';

const DENY = new Set([
  'skills-getting-started-with-github-copilot',
  'Oyebintan', // profile README
  'Lammy', // this site — a portfolio listing itself reads as a bug, not a feature
  'Final-Year-Project-DL', // the repo's own description is "Project Duplicate"
]);
const DENY_PATTERNS = [/^skills-/i, /-test$/i, /^test-/i];
const MIN_PUSHED_AT = '2024-01-01';

/** Only renames, groups and annotates. Cannot introduce a project. */
const OVERRIDES = {
  'siwes-finder': { name: 'SIWES Finder', featured: true, order: 1, accent: 'emerald' },
  brandforge: { name: 'BrandForge', featured: true, order: 2, accent: 'amber' },
  lammydeart: {
    name: 'Lammy de Art',
    featured: true,
    order: 3,
    accent: 'rose',
    forceInclude: true,
    // The Vercel project `thelammydeart` lists this domain and its latest
    // production deployment is READY. The repo homepage field points at an
    // address that project does not serve, so it is not trusted here.
    liveUrlOverride: 'https://thelammydeart.vercel.app',
  },
  'email-spam-classifier': {
    name: 'Hybrid Spam Classifier',
    featured: true,
    order: 4,
    accent: 'violet',
    status: 'research',
    // The final-year project spans three repos: the training pipeline and API,
    // the web demo front end, and the Kotlin Android client.
    mergeRepos: ['Final-Year-Project', 'Android-APK'],
  },
  'career-recommender': { name: 'Career Recommender', order: 5, accent: 'sky' },
  'teniola-graduation-tribute': { name: 'OOU Times', order: 6, accent: 'lime' },
};

const TAGLINES = {
  'siwes-finder':
    'Industrial placement platform for Nigerian students — web app, Android app, and dashboards for students, employers and schools.',
  brandforge:
    'AI brand-identity studio. Five questions in, a complete brand kit out — strategy, voice, visual identity and an exportable PDF.',
  lammydeart: 'Design portfolio and catalogue for brand identity, packaging and campaign work.',
  'email-spam-classifier':
    'Two-stage feature selection feeding a deep neural network — 98.49% accuracy across 16,690 held-out emails.',
  'career-recommender':
    'Transparent, rule-based career matching across 42 careers with a personalised skill-gap analysis.',
  'teniola-graduation-tribute':
    'A newspaper-themed graduation tribute — broadsheet typography, a live ticker, and a compile-to-confetti colophon.',
};

const H = {
  Accept: 'application/vnd.github+json',
  'User-Agent': 'lammy-discovery',
  ...(TOKEN ? { Authorization: `Bearer ${TOKEN}` } : {}),
};

async function gh(path, { raw = false } = {}) {
  const res = await fetch(`https://api.github.com${path}`, {
    headers: raw ? { ...H, Accept: 'application/vnd.github.raw' } : H,
  });
  if (!res.ok) return null;
  return raw ? res.text() : res.json();
}

const slugify = (s) =>
  s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');

/** Drops bot noise and mechanical commits so only real work is counted. */
const isMeaningfulCommit = (message, authorLogin) => {
  const first = (message || '').split('\n')[0];
  if (/\[skip ci\]/i.test(message)) return false;
  if (/^chore\(progress\)/i.test(first)) return false;
  if (/^Merge branch /i.test(first)) return false;
  if ((authorLogin || '').endsWith('[bot]')) return false;
  return true;
};

/**
 * Merge commit subjects look like:
 *   Merge pull request #53 from Oyebintan/branch
 *   <blank>
 *   The actual human title
 * Line 0 is never worth showing.
 */
function parseCommitTitle(message) {
  const lines = (message || '').split('\n');
  const prMatch = lines[0].match(/^Merge pull request #(\d+)/);
  if (prMatch) {
    const title = lines.slice(1).find((l) => l.trim().length > 0);
    return { title: (title || lines[0]).trim(), prNumber: Number(prMatch[1]) };
  }
  return { title: lines[0].trim(), prNumber: undefined };
}

async function resolveLiveUrl(repo, override) {
  if (override?.liveUrlOverride) {
    return {
      url: override.liveUrlOverride,
      evidence: { type: 'repo-metadata', repo: repo.name, field: 'liveUrlOverride', value: override.liveUrlOverride, url: repo.html_url },
    };
  }
  if (repo.homepage && /^https?:\/\//.test(repo.homepage)) {
    return {
      url: repo.homepage.replace(/\/$/, ''),
      evidence: { type: 'repo-metadata', repo: repo.name, field: 'homepage', value: repo.homepage, url: repo.html_url },
    };
  }
  const deployments = await gh(`/repos/${OWNER}/${repo.name}/deployments?per_page=1&environment=Production`);
  if (Array.isArray(deployments) && deployments.length) {
    const statuses = await gh(`/repos/${OWNER}/${repo.name}/deployments/${deployments[0].id}/statuses?per_page=5`);
    const ok = Array.isArray(statuses) ? statuses.find((s) => s.state === 'success' && s.environment_url) : null;
    if (ok) {
      return {
        url: ok.environment_url.replace(/\/$/, ''),
        evidence: { type: 'deployment', url: ok.environment_url, date: deployments[0].created_at },
      };
    }
  }
  return { url: null, evidence: null };
}

/** Optional fidelity pass: replaces deployment-specific hosts with the alias. */
async function vercelAliases() {
  if (!VERCEL_TOKEN) return new Map();
  try {
    const res = await fetch(`https://api.vercel.com/v9/projects?teamId=${VERCEL_TEAM}&limit=100`, {
      headers: { Authorization: `Bearer ${VERCEL_TOKEN}` },
    });
    if (!res.ok) return new Map();
    const { projects = [] } = await res.json();
    const map = new Map();
    for (const p of projects) {
      const repoName = p.link?.repo;
      if (!repoName) continue;
      const alias = (p.alias || []).find((a) => a.domain && !a.domain.includes('-git-') && !a.domain.includes('-projects.vercel.app'));
      const domain = alias?.domain || p.targets?.production?.alias?.[0];
      if (!domain) continue;
      const key = repoName.toLowerCase();
      const prev = map.get(key);
      const updated = p.updatedAt || 0;
      // Duplicate Vercel projects for one repo collapse here; newest wins.
      if (!prev || updated > prev.updatedAt) map.set(key, { url: `https://${domain}`, updatedAt: updated });
    }
    return map;
  } catch {
    return new Map();
  }
}

async function main() {
  if (!TOKEN) console.warn('! No GITHUB_TOKEN — running unauthenticated, expect rate limits.');

  const allRepos = [];
  for (let page = 1; page <= 4; page++) {
    const batch = await gh(`/users/${OWNER}/repos?per_page=100&page=${page}&sort=pushed`);
    if (!Array.isArray(batch) || !batch.length) break;
    allRepos.push(...batch);
    if (batch.length < 100) break;
  }

  if (!allRepos.length) {
    // Some sandboxed environments permit only repo-scoped GitHub endpoints, so
    // the account-wide listing 403s. CI has no such restriction and takes the
    // path above — which is what keeps discovery automatic for future repos.
    // Here we fall back to every repo already known to the project.
    const known = new Set([
      ...Object.keys(OVERRIDES),
      ...Object.values(OVERRIDES).flatMap((o) => o.mergeRepos || []),
    ]);
    try {
      const prev = JSON.parse(await readFile(resolve(ROOT, 'data/manifest.json'), 'utf8'));
      for (const p of prev.projects || []) for (const r of p.repos || []) known.add(r.name);
    } catch {
      /* first run — nothing to recover */
    }
    console.warn(`! Repo listing unavailable; falling back to ${known.size} known repositories.`);
    for (const nameOrSlug of known) {
      const r = await gh(`/repos/${OWNER}/${nameOrSlug}`);
      if (r) allRepos.push(r);
    }
    // Slug keys resolve to their canonical repo, so drop duplicates by id.
    const byId = new Map(allRepos.map((r) => [r.id, r]));
    allRepos.length = 0;
    allRepos.push(...byId.values());
    allRepos.sort((a, b) => (a.pushed_at < b.pushed_at ? 1 : -1));
  }

  if (!allRepos.length) throw new Error('No repositories returned from GitHub.');

  const aliases = await vercelAliases();
  const mergedAway = new Set(
    Object.values(OVERRIDES).flatMap((o) => (o.mergeRepos || []).map((r) => r.toLowerCase())),
  );

  const projects = [];
  const shipLog = [];
  const languageTotals = {};
  const recentCommits = [];
  const contributions = {};
  let commitsTracked = 0;
  let deploymentCount = 0;

  for (const repo of allRepos) {
    const slug = slugify(repo.name);
    const override = OVERRIDES[slug] || {};

    if (mergedAway.has(repo.name.toLowerCase())) continue;
    if (DENY.has(repo.name) || DENY_PATTERNS.some((re) => re.test(repo.name))) continue;
    if (!override.forceInclude) {
      if (repo.fork || repo.archived || repo.is_template) continue;
      if (repo.name.toLowerCase() === OWNER.toLowerCase()) continue;
      if (repo.pushed_at < MIN_PUSHED_AT) continue;
    }

    const readmeText = await gh(`/repos/${OWNER}/${repo.name}/readme`, { raw: true });
    if (!override.forceInclude && !repo.description && !readmeText) continue;

    const languages = (await gh(`/repos/${OWNER}/${repo.name}/languages`)) || {};
    const repoRefs = [];
    const buildRef = (r, langs) => ({
      owner: OWNER,
      name: r.name,
      url: r.html_url,
      defaultBranch: r.default_branch,
      createdAt: r.created_at,
      pushedAt: r.pushed_at,
      languages: langs,
      stars: r.stargazers_count,
      topics: r.topics || [],
      license: r.license?.spdx_id || null,
    });
    repoRefs.push(buildRef(repo, languages));

    for (const extra of override.mergeRepos || []) {
      const er = await gh(`/repos/${OWNER}/${extra}`);
      if (!er) continue;
      const el = (await gh(`/repos/${OWNER}/${extra}/languages`)) || {};
      repoRefs.push(buildRef(er, el));
    }

    for (const ref of repoRefs) {
      for (const [lang, bytes] of Object.entries(ref.languages)) {
        languageTotals[lang] = (languageTotals[lang] || 0) + bytes;
      }
    }

    let { url: liveUrl, evidence: liveUrlEvidence } = await resolveLiveUrl(repo, override);
    const alias = aliases.get(repo.name.toLowerCase());
    if (alias) {
      liveUrl = alias.url;
      liveUrlEvidence = { type: 'deployment', url: alias.url, date: new Date(alias.updatedAt).toISOString() };
    }
    if (liveUrl) deploymentCount++;

    const commits = (await gh(`/repos/${OWNER}/${repo.name}/commits?per_page=100&sha=${repo.default_branch}`)) || [];
    const releases = (await gh(`/repos/${OWNER}/${repo.name}/releases?per_page=20`)) || [];

    const accent = override.accent || 'sky';
    const name = override.name || repo.name;

    shipLog.push({
      id: `${slug}:repo_created:${repo.created_at}`,
      slug,
      projectName: name,
      accent,
      kind: 'repo_created',
      title: `${name} started`,
      body: null,
      date: repo.created_at,
      url: repo.html_url,
    });

    for (const rel of releases) {
      if (!rel.published_at) continue;
      shipLog.push({
        id: `${slug}:release:${rel.tag_name}`,
        slug,
        projectName: name,
        accent,
        kind: 'release',
        title: rel.name || rel.tag_name,
        body: null,
        date: rel.published_at,
        release: { tag: rel.tag_name, url: rel.html_url },
        url: rel.html_url,
      });
    }

    const seenSha = new Set();
    for (const c of commits) {
      const msg = c.commit?.message || '';
      const date = c.commit?.author?.date;
      if (!date) continue;
      commitsTracked++;
      const day = date.slice(0, 10);
      contributions[day] = (contributions[day] || 0) + 1;
      if (!isMeaningfulCommit(msg, c.author?.login)) continue;
      if (seenSha.has(c.sha)) continue;
      seenSha.add(c.sha);

      const { title, prNumber } = parseCommitTitle(msg);
      if (!title) continue;

      recentCommits.push({ repo: repo.name, sha: c.sha, message: title, date, url: c.html_url });

      const isMerge = (c.parents || []).length > 1;
      const isFeature = /^(feat|fix|perf)(\(.+\))?:/i.test(title);
      if (isMerge || isFeature) {
        shipLog.push({
          id: `${slug}:merge:${c.sha}`,
          slug,
          projectName: name,
          accent,
          kind: 'merge',
          title,
          body: null,
          date,
          commit: { sha: c.sha, url: c.html_url },
          prNumber,
          url: c.html_url,
        });
      }
    }

    const startedAt = repoRefs.map((r) => r.createdAt).sort()[0];
    const shippedAt = liveUrl ? repoRefs.map((r) => r.createdAt).sort()[0] : null;

    projects.push({
      slug,
      name,
      tagline: TAGLINES[slug] || repo.description || '',
      repos: repoRefs,
      primaryRepo: repoRefs[0],
      liveUrl,
      liveUrlEvidence,
      status: override.status || (liveUrl ? 'live' : 'shipped'),
      featured: Boolean(override.featured),
      order: override.order ?? 99,
      accent,
      startedAt,
      shippedAt,
    });
  }

  projects.sort((a, b) => a.order - b.order || a.name.localeCompare(b.name));

  // Cap per-project ship events so a busy repo cannot flood the log.
  const perProject = {};
  const trimmedLog = shipLog
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .filter((e) => {
      if (e.kind === 'repo_created' || e.kind === 'release') return true;
      perProject[e.slug] = (perProject[e.slug] || 0) + 1;
      return perProject[e.slug] <= 12;
    });

  const totalBytes = Object.values(languageTotals).reduce((a, b) => a + b, 0) || 1;
  const languages = Object.entries(languageTotals)
    .map(([nameKey, bytes]) => ({ name: nameKey, bytes, share: bytes / totalBytes }))
    .sort((a, b) => b.bytes - a.bytes);

  const manifest = {
    generatedAt: new Date().toISOString(),
    owner: OWNER,
    projects,
    shipLog: trimmedLog,
    activity: {
      generatedAt: new Date().toISOString(),
      totals: {
        repositories: allRepos.filter((r) => !r.fork).length,
        projectsShipped: projects.length,
        deployments: deploymentCount,
        technologies: languages.length,
        commitsTracked,
      },
      languages,
      recentCommits: recentCommits.sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 12),
      contributions,
    },
  };

  if (DRY_RUN) {
    console.log(JSON.stringify({ ...manifest, activity: { ...manifest.activity, contributions: '…' } }, null, 2).slice(0, 4000));
    console.log(`\n[dry-run] ${projects.length} projects, ${trimmedLog.length} ship events. Nothing written.`);
    return;
  }

  await mkdir(resolve(ROOT, 'data'), { recursive: true });
  await writeFile(resolve(ROOT, 'data/manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);

  // Seed screenshot slots for any new project without disturbing existing captures.
  const shotsPath = resolve(ROOT, 'data/screenshots.json');
  let shots = {};
  try {
    shots = JSON.parse(await readFile(shotsPath, 'utf8'));
  } catch {
    shots = {};
  }
  for (const p of projects) {
    if (!shots[p.slug]) {
      shots[p.slug] = { base: null, widths: [], aspectRatio: 16 / 10, capturedAt: null, status: 'never-attempted', phash: null, blurDataURL: null };
    }
  }
  await writeFile(shotsPath, `${JSON.stringify(shots, null, 2)}\n`);

  console.log(`✓ ${projects.length} projects, ${trimmedLog.length} ship events, ${languages.length} technologies`);
  for (const p of projects) {
    console.log(`  ${p.featured ? '★' : ' '} ${p.slug.padEnd(28)} ${p.liveUrl || '(no live url)'}`);
  }
}

main().catch((err) => {
  console.error('Discovery failed:', err.message);
  process.exit(1);
});
