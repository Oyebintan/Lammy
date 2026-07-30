'use client';

import { useEffect, useRef, type ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Tracks the pointer and exposes its position as `--mx` / `--my` custom
 * properties, which `.spotlight-card` renders as a soft accent highlight.
 *
 * Writing CSS variables rather than React state keeps this off the render
 * path entirely — moving the mouse repaints one gradient and nothing else.
 * Updates are coalesced into a single animation frame, and the listener is
 * only attached on devices with a real pointer, so phones pay nothing.
 */
export function SpotlightCard({
  children,
  className,
  as: Tag = 'div',
}: {
  children: ReactNode;
  className?: string;
  as?: 'div' | 'article' | 'li';
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (!window.matchMedia('(hover: hover) and (pointer: fine)').matches) return;

    let frame = 0;
    let x = 0;
    let y = 0;

    const paint = () => {
      frame = 0;
      el.style.setProperty('--mx', `${x}px`);
      el.style.setProperty('--my', `${y}px`);
    };

    const onMove = (event: PointerEvent) => {
      const rect = el.getBoundingClientRect();
      x = event.clientX - rect.left;
      y = event.clientY - rect.top;
      frame ||= requestAnimationFrame(paint);
    };

    el.addEventListener('pointermove', onMove);
    return () => {
      el.removeEventListener('pointermove', onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <Tag ref={ref as never} className={cn('spotlight-card', className)}>
      {children}
    </Tag>
  );
}
