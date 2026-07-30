import { Compass, GitCommitHorizontal, Layers, Rocket } from 'lucide-react';
import { Section, SectionHeading, Surface } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';

/**
 * Written in first person and tied to things that actually happened in these
 * repos, because a philosophy section that could belong to anyone is worth
 * nothing.
 */
const PRINCIPLES = [
  {
    icon: Compass,
    title: 'Design is a decision, not a coat of paint',
    body: 'A hero image on the art site went through four passes before it read as lying on a floor instead of floating as a tilted card. Nobody would have filed a bug for it. It was still wrong, and wrong is worth fixing.',
  },
  {
    icon: Layers,
    title: 'Build the boring layer properly',
    body: 'BrandForge runs with zero environment variables — the AI provider sits behind an interface with a deterministic fallback. Guest mode is not a demo mode; it is the same product with a different backend.',
  },
  {
    icon: Rocket,
    title: 'Shipped beats impressive',
    body: 'The spam classifier hit 98.49% accuracy months before it was usable. The real work was the memory ceiling: pinning a runtime, downgrading a framework, then swapping to TensorFlow Lite so it fit on the host at all.',
  },
  {
    icon: GitCommitHorizontal,
    title: 'Go back and read your own code',
    body: 'An audit pass on SIWES Finder found the mobile sign-in path doing a case-sensitive lookup where the web used a shared helper — a quiet duplicate-account bug nobody had reported yet. Audits find what testing does not.',
  },
];

export function Philosophy() {
  return (
    <Section id="philosophy" className="border-t border-border-hair">
      <Reveal>
        <SectionHeading
          eyebrow="Build philosophy"
          title="How I actually work"
          description="Four habits that show up across every repository on this page."
        />
      </Reveal>

      <div className="mt-14 grid gap-4 md:grid-cols-2">
        {PRINCIPLES.map((p, i) => (
          <Reveal key={p.title} delay={i * 0.07}>
            <Surface
              tone="card"
              className="group h-full p-7 transition-colors duration-300 hover:border-border-strong"
            >
              <p.icon className="size-5 text-fg-faint transition-colors duration-300 group-hover:text-fg-muted" />
              <h3 className="mt-5 text-h3 font-medium tracking-tight text-fg">{p.title}</h3>
              <p className="mt-3 text-pretty text-sm leading-relaxed text-fg-muted">{p.body}</p>
            </Surface>
          </Reveal>
        ))}
      </div>
    </Section>
  );
}
