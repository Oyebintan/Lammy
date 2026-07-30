import { GitCommitHorizontal } from 'lucide-react';
import { Badge, Section, SectionHeading, Surface } from '@/components/ui/primitives';
import { Reveal } from '@/components/motion/reveal';
import { activity, formatDate } from '@/lib/projects';
import { site } from '../../../config/site.config';

/** Last 26 weeks of commit days, oldest first. */
function contributionWeeks() {
  const days: Array<{ date: string; count: number }> = [];
  const today = new Date();
  today.setUTCHours(0, 0, 0, 0);
  const start = new Date(today);
  start.setUTCDate(start.getUTCDate() - 26 * 7 + 1);
  // Align to Sunday so columns read as calendar weeks.
  start.setUTCDate(start.getUTCDate() - start.getUTCDay());

  for (let d = new Date(start); d <= today; d.setUTCDate(d.getUTCDate() + 1)) {
    const iso = d.toISOString().slice(0, 10);
    days.push({ date: iso, count: activity.contributions[iso] ?? 0 });
  }

  const weeks: Array<Array<{ date: string; count: number }>> = [];
  for (let i = 0; i < days.length; i += 7) weeks.push(days.slice(i, i + 7));
  return weeks;
}

const level = (count: number) => {
  if (count === 0) return 0;
  if (count <= 2) return 1;
  if (count <= 5) return 2;
  if (count <= 10) return 3;
  return 4;
};

const LEVEL_BG = [
  'oklch(0.14 0.003 265)',
  'oklch(0.3 0.06 162)',
  'oklch(0.45 0.1 162)',
  'oklch(0.6 0.13 162)',
  'oklch(0.76 0.16 162)',
];

export function GithubActivity() {
  const weeks = contributionWeeks();
  const total = Object.values(activity.contributions).reduce((a, b) => a + b, 0);

  return (
    <Section id="activity" className="border-t border-border-hair">
      <Reveal>
        <SectionHeading
          eyebrow="GitHub activity"
          title="What I've been building"
          description={`${total.toLocaleString('en-US')} commits indexed across the repositories on this page.`}
        />
      </Reveal>

      <div className="mt-14 grid gap-4 lg:grid-cols-[1.35fr_1fr]">
        {/* Contribution strip.
            `min-w-0` is load-bearing: a grid item defaults to min-width:auto, so
            without it the strip's min-content width grows the column instead of
            letting `overflow-x-auto` scroll — which pushed the whole document
            wider than the viewport and made iOS zoom the page out. */}
        <Reveal className="min-w-0">
          <Surface tone="card" className="flex h-full min-w-0 flex-col gap-5 p-6 sm:p-7">
            <div className="flex items-baseline justify-between gap-4">
              <h3 className="text-sm font-medium text-fg">Last 26 weeks</h3>
              <a
                href={site.socials.github}
                target="_blank"
                rel="noreferrer noopener"
                className="font-mono text-xs text-fg-faint transition-colors hover:text-fg-muted"
              >
                @Oyebintan
              </a>
            </div>

            <div className="overflow-x-auto pb-1">
              <div className="flex min-w-fit gap-[3px]">
                {weeks.map((week) => (
                  <div key={week[0].date} className="flex flex-col gap-[3px]">
                    {week.map((day) => (
                      <span
                        key={day.date}
                        title={`${day.count} ${day.count === 1 ? 'commit' : 'commits'} on ${day.date}`}
                        className="size-[11px] rounded-[2px] transition-transform hover:scale-125"
                        style={{ background: LEVEL_BG[level(day.count)] }}
                      />
                    ))}
                  </div>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 text-[0.6875rem] text-fg-faint">
              <span>Less</span>
              {LEVEL_BG.map((bg) => (
                <span key={bg} className="size-[11px] rounded-[2px]" style={{ background: bg }} />
              ))}
              <span>More</span>
            </div>

            {/* Technology breakdown */}
            <div className="mt-1 flex flex-col gap-3 border-t border-border-hair pt-5">
              <h4 className="text-sm font-medium text-fg">Technology breakdown</h4>
              <div className="flex h-2 w-full overflow-hidden rounded-full bg-bg-1">
                {activity.languages.slice(0, 6).map((lang, i) => (
                  <span
                    key={lang.name}
                    style={{
                      width: `${Math.max(lang.share * 100, 0.6)}%`,
                      background: `oklch(${0.78 - i * 0.09} ${0.15 - i * 0.018} ${162 + i * 34})`,
                    }}
                    title={`${lang.name} — ${(lang.share * 100).toFixed(1)}%`}
                  />
                ))}
              </div>
              <div className="flex flex-wrap gap-x-4 gap-y-1.5">
                {activity.languages.slice(0, 6).map((lang, i) => (
                  <span key={lang.name} className="inline-flex items-center gap-1.5 text-xs text-fg-subtle">
                    <span
                      className="size-2 rounded-full"
                      style={{ background: `oklch(${0.78 - i * 0.09} ${0.15 - i * 0.018} ${162 + i * 34})` }}
                    />
                    {lang.name}
                    <span className="font-mono text-fg-faint">{(lang.share * 100).toFixed(1)}%</span>
                  </span>
                ))}
              </div>
            </div>
          </Surface>
        </Reveal>

        {/* Recent commits */}
        <Reveal delay={0.08} className="min-w-0">
          <Surface tone="card" className="flex h-full min-w-0 flex-col gap-4 p-6 sm:p-7">
            <h3 className="text-sm font-medium text-fg">Recent commits</h3>
            <ul className="flex flex-col divide-y divide-[var(--border)]">
              {activity.recentCommits.slice(0, 7).map((c) => (
                <li key={c.sha}>
                  <a
                    href={c.url}
                    target="_blank"
                    rel="noreferrer noopener"
                    className="group flex gap-3 py-3 transition-opacity hover:opacity-100"
                  >
                    <GitCommitHorizontal className="mt-0.5 size-4 shrink-0 text-fg-faint transition-colors group-hover:text-emerald-400" />
                    <div className="flex min-w-0 flex-col gap-1">
                      <p className="truncate text-sm text-fg-muted transition-colors group-hover:text-fg">
                        {c.message}
                      </p>
                      <div className="flex items-center gap-2">
                        <Badge size="sm" variant="outline" className="font-mono">
                          {c.repo}
                        </Badge>
                        <span className="font-mono text-[0.6875rem] text-fg-faint">
                          {formatDate(c.date)}
                        </span>
                      </div>
                    </div>
                  </a>
                </li>
              ))}
            </ul>
          </Surface>
        </Reveal>
      </div>
    </Section>
  );
}
