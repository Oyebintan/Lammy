import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
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
 *
 * Pass `immediate` for anything already on screen when the page opens. Those
 * elements have nothing to wait for — gating them on an intersection callback
 * put the page's own heading behind a main-thread task that competes with
 * script evaluation, which measurably pushed out the largest paint. They
 * animate on load instead, the same way the home page hero does.
 */
export function Reveal({
  children,
  delay = 0,
  className,
  immediate = false,
  as: Tag = 'div',
  ...rest
}: {
  children: ReactNode;
  delay?: number;
  className?: string;
  immediate?: boolean;
  as?: 'div' | 'li' | 'section';
} & Pick<HTMLAttributes<HTMLElement>, 'id'> & { 'data-project'?: string }) {
  return (
    <Tag
      {...rest}
      className={cn(immediate ? 'hero-in' : 'reveal', className)}
      style={
        {
          [immediate ? '--hero-delay' : '--reveal-delay']: `${Math.round(delay * 1000)}ms`,
        } as CSSProperties
      }
    >
      {children}
    </Tag>
  );
}
