import Link from 'next/link';
import { site } from '../../../config/site.config';
import { generatedAt } from '@/lib/projects';
import { formatDate } from '@/lib/projects';

export function Footer() {
  return (
    // `pb-28` clears the fixed chat launcher, which otherwise sits on top of
    // the last-indexed line at every breakpoint.
    <footer className="relative mt-auto border-t border-border-hair px-5 pb-28 pt-14 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-fg">{site.name}</span>
            <span className="text-sm text-fg-subtle">{site.role}</span>
          </div>

          {/* `py-1.5` on every link, not decoration: these were 20px tall,
              under the 24px WCAG 2.2 minimum target size. axe does not test
              target size, so the accessibility gate passed them. */}
          <nav aria-label="Footer" className="flex flex-wrap gap-x-8">
            <div className="flex flex-col">
              {site.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="py-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col">
              <a
                href={site.socials.github}
                target="_blank"
                rel="noreferrer noopener"
                className="py-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
              >
                GitHub
              </a>
              <a
                href={site.socials.twitter}
                target="_blank"
                rel="noreferrer noopener"
                className="py-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
              >
                X
              </a>
              <a
                href={`mailto:${site.email}`}
                className="py-1.5 text-sm text-fg-subtle transition-colors hover:text-fg"
              >
                Email
              </a>
            </div>
          </nav>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t border-border-hair pt-6 sm:flex-row sm:items-center">
          <p className="font-mono text-xs text-fg-faint">
            © {new Date(generatedAt).getUTCFullYear()} {site.legalName}
          </p>
          <p className="font-mono text-xs text-fg-faint">
            Projects auto-discovered · last indexed {formatDate(generatedAt)}
          </p>
        </div>
      </div>
    </footer>
  );
}
