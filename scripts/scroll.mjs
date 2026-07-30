#!/usr/bin/env node
/**
 * Scroll-behaviour gate.
 *
 * A refresh must return to the top of the page, and back/forward must not.
 * Those two pull in opposite directions and the browser gives you one switch
 * for both, so this has been got wrong more than once — hence a test rather
 * than a comment. Anchors are checked too, because the obvious fix for the
 * refresh case (scrolling to zero on load) silently breaks them.
 *
 * BASE_URL defaults to a local `next start`. CHROMIUM_PATH overrides the
 * browser binary.
 */
import { chromium } from 'playwright';

const B = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ROUTES = ['/', '/work', '/ship-log', '/work/siwes-finder'];
const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);
let fail = 0;

for (const vp of [
  { label: 'desktop', width: 1440, height: 900 },
  { label: 'mobile', width: 390, height: 844 },
]) {
  const ctx = await browser.newContext({ viewport: { width: vp.width, height: vp.height } });
  const page = await ctx.newPage();
  const settle = () => page.waitForTimeout(1000);

  // Every route must come back to the top after a refresh.
  for (const route of ROUTES) {
    await page.goto(B + route, { waitUntil: 'load' });
    await settle();
    await page.evaluate(() => window.scrollTo(0, 1500));
    await settle();
    const before = await page.evaluate(() => window.scrollY);
    await page.reload({ waitUntil: 'load' });
    await settle();
    const after = await page.evaluate(() => window.scrollY);
    const ok = after === 0;
    if (!ok) fail++;
    console.log(`${vp.label.padEnd(8)} refresh ${route.padEnd(20)} ${before} -> ${after}  ${ok ? '✓' : '✗'}`);
  }

  // A soft navigation followed by a refresh must also land at the top.
  await page.goto(B + '/', { waitUntil: 'load' });
  await settle();
  await page.locator('nav a[href="/ship-log"]:visible').first().click();
  await page.waitForURL('**/ship-log');
  await settle();
  await page.evaluate(() => window.scrollTo(0, 1500));
  await settle();
  await page.reload({ waitUntil: 'load' });
  await settle();
  const softThenReload = await page.evaluate(() => window.scrollY);
  if (softThenReload !== 0) fail++;
  console.log(`${vp.label.padEnd(8)} soft nav then refresh          -> ${softThenReload}  ${softThenReload === 0 ? '✓' : '✗'}`);

  // Back must still restore where you were.
  await page.goto(B + '/', { waitUntil: 'load' });
  await settle();
  await page.evaluate(() => window.scrollTo(0, 1200));
  await settle();
  await page.goto(B + '/work', { waitUntil: 'load' });
  await settle();
  await page.goBack({ waitUntil: 'load' });
  await settle();
  const back = await page.evaluate(() => window.scrollY);
  const backOk = Math.abs(back - 1200) < 120;
  if (!backOk) fail++;
  console.log(`${vp.label.padEnd(8)} back button 1200               -> ${back}  ${backOk ? '✓' : '✗'}`);

  // Anchors must still work.
  await page.goto(B + '/#contact', { waitUntil: 'load' });
  await settle();
  const hash = await page.evaluate(() => window.scrollY);
  if (hash < 100) fail++;
  console.log(`${vp.label.padEnd(8)} #contact deep link             -> ${hash}  ${hash > 100 ? '✓' : '✗'}`);

  await ctx.close();
}

await browser.close();
console.log(fail === 0 ? '\n✓ all scroll checks pass' : `\n✗ ${fail} failure(s)`);
process.exit(fail === 0 ? 0 : 1);
