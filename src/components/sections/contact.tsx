import { ArrowUpRight, Mail } from 'lucide-react';
import { GithubMark } from '@/components/ui/icons';
import { Section, Surface } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { site } from '../../../config/site.config';

const CHANNELS = [
  { label: 'Email', value: site.email, href: `mailto:${site.email}`, icon: Mail },
  { label: 'GitHub', value: '@Oyebintan', href: site.socials.github, icon: GithubMark },
  { label: 'X', value: site.twitterHandle, href: site.socials.twitter, icon: ArrowUpRight },
];

export function Contact() {
  return (
    <Section id="contact" className="border-t border-border-hair">
      <Surface tone="card" radius="xl" className="grain relative overflow-hidden">
        <div
          className="spotlight left-1/2 top-0 h-[24rem] w-[40rem] -translate-x-1/2 -translate-y-1/2"
          style={{ background: 'radial-gradient(circle, oklch(0.55 0.14 265 / 0.42), transparent 70%)' }}
          aria-hidden
        />
        <div className="relative flex flex-col items-center gap-8 px-6 py-20 text-center sm:px-12">
          <Reveal>
            <h2 className="max-w-2xl text-balance text-h1 font-semibold tracking-tight text-fg">
              Got something worth building?
            </h2>
          </Reveal>
          <Reveal delay={0.06}>
            <p className="max-w-lg text-pretty text-lead text-fg-muted">
              I&rsquo;m open to product work, design engineering, and the kind of problem that
              doesn&rsquo;t have an obvious answer yet.
            </p>
          </Reveal>

          <Reveal delay={0.12}>
            <div className="flex flex-wrap justify-center gap-3">
              {CHANNELS.map((c) => (
                <a
                  key={c.label}
                  href={c.href}
                  {...(c.href.startsWith('mailto:')
                    ? {}
                    : { target: '_blank', rel: 'noreferrer noopener' })}
                  className="group inline-flex items-center gap-2.5 rounded-full border border-border-hair bg-bg-2/70 px-5 py-3 text-sm transition-all duration-200 hover:-translate-y-px hover:border-border-strong hover:bg-bg-3"
                >
                  <c.icon className="size-4 text-fg-faint transition-colors group-hover:text-fg" />
                  <span className="text-fg-muted transition-colors group-hover:text-fg">
                    {c.value}
                  </span>
                </a>
              ))}
            </div>
          </Reveal>
        </div>
      </Surface>
    </Section>
  );
}
