'use client';

import { animate, useReducedMotion } from 'framer-motion';
import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from 'react';
import { cn } from '@/lib/utils';

/** `useLayoutEffect` warns during SSR; fall back to `useEffect` on the server. */
const useIsomorphicLayoutEffect = typeof window === 'undefined' ? useEffect : useLayoutEffect;

/**
 * Scroll reveal, done as progressive enhancement.
 *
 * The hidden state lives in CSS behind an `html.js` class that an inline script
 * sets before first paint. Without JavaScript the class is never added, so the
 * content renders plainly visible rather than being stranded at opacity 0 —
 * which is what happens if you let a motion library server-render its initial
 * state. Reduced motion is handled in the same stylesheet.
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

/**
 * Counts up when scrolled into view.
 *
 * The server renders the real number so it is present without JavaScript and
 * readable by crawlers. On the client the value is reset to zero in a layout
 * effect — before paint, so there is no flash of the final number — and then
 * animated once the element is visible.
 */
export function Counter({
  value,
  duration = 1.4,
  className,
}: {
  value: number;
  duration?: number;
  className?: string;
}) {
  const ref = useRef<HTMLSpanElement>(null);
  const reduced = useReducedMotion();
  const [display, setDisplay] = useState(value);

  useIsomorphicLayoutEffect(() => {
    if (reduced) return;
    setDisplay(0);
  }, [reduced]);

  useEffect(() => {
    const el = ref.current;
    if (!el || reduced) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) return;
        observer.disconnect();
        animate(0, value, {
          duration,
          ease: [0.16, 1, 0.3, 1],
          onUpdate: (v) => setDisplay(Math.round(v)),
        });
      },
      { threshold: 0.2 },
    );

    observer.observe(el);
    return () => observer.disconnect();
  }, [value, duration, reduced]);

  return (
    <span ref={ref} className={className}>
      {display.toLocaleString('en-US')}
    </span>
  );
}
