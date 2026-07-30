import type { Metadata } from 'next';
import { ProjectCard } from '@/components/project/project-card';
import { EmptyState, Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { projects } from '@/lib/projects';
import { site } from '../../../config/site.config';

export const dynamic = 'error';

export const metadata: Metadata = {
  title: 'Work',
  description:
    'Every product indexed from my GitHub and Vercel accounts — live deployments, case studies and the commit history behind each one.',
  alternates: { canonical: '/work' },
};

export default function WorkPage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@type': 'ItemList',
    name: 'Projects',
    itemListElement: projects.map((p, i) => ({
      '@type': 'ListItem',
      position: i + 1,
      name: p.name,
      url: `${site.url}/work/${p.slug}`,
    })),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Section className="pt-36">
        <Reveal immediate>
          <SectionHeading
            eyebrow={`${projects.length} projects`}
            title="Everything I've shipped"
            description="Discovered automatically, screenshotted from production, and documented from the repositories themselves."
          />
        </Reveal>

        {projects.length === 0 ? (
          <div className="mt-14">
            <EmptyState
              title="No projects indexed yet"
              description="The discovery job has not produced a manifest. It runs nightly and on demand."
            />
          </div>
        ) : (
          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {projects.map((project, i) => (
              /* The first two cards are on screen when the page opens, so they
                 animate on load rather than on intersection — a card fading up
                 from nothing is also a card the browser will not count as
                 painted, which delayed the largest paint by the length of the
                 animation. */
              <Reveal
                key={project.slug}
                immediate={i < 2}
                delay={Math.min(i, 5) * 0.05}
              >
                <ProjectCard project={project} priority={i < 2} />
              </Reveal>
            ))}
          </div>
        )}
      </Section>
    </>
  );
}
