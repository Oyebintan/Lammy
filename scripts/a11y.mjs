#!/usr/bin/env node
/**
 * Accessibility gate. Fails the build on any serious or critical WCAG 2.1 AA
 * violation across every route at desktop and mobile widths.
 *
 * BASE_URL defaults to a local `next start`. CHROMIUM_PATH overrides the
 * browser binary for environments that ship Chromium outside Playwright's
 * download cache.
 */
import { chromium } from 'playwright';
import AxeBuilder from '@axe-core/playwright';

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
console.log('\n✓ No accessibility violations, no horizontal overflow, no undersized targets.');
