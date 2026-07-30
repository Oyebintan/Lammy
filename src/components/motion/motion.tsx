'use client';

import { useEffect, useRef, useState, type CSSProperties, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

const prefersReducedMotion = () =>
  typeof window !== 'undefined' &&
  window.matchMedia('(prefers-reduced-motion: reduce)').matches;

/**
 * Scroll reveal, done as progressive enhancement.
 *
 * The hidden state lives in CSS behind an `html.js` class that an inline script
 * sets before first paint. Without JavaScript the class is never added, so the
 * content renders plainly visible rather than being stranded at opacity 0 —
 * which is what happens if a motion library server-renders its initial state.
 * Reduced motion is handled in the same stylesheet.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  as?: 'div' | 'li' | 'section';
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // Fires synchronously for anything already on screen.
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        el.classList.add('is-visible');
        observer.disconnect();
      },
      { rootMargin: '0px 0px -80px 0px', threshold: 0.01 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <Tag
      ref={ref as never}
      className={cn('reveal', className)}
      style={{ '--reveal-delay': `${Math.round(delay * 1000)}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}

/* Same easing curve as the CSS reveals, so counters and fades feel related. */
const easeOutExpo = (t: number) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t));

/**
 * Counts up when scrolled into view.
 *
 * The server renders the real number, so it is present without JavaScript and
 * readable by crawlers. On the client it resets to zero in a layout-timed pass
 * before paint, then animates once visible.
 *
 * This is a hand-rolled rAF loop rather than a motion library: counting a
 * number up was the only animation left that needed JavaScript, and importing
 * an animation runtime to do it cost more than the entire rest of the page.
 */
export function Counter({
  value,
  duration = 1400,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const el = ref.current;
    if (!el || prefersReducedMotion()) return;

    setDisplay(0);
    let frame = 0;
    let start: number | null = null;

    const step = (now: number) => {
      start ??= now;
      const progress = Math.min((now - start) / duration, 1);
      setDisplay(Math.round(easeOutExpo(progress) * value));
      if (progress < 1) frame = requestAnimationFrame(step);
    };

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        frame = requestAnimationFrame(step);
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => {
      observer.disconnect();
      cancelAnimationFrame(frame);
    };
  }, [value, duration]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-US')}
    </span>
  );
}
