#!/usr/bin/env node
/**
 * Front-end gate. Despite the name it covers four things, each added after the
 * corresponding regression shipped:
 *
 *  - serious/critical WCAG 2.1 AA violations on every route, desktop and mobile
 *  - horizontal overflow, which axe does not test and which made iOS zoom the
 *    whole page out
 *  - 24px minimum target size (WCAG 2.2), which axe does not test either
 *  - the two rendering paths that fail silently: `.glass` losing its
 *    `backdrop-filter`, and the Open Graph cards coming out blank
 *
 * BASE_URL defaults to a local `next start`. CHROMIUM_PATH overrides the
 * browser binary for environments that ship Chromium outside Playwright's
 * download cache.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';
import sharp from 'sharp';

const BASE_URL = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const EXECUTABLE = process.env.CHROMIUM_PATH || undefined;

const ROUTES = [
  '/',
  '/work',
  '/work/siwes-finder',
  '/work/email-spam-classifier',
  '/ship-log',
  '/this-route-does-not-exist',
];

const VIEWPORTS = [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
];

const browser = await chromium.launch(EXECUTABLE ? { executablePath: EXECUTABLE } : {});
let failures = 0;

try {
  // Glass surfaces must ship the unprefixed `backdrop-filter`. Writing a
  // hand-rolled `-webkit-` line after the standard property makes the CSS
  // bundler collapse the pair and keep only the prefixed form, which current
  // Chromium does not support — the blur silently disappears and translucent
  // panels turn into windows. That shipped once; this is two lines to stop it
  // shipping again.
  {
    const page = await browser.newPage();
    await page.goto(`${BASE_URL}/`, { waitUntil: 'networkidle', timeout: 30_000 });
    const applied = await page.evaluate(() => {
      const probe = document.createElement('div');
      probe.className = 'glass';
      document.body.append(probe);
      const value = getComputedStyle(probe).backdropFilter;
      probe.remove();
      return value;
    });
    if (!applied || applied === 'none') {
      failures += 1;
      console.error(`\n✗ .glass resolves backdrop-filter to "${applied}" — the blur is not being applied`);
    } else {
      console.log(`✓ glass       backdrop-filter: ${applied}`);
    }
    await page.close();
  }

  // Open Graph cards render through Satori, which is not a browser and fails in
  // ways the compiler cannot see — during implementation it produced a hard
  // rectangle clipped to an element box, and then a card of white text on a
  // white background, both from code that type-checked cleanly. A shared link
  // is the first impression of this site, so a blank card is worth a red build.
  for (const [label, path] of [
    ['site', '/opengraph-image'],
    ['project', '/work/siwes-finder/opengraph-image'],
  ]) {
    const res = await fetch(`${BASE_URL}${path}`);
    const type = res.headers.get('content-type') ?? '';
    const body = Buffer.from(await res.arrayBuffer());

    const problems = [];
    if (!res.ok) problems.push(`HTTP ${res.status}`);
    if (!type.startsWith('image/png')) problems.push(`content-type ${type}`);
    // A 1200x630 PNG carrying real type and a gradient is ~80KB. Anything an
    // order of magnitude under that is a flat or near-empty frame.
    if (body.length < 20_000) problems.push(`only ${(body.length / 1024).toFixed(1)}KB`);

    if (!problems.length) {
      const { mean, stdev } = (await sharp(body).greyscale().stats()).channels[0];

      // Two different failures, two different signals.
      //
      // A flat frame — one colour, no type — has almost no spread. Healthy
      // cards measure 40-42.
      if (stdev < 10) problems.push(`flat image, stdev ${stdev.toFixed(1)}`);

      // A washed-out frame is the one that actually shipped: `rgba()` gradient
      // stops came out near-white, giving white text on a white background.
      // That has plenty of spread, so only brightness catches it. These cards
      // are near-black by design — measured 10.0, 11.7 and 17.3 across the
      // three; the broken render measured 108.3.
      if (mean > 60) problems.push(`washed out, mean brightness ${mean.toFixed(1)}`);
    }

    if (problems.length) {
      failures += 1;
      console.error(`\n✗ og ${label} (${path}) — ${problems.join(', ')}`);
    } else {
      console.log(`✓ og card     ${label.padEnd(8)} ${(body.length / 1024).toFixed(0)}KB`);
    }
  }

  for (const viewport of VIEWPORTS) {
    const context = await browser.newContext({
      viewport: { width: viewport.width, height: viewport.height },
      colorScheme: 'dark',
    });

    for (const route of ROUTES) {
      const page = await context.newPage();
      await page.goto(`${BASE_URL}${route}`, { waitUntil: 'networkidle', timeout: 30_000 });
      await page.waitForTimeout(500);

      // Horizontal overflow check. Not something axe reports, but on a phone
      // it makes the browser zoom the whole page out to fit, which is how this
      // shipped unnoticed: every element looks correct, just smaller.
      const overflow = await page.evaluate(() => {
        const vw = document.documentElement.clientWidth;
        const sw = document.documentElement.scrollWidth;
        if (sw <= vw + 1) return null;
        const worst = [...document.querySelectorAll('*')]
          .map((el) => ({ el, r: el.getBoundingClientRect() }))
          .filter(({ r }) => r.width > vw + 1)
          .sort((a, b) => b.r.width - a.r.width)[0];
        return {
          vw,
          sw,
          culprit: worst
            ? `<${worst.el.tagName.toLowerCase()}> ${String(worst.el.className).slice(0, 70)}`
            : 'unknown',
        };
      });

      if (overflow) {
        failures += 1;
        console.error(
          `\n✗ ${viewport.label} ${route} — horizontal overflow: scrollWidth ${overflow.sw} > viewport ${overflow.vw}`,
        );
        console.error(`    widest: ${overflow.culprit}`);
      }

      // Target size (WCAG 2.2 AA, 2.5.8). axe does not check this, so a set of
      // 20px-tall footer links shipped under a passing gate. Anything inline
      // inside a sentence is exempt by the spec, and so is the offscreen skip
      // link, which only takes up space once focused.
      const smallTargets = await page.evaluate(() => {
        const inSentence = (el) => {
          const parent = el.parentElement;
          if (!parent) return false;
          const own = (el.textContent ?? '').trim();
          const around = (parent.textContent ?? '').trim();
          return around.length > own.length + 1;
        };
        return [...document.querySelectorAll('a, button, [role="button"]')]
          .filter((el) => {
            const r = el.getBoundingClientRect();
            if (r.width === 0 || r.height === 0) return false;
            if (el.closest('.sr-only')) return false;
            if (el.classList.contains('sr-only')) return false;
            return (r.height < 24 || r.width < 24) && !inSentence(el);
          })
          .map((el) => {
            const r = el.getBoundingClientRect();
            return `${el.tagName.toLowerCase()} ${Math.round(r.width)}x${Math.round(r.height)} "${(el.textContent ?? '').trim().slice(0, 32)}"`;
          });
      });

      if (smallTargets.length) {
        failures += smallTargets.length;
        console.error(`\n✗ ${viewport.label} ${route} — ${smallTargets.length} target(s) under 24px`);
        for (const t of [...new Set(smallTargets)].slice(0, 6)) console.error(`    ${t}`);
      }

      const results = await new AxeBuilder({ page })
        .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
        .analyze();

      const blocking = results.violations.filter((v) =>
        ['serious', 'critical'].includes(v.impact ?? ''),
      );

      if (blocking.length) {
        failures += blocking.length;
        console.error(`\n✗ ${viewport.label} ${route}`);
        for (const v of blocking) {
          console.error(`  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node/s)`);
          console.error(`    ${v.nodes[0].html.slice(0, 140)}`);
        }
      } else if (!overflow && !smallTargets.length) {
        console.log(`✓ ${viewport.label.padEnd(8)} ${route}`);
      }

      await page.close();
    }

    await context.close();
  }
} finally {
  await browser.close();
}

if (failures > 0) {
  console.error(`\n${failures} accessibility/layout failure(s).`);
  process.exit(1);
}
console.log(
  '\n✓ No accessibility violations, no horizontal overflow, no undersized targets;\n  glass and Open Graph cards both render.',
);
