import { projects, activity } from '@/lib/projects';
import { site } from '../../../config/site.config';
import type { ChatTurn } from './guard';

/**
 * Zero-cost fallback used when no model provider is configured.
 *
 * This is a lookup over the same manifest the pages render — not a language
 * model, and it does not pretend to be one. It answers the questions a visitor
 * actually asks a portfolio ("what has he built", "what's the stack", "how do I
 * get in touch") from real data, and says plainly when a question is beyond it
 * rather than guessing. The site is therefore useful with no key, no signup and
 * no bill; configuring a provider upgrades it rather than switching it on.
 */
const norm = (s: string) => s.toLowerCase().replace(/[^a-z0-9\s]/g, ' ');

function matchProject(question: string) {
  const q = norm(question);
  return projects.find((p) => {
    const names = [p.name, p.slug, ...p.repos.map((r) => r.name)].map(norm);
    if (names.some((n) => q.includes(n) || n.split(/\s+/).every((w) => w.length > 3 && q.includes(w))))
      return true;
    return p.caseStudy.technologies.value.some((t) => t.length > 4 && q.includes(norm(t)));
  });
}

export function localAnswer(turns: ChatTurn[]): string {
  const question = turns[turns.length - 1]?.content ?? '';
  const q = norm(question);

  const project = matchProject(question);
  if (project) {
    const cs = project.caseStudy;
    const parts = [`${project.name} — ${project.tagline}`];
    if (cs.problem) parts.push(cs.problem.value);
    if (cs.solution) parts.push(cs.solution.value);
    parts.push(`Built with ${cs.technologies.value.slice(0, 6).join(', ')}.`);
    if (project.liveUrl) parts.push(`Live: ${project.liveUrl}`);
    parts.push(`Full case study: ${site.url}/work/${project.slug}`);
    return parts.join('\n\n');
  }

  if (/(contact|email|hire|reach|available|work with|get in touch)/.test(q)) {
    return `Reach ${site.name} at ${site.email}, or on GitHub at ${site.socials.github}.`;
  }

  if (/(stack|tech|technolog|language|skill|tool)/.test(q)) {
    const langs = activity.languages.slice(0, 5).map((l) => l.name).join(', ');
    const tech = [...new Set(projects.flatMap((p) => p.caseStudy.technologies.value))].slice(0, 12);
    return `Across ${activity.totals.repositories} repositories the breakdown is ${langs}.\n\nThe projects here use ${tech.join(', ')}.\n\nFull list: ${site.url}/#skills`;
  }

  if (/(project|portfolio|built|build|shipped|ship|made|app|apps|site|sites|work|works)/.test(q)) {
    const lines = projects
      .map((p) => `· ${p.name} — ${p.tagline}${p.liveUrl ? `\n  ${p.liveUrl}` : ''}`)
      .join('\n');
    return `${activity.totals.projectsShipped} shipped projects, ${activity.totals.deployments} of them live:\n\n${lines}\n\nEach one has a full case study at ${site.url}/work.`;
  }

  return `I can only look things up in this site's project data right now, and I couldn't match that to anything.\n\nTry asking about a specific project — ${projects
    .slice(0, 3)
    .map((p) => p.name)
    .join(', ')} — or about the stack. For anything else, ${site.email} reaches ${site.name} directly.`;
}
