import type { CSSProperties, ReactNode } from 'react';
import { cn } from '@/lib/utils';

/**
 * Scroll reveal — markup only. No client JavaScript.
 *
 * The observer that reveals these lives in the inline script in `layout.tsx`,
 * which runs while the HTML is still parsing. That matters: when the observer
 * lived in a `useEffect`, the hidden state was applied before first paint but
 * only lifted after the React bundle downloaded, parsed and hydrated — so on a
 * slow connection the page sat blank, and scrolling did nothing until
 * hydration finished seconds later.
 *
 * Decoupling the two means content reveals as soon as the browser parses it,
 * and this component ships zero bytes of JavaScript.
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
  return (
    <Tag
      className={cn('reveal', className)}
      style={{ '--reveal-delay': `${Math.round(delay * 1000)}ms` } as CSSProperties}
    >
      {children}
    </Tag>
  );
}
