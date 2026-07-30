'use client';

import { useEffect } from 'react';
import { Button, ButtonLink } from '@/components/ui/primitives';

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[70svh] items-center justify-center px-5 py-32">
      <div className="flex flex-col items-center gap-6 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">Error</span>
        <h1 className="max-w-lg text-balance text-h1 font-semibold tracking-tight text-fg">
          Something broke on our end.
        </h1>
        <p className="max-w-md text-pretty text-fg-muted">
          That is on me, not you. Try again — and if it keeps happening, the repositories are still
          on GitHub.
        </p>
        {error.digest ? (
          <code className="rounded-md border border-border-hair bg-bg-2 px-3 py-1.5 font-mono text-xs text-fg-faint">
            {error.digest}
          </code>
        ) : null}
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <Button onClick={reset}>Try again</Button>
          <ButtonLink href="/" variant="secondary">Back home</ButtonLink>
        </div>
      </div>
    </div>
  );
}
