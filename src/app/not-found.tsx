import { ButtonLink } from '@/components/ui/primitives';

export default function NotFound() {
  return (
    <div className="grain relative flex min-h-[70svh] items-center justify-center overflow-hidden px-5 py-32">
      <div
        className="spotlight left-1/2 top-1/2 h-[26rem] w-[38rem] -translate-x-1/2 -translate-y-1/2"
        style={{ background: 'radial-gradient(circle, oklch(0.5 0.13 265 / 0.32), transparent 70%)' }}
        aria-hidden
      />
      <div className="relative flex flex-col items-center gap-6 text-center">
        <span className="font-mono text-xs uppercase tracking-[0.2em] text-fg-faint">404</span>
        <h1 className="max-w-lg text-balance text-h1 font-semibold tracking-tight text-fg">
          This one was never shipped.
        </h1>
        <p className="max-w-md text-pretty text-fg-muted">
          The page you are looking for does not exist. Everything that does is on the work page.
        </p>
        <div className="mt-2 flex flex-wrap justify-center gap-3">
          <ButtonLink href="/work">See the work</ButtonLink>
          <ButtonLink href="/" variant="secondary">Back home</ButtonLink>
        </div>
      </div>
    </div>
  );
}
