import Link from 'next/link';
import { site } from '../../../config/site.config';
import { generatedAt } from '@/lib/projects';
import { formatDate } from '@/lib/projects';

export function Footer() {
  return (
    <footer className="relative mt-auto border-t border-border-hair px-5 py-14 sm:px-8">
      <div className="mx-auto flex w-full max-w-6xl flex-col gap-10">
        <div className="flex flex-col justify-between gap-8 sm:flex-row">
          <div className="flex flex-col gap-2">
            <span className="text-sm font-semibold text-fg">{site.name}</span>
            <span className="text-sm text-fg-subtle">{site.role}</span>
          </div>

          <nav aria-label="Footer" className="flex flex-wrap gap-x-8 gap-y-3">
            <div className="flex flex-col gap-2.5">
              {site.nav.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="text-sm text-fg-subtle transition-colors hover:text-fg"
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex flex-col gap-2.5">
              <a
                href={site.socials.github}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-fg-subtle transition-colors hover:text-fg"
              >
                GitHub
              </a>
              <a
                href={site.socials.twitter}
                target="_blank"
                rel="noreferrer noopener"
                className="text-sm text-fg-subtle transition-colors hover:text-fg"
              >
                X
              </a>
              <a
                href={`mailto:${site.email}`}
                className="text-sm text-fg-subtle transition-colors hover:text-fg"
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
