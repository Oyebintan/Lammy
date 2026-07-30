#!/usr/bin/env node
/**
 * Captures a screenshot of every live deployment, optimises it, and records the
 * result in data/screenshots.json.
 *
 * The hard problem here is not taking the picture — it is not committing a new
 * one every night. An animated page yields different pixels on every run, which
 * would mean a commit per night and unbounded repository growth. Three things
 * prevent that: motion is disabled via emulated media, animations and
 * transitions are killed with an injected stylesheet, and the result is
 * compared against the previous capture by perceptual hash. A capture whose
 * hash is within a small Hamming distance of the stored one is discarded.
 *
 * Usage:
 *   node scripts/capture.mjs                 capture anything stale
 *   node scripts/capture.mjs --force         ignore staleness, recapture all
 *   node scripts/capture.mjs --slug=<slug>   single project
 *   node scripts/capture.mjs --dry-run       report only, write nothing
 */
import { mkdir, readFile, writeFile, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';
import { chromium } from 'playwright';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..');

const args = process.argv.slice(2);
const FORCE = args.includes('--force');
const DRY_RUN = args.includes('--dry-run');
const ONLY = args.find((a) => a.startsWith('--slug='))?.split('=')[1];

const WIDTHS = [1440, 720];
const VIEWPORT = { width: 1440, height: 900 };
const STALE_AFTER_DAYS = 14;
/** Below this Hamming distance the capture is treated as visually unchanged. */
const PHASH_EQUAL_THRESHOLD = 4;

/** Average hash over a 16x16 greyscale reduction. */
async function perceptualHash(buffer) {
  const size = 16;
  const raw = await sharp(buffer).greyscale().resize(size, size, { fit: 'fill' }).raw().toBuffer();
  const mean = raw.reduce((sum, v) => sum + v, 0) / raw.length;
  let bits = '';
  for (const v of raw) bits += v >= mean ? '1' : '0';
  let hex = '';
  for (let i = 0; i < bits.length; i += 4) hex += parseInt(bits.slice(i, i + 4), 2).toString(16);
  return hex;
}

function hammingDistance(a, b) {
  if (!a || !b || a.length !== b.length) return Infinity;
  let d = 0;
  for (let i = 0; i < a.length; i++) {
    let x = parseInt(a[i], 16) ^ parseInt(b[i], 16);
    while (x) {
      d += x & 1;
      x >>= 1;
    }
  }
  return d;
}

function isStale(shot, project) {
  if (FORCE) return true;
  if (!shot || shot.status !== 'ok' || !shot.capturedAt) return true;
  const ageDays = (Date.now() - new Date(shot.capturedAt).getTime()) / 86_400_000;
  if (ageDays > STALE_AFTER_DAYS) return true;
  // A push newer than the capture means the live site probably changed.
  return new Date(project.primaryRepo.pushedAt) > new Date(shot.capturedAt);
}

async function capture(browser, project) {
  const context = await browser.newContext({
    viewport: VIEWPORT,
    deviceScaleFactor: 2,
    colorScheme: 'dark',
    reducedMotion: 'reduce',
    userAgent:
      'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0 Safari/537.36 lammy-portfolio-screenshot',
  });
  const page = await context.newPage();

  try {
    const response = await page.goto(project.liveUrl, {
      waitUntil: 'domcontentloaded',
      timeout: 45_000,
    });

    if (!response) return { status: 'unreachable' };
    const code = response.status();
    if (code === 401 || code === 403) return { status: 'protected' };
    if (code >= 400) return { status: 'unreachable' };

    await page.waitForLoadState('networkidle', { timeout: 20_000 }).catch(() => {
      /* long-polling pages never idle; the capture is still valid */
    });

    // Freeze everything that could differ between two otherwise identical runs.
    await page.addStyleTag({
      content: `*,*::before,*::after{animation:none!important;transition:none!important;
        animation-play-state:paused!important;caret-color:transparent!important}
        html{scroll-behavior:auto!important}`,
    });
    await page.evaluate(() => window.scrollTo(0, 0));
    await page.waitForTimeout(1200);

    const png = await page.screenshot({ type: 'png' });
    return { status: 'ok', png };
  } catch (err) {
    return { status: 'error', error: err.message };
  } finally {
    await context.close();
  }
}

async function main() {
  const manifest = JSON.parse(await readFile(resolve(ROOT, 'data/manifest.json'), 'utf8'));
  const shotsPath = resolve(ROOT, 'data/screenshots.json');
  let shots = {};
  try {
    shots = JSON.parse(await readFile(shotsPath, 'utf8'));
  } catch {
    shots = {};
  }

  const targets = manifest.projects.filter(
    (p) => p.liveUrl && (!ONLY || p.slug === ONLY),
  );

  if (!targets.length) {
    console.log('No live deployments to capture.');
    return;
  }

  const browser = await chromium.launch({ args: ['--disable-dev-shm-usage'] });
  let changed = 0;
  let skipped = 0;

  try {
    for (const project of targets) {
      const prev = shots[project.slug];

      if (!isStale(prev, project)) {
        console.log(`· ${project.slug.padEnd(28)} fresh, skipping`);
        skipped++;
        continue;
      }

      const result = await capture(browser, project);

      if (result.status !== 'ok') {
        console.log(`✗ ${project.slug.padEnd(28)} ${result.status}${result.error ? ` — ${result.error.slice(0, 70)}` : ''}`);
        // Record the failure but keep any previously good image on disk, so the
        // site degrades to a stale screenshot rather than to a fallback card.
        shots[project.slug] = {
          ...(prev ?? { base: null, widths: [], aspectRatio: 16 / 10, phash: null, blurDataURL: null, capturedAt: null }),
          status: prev?.status === 'ok' ? 'ok' : result.status,
          lastCheckedAt: new Date().toISOString(),
        };
        continue;
      }

      const hash = await perceptualHash(result.png);
      const distance = hammingDistance(hash, prev?.phash);

      if (distance <= PHASH_EQUAL_THRESHOLD && prev?.status === 'ok') {
        console.log(`· ${project.slug.padEnd(28)} unchanged (distance ${distance}), keeping existing image`);
        shots[project.slug] = { ...prev, lastCheckedAt: new Date().toISOString() };
        skipped++;
        continue;
      }

      if (DRY_RUN) {
        const meta = await sharp(result.png).metadata();
        console.log(`~ ${project.slug.padEnd(28)} would write ${meta.width}x${meta.height}, phash distance ${distance}`);
        changed++;
        continue;
      }

      const outDir = resolve(ROOT, 'public/shots', project.slug);
      await mkdir(outDir, { recursive: true });

      const meta = await sharp(result.png).metadata();
      const aspectRatio = meta.width / meta.height;

      for (const width of WIDTHS) {
        await sharp(result.png)
          .resize({ width, withoutEnlargement: true })
          .webp({ quality: 82, effort: 5 })
          .toFile(resolve(outDir, `home-${width}.webp`));
      }

      const blur = await sharp(result.png).resize(20).webp({ quality: 40 }).toBuffer();

      shots[project.slug] = {
        base: `/shots/${project.slug}/home`,
        widths: WIDTHS,
        aspectRatio,
        capturedAt: new Date().toISOString(),
        lastCheckedAt: new Date().toISOString(),
        status: 'ok',
        phash: hash,
        blurDataURL: `data:image/webp;base64,${blur.toString('base64')}`,
      };

      console.log(`✓ ${project.slug.padEnd(28)} captured (distance ${distance === Infinity ? 'new' : distance})`);
      changed++;
    }
  } finally {
    await browser.close();
  }

  // Drop image directories for projects that no longer exist.
  const liveSlugs = new Set(manifest.projects.map((p) => p.slug));
  for (const slug of Object.keys(shots)) {
    if (!liveSlugs.has(slug)) {
      delete shots[slug];
      const dir = resolve(ROOT, 'public/shots', slug);
      if (existsSync(dir) && !DRY_RUN) await rm(dir, { recursive: true, force: true });
    }
  }

  if (!DRY_RUN) await writeFile(shotsPath, `${JSON.stringify(shots, null, 2)}\n`);
  console.log(`\n${changed} captured, ${skipped} unchanged.`);
}

main().catch((err) => {
  console.error('Capture failed:', err.message);
  process.exit(1);
});
