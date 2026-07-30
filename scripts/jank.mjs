#!/usr/bin/env node
/**
 * Smoothness probe: layout shift, long tasks and per-frame timing while
 * scrolling, on a throttled CPU.
 *
 * Deliberately not wired into CI. Frame timings depend on what else the
 * machine is doing, so a threshold here would either be so loose it catches
 * nothing or so tight it fails at random. Run it by hand when something feels
 * sluggish — the numbers are only meaningful compared against another run on
 * the same machine, which is exactly how the aurora blur was found.
 *
 *   npm run jank            # 4x CPU throttle
 *   CPU=6 npm run jank      # a genuinely slow device
 *
 * A healthy result is single-digit frames over 32ms out of 99 and a p95 near
 * 20ms. Before the blur filter came off the aurora layers, the home page
 * reported 18/99 and a p95 of 76ms.
 */
import { chromium } from 'playwright';

const B = process.env.BASE_URL ?? 'http://127.0.0.1:3000';
const ROUTES = ['/', '/work', '/ship-log', '/work/siwes-finder'];
const CPU = Number(process.env.CPU || 4);

const browser = await chromium.launch(
  process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {},
);

for (const route of ROUTES) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, colorScheme: 'dark' });
  const page = await ctx.newPage();
  const cdp = await ctx.newCDPSession(page);
  await cdp.send('Emulation.setCPUThrottlingRate', { rate: CPU });

  await page.goto(B + route, { waitUntil: 'load' });

  // Layout shift + long tasks during load and settle.
  await page.evaluate(() => {
    window.__cls = 0;
    window.__shifts = [];
    window.__long = [];
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) {
        if (e.hadRecentInput) continue;
        window.__cls += e.value;
        if (e.value > 0.002)
          window.__shifts.push({
            v: Number(e.value.toFixed(4)),
            t: Math.round(e.startTime),
            src: (e.sources || [])
              .map((s) => (s.node ? s.node.nodeName + '.' + String(s.node.className || '').slice(0, 40) : '?'))
              .slice(0, 2),
          });
      }
    }).observe({ type: 'layout-shift', buffered: true });
    new PerformanceObserver((l) => {
      for (const e of l.getEntries()) window.__long.push(Math.round(e.duration));
    }).observe({ type: 'longtask', buffered: true });
  });
  await page.waitForTimeout(3500);

  // Scroll smoothness: drive the page down in small steps and time each frame.
  const frames = await page.evaluate(
    () =>
      new Promise((resolve) => {
        const times = [];
        let last = performance.now();
        let y = 0;
        function step() {
          const now = performance.now();
          times.push(now - last);
          last = now;
          y += 40;
          window.scrollTo(0, y);
          if (y < 4000) requestAnimationFrame(step);
          else resolve(times.slice(1));
        }
        requestAnimationFrame(step);
      }),
  );

  const res = await page.evaluate(() => ({ cls: window.__cls, shifts: window.__shifts, long: window.__long }));
  const sorted = [...frames].sort((a, b) => a - b);
  const p50 = sorted[Math.floor(sorted.length * 0.5)];
  const p95 = sorted[Math.floor(sorted.length * 0.95)];
  const dropped = frames.filter((f) => f > 32).length;

  console.log(`\n${route}   (CPU ${CPU}x)`);
  console.log(`  CLS ${res.cls.toFixed(4)}`);
  for (const s of res.shifts.slice(0, 5)) console.log(`     shift ${s.v} @${s.t}ms  ${s.src.join(' , ')}`);
  console.log(`  long tasks: ${res.long.length}  (${res.long.filter((d) => d > 100).length} over 100ms, worst ${Math.max(0, ...res.long)}ms)`);
  console.log(`  scroll frames: p50 ${p50.toFixed(1)}ms  p95 ${p95.toFixed(1)}ms  ${dropped}/${frames.length} over 32ms`);

  await ctx.close();
}
await browser.close();
