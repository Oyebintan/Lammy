import { Badge, Section, SectionHeading } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { allTechnologies } from '@/lib/projects';

/**
 * Skills are not a wish list — every entry below is collected from the
 * technologies actually cited in a case study or detected in a repository's
 * language breakdown, then bucketed.
 */
const BUCKETS: Array<{ title: string; match: string[] }> = [
  {
    title: 'Languages',
    match: ['TypeScript', 'JavaScript', 'Python', 'HTML', 'CSS'],
  },
  {
    title: 'Frameworks & UI',
    match: [
      'Next.js 16', 'React 19', 'React Native', 'Expo',
      'Tailwind CSS v4', 'Radix UI', 'Framer Motion', 'Bootstrap 5',
      'Vite', 'Jinja2', 'Flask',
    ],
  },
  {
    title: 'Data & ML',
    match: [
      'TensorFlow', 'Keras', 'TensorFlow Lite', 'scikit-learn', 'pandas', 'NumPy',
      'PostgreSQL', 'SQLAlchemy', 'Supabase',
    ],
  },
  {
    title: 'Platform & tooling',
    match: [
      'Docker', 'Gunicorn', 'NextAuth', 'Google OAuth', 'Anthropic API', 'jsPDF', 'pytest',
    ],
  },
];

/* Canonicalisation and the not-a-skill filter live in `lib/projects` so the
   hero's marquee ribbon draws on exactly the same list — it had drifted and
   was showing the duplicates this section used to. */
const used = new Set(allTechnologies(true));

const groups = BUCKETS.map((bucket) => ({
  title: bucket.title,
  items: bucket.match.filter((m) => used.has(m)),
})).filter((g) => g.items.length > 0);

export function Skills() {
  return (
    <Section id="skills" className="border-t border-border-hair">
      <Reveal>
        <SectionHeading
          eyebrow="Skills"
          title="The stack behind the work"
          description="Collected from what these projects actually use, not from a list of things I've read about."
        />
      </Reveal>

      <div className="mt-14 grid gap-x-8 gap-y-10 sm:grid-cols-2 lg:grid-cols-4">
        {groups.map((group, i) => (
          <Reveal key={group.title} delay={i * 0.06}>
            <div className="flex flex-col gap-4">
              <h3 className="font-mono text-xs uppercase tracking-[0.16em] text-fg-faint">
                {group.title}
              </h3>
              <ul className="flex flex-wrap gap-1.5">
                {group.items.map((item) => (
                  <li key={item}>
                    <Badge variant="default">{item}</Badge>
                  </li>
                ))}
              </ul>
            </div>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
