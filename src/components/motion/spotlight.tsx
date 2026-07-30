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
    let clientX = 0;
    let clientY = 0;

    // The rect is read inside the frame callback, not in the event handler.
    // Reading it per event forced a synchronous layout on every pointer move —
    // a mouse reports far more often than the screen refreshes, so that was
    // several forced layouts per painted frame for one gradient.
    const paint = () => {
      frame = 0;
      const rect = el.getBoundingClientRect();
      el.style.setProperty('--mx', `${clientX - rect.left}px`);
      el.style.setProperty('--my', `${clientY - rect.top}px`);
    };

    const onMove = (event: PointerEvent) => {
      clientX = event.clientX;
      clientY = event.clientY;
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
