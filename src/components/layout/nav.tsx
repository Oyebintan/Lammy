'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { site } from '../../../config/site.config';
import { cn } from '@/lib/utils';

export function Nav() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 12);
    onScroll();
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  useEffect(() => {
    document.body.style.overflow = open ? 'hidden' : '';
    return () => {
      document.body.style.overflow = '';
    };
  }, [open]);

  return (
    <header className="fixed inset-x-0 top-0 z-50 px-4 pt-4">
      <nav
        aria-label="Primary"
        className={cn(
          'mx-auto flex h-14 w-full max-w-5xl items-center justify-between rounded-full px-4 pl-5 transition-all duration-300',
          scrolled ? 'glass' : 'border border-transparent',
        )}
      >
        <Link
          href="/"
          className="group flex items-center gap-2.5 text-sm font-semibold tracking-tight"
        >
          <span className="grid size-6 place-items-center rounded-md bg-fg text-[0.7rem] font-bold text-bg-0">
            L
          </span>
          <span className="text-fg">{site.name}</span>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                'rounded-full px-3.5 py-2 text-sm transition-colors',
                pathname === item.href
                  ? 'text-fg'
                  : 'text-fg-muted hover:bg-bg-2 hover:text-fg',
              )}
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.socials.github}
            target="_blank"
            rel="noreferrer noopener"
            className="ml-2 rounded-full bg-fg px-4 py-2 text-sm font-medium text-bg-0 transition-opacity hover:opacity-90"
          >
            GitHub
          </a>
        </div>

        <button
          type="button"
          onClick={() => setOpen((v) => !v)}
          className="grid size-9 place-items-center rounded-full text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg md:hidden"
          aria-expanded={open}
          aria-controls="mobile-nav"
          aria-label={open ? 'Close menu' : 'Open menu'}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      {open ? (
        <div
          id="mobile-nav"
          className="glass mx-auto mt-2 flex max-w-5xl flex-col gap-1 rounded-3xl p-3 md:hidden"
        >
          {site.nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setOpen(false)}
              className="rounded-2xl px-4 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg"
            >
              {item.label}
            </Link>
          ))}
          <a
            href={site.socials.github}
            target="_blank"
            rel="noreferrer noopener"
            onClick={() => setOpen(false)}
            className="rounded-2xl px-4 py-3 text-sm text-fg-muted transition-colors hover:bg-bg-2 hover:text-fg"
          >
            GitHub
          </a>
        </div>
      ) : null}
    </header>
  );
}
