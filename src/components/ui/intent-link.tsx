'use client';

import Link from 'next/link';
import { useState } from 'react';
import type { ComponentProps } from 'react';

/**
 * A `Link` that prefetches on intent rather than on visibility.
 *
 * Next.js prefetches every link that scrolls into view. That is the right
 * default for a handful of links, and the wrong one for this site: the ship
 * log renders one link per event, several of which point at the same project,
 * and each prefetch is a separate request whose cache key differs — one page
 * fired thirty-plus RSC requests and pulled down six screenshots for a page
 * that displays no images at all, competing with the fonts for bandwidth on a
 * phone.
 *
 * Waiting for hover, focus or the start of a tap costs nothing perceptible —
 * the payload is small and arrives well before the click completes — and on a
 * list nobody clicks through exhaustively it saves almost all of the traffic.
 *
 * `prefetch={null}` is Next's documented "resume default prefetching" value.
 */
export function IntentLink({
  children,
  ...props
}: Omit<ComponentProps<typeof Link>, 'prefetch'>) {
  const [armed, setArmed] = useState(false);
  const arm = () => setArmed(true);

  return (
    <Link
      {...props}
      prefetch={armed ? null : false}
      onMouseEnter={arm}
      onFocus={arm}
      onTouchStart={arm}
    >
      {children}
    </Link>
  );
}
