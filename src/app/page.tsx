import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Hero } from '@/components/sections/hero';
import { Philosophy } from '@/components/sections/philosophy';
import { Timeline } from '@/components/sections/timeline';
import { GithubActivity } from '@/components/sections/github-activity';
import { Skills } from '@/components/sections/skills';
import { Contact } from '@/components/sections/contact';
import { ProjectCard } from '@/components/project/project-card';
import { Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/motion';
import { featuredProjects, projects } from '@/lib/projects';
import { site } from '../../config/site.config';

/* Every route is prerendered. If a change ever introduces a runtime data
   dependency, this turns it into a build failure instead of a silent
   downgrade to server rendering. */
export const dynamic = 'error';

const [lead, ...restFeatured] = featuredProjects;
const gallery = projects.filter((p) => !p.featured);

export default function HomePage() {
  const jsonLd = {
    '@context': 'https://schema.org',
    '@graph': [
      {
        '@type': 'Person',
        '@id': `${site.url}/#person`,
        name: site.legalName,
        alternateName: site.name,
        url: site.url,
        jobTitle: site.role,
        email: `mailto:${site.email}`,
        sameAs: [site.socials.github, site.socials.twitter],
      },
      {
        '@type': 'WebSite',
        '@id': `${site.url}/#website`,
        url: site.url,
        name: site.name,
        description: site.description,
        publisher: { '@id': `${site.url}/#person` },
      },
    ],
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, '\\u003c') }}
      />

      <Hero />

      <Section id="featured" className="border-t border-border-hair">
        <Reveal>
          <SectionHeading
            eyebrow="Featured work"
            title="Products, start to finish"
            description="Each one opens into a case study built from its own repository — the problem, the architecture, and the parts that fought back."
          />
        </Reveal>

        <div className="mt-14 flex flex-col gap-4">
          {lead ? (
            <Reveal>
              <ProjectCard project={lead} featured priority />
            </Reveal>
          ) : null}

          <div className="grid gap-4 md:grid-cols-2">
            {restFeatured.map((project, i) => (
              <Reveal key={project.slug} delay={i * 0.06}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>
        </div>
      </Section>

      {gallery.length > 0 ? (
        <Section id="gallery" className="border-t border-border-hair">
          <Reveal>
            <SectionHeading
              eyebrow="Project gallery"
              title="Everything else on the shelf"
              description="Smaller builds, experiments and one-offs — still shipped, still documented."
            />
          </Reveal>

          <div className="mt-14 grid gap-4 md:grid-cols-2">
            {gallery.map((project, i) => (
              <Reveal key={project.slug} delay={i * 0.06}>
                <ProjectCard project={project} />
              </Reveal>
            ))}
          </div>

          <Reveal>
            <Link
              href="/work"
              className="mt-10 inline-flex items-center gap-1.5 text-sm font-medium text-fg-muted transition-colors hover:text-fg"
            >
              Browse all {projects.length} projects
              <ArrowUpRight className="size-4" />
            </Link>
          </Reveal>
        </Section>
      ) : null}

      <Philosophy />
      <Timeline />
      <GithubActivity />
      <Skills />
      <Contact />
    </>
  );
}
