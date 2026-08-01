import { ImageResponse } from 'next/og';
import { FG, FG_MUTED, OG_CONTENT_TYPE, OG_SIZE, OgFooter, OgFrame, accentHex, ogFonts } from '@/lib/og';
import { activity, projects } from '@/lib/projects';
import { site } from '../../config/site.config';

export const alt = `${site.name} — ${site.role}`;
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/**
 * The card every link to the site root renders as.
 *
 * The counts come from the same manifest the page does, so a shared link
 * carries the real numbers rather than a static claim that goes stale.
 */
export default async function Image() {
  const accent = accentHex('sky');
  const live = projects.filter((p) => p.status === 'live').length;

  const stats: Array<[string, string]> = [
    [String(activity.totals.projectsShipped), 'shipped'],
    [String(live), 'live'],
    [String(activity.totals.repositories), 'repos'],
  ];

  return new ImageResponse(
    (
      <OgFrame accent={accent} eyebrow={site.role}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 26 }}>
          <div
            style={{
              display: 'flex',
              flexDirection: 'column',
              fontSize: 84,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1.03,
              color: FG,
            }}
          >
            <div style={{ display: 'flex' }}>I build products,</div>
            <div style={{ display: 'flex', color: FG_MUTED }}>not prototypes.</div>
          </div>

          <div style={{ display: 'flex', gap: 44 }}>
            {stats.map(([value, label]) => (
              <div key={label} style={{ display: 'flex', alignItems: 'baseline', gap: 10 }}>
                <div style={{ display: 'flex', fontSize: 44, fontWeight: 600, color: FG }}>
                  {value}
                </div>
                <div
                  style={{
                    display: 'flex',
                    fontFamily: 'GeistMono',
                    fontSize: 20,
                    letterSpacing: 1.5,
                    color: FG_MUTED,
                  }}
                >
                  {label.toUpperCase()}
                </div>
              </div>
            ))}
          </div>
        </div>

        <OgFooter left="Discovered, screenshotted and documented automatically" right={site.url.replace(/^https?:\/\//, '')} />
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
