import { ImageResponse } from 'next/og';
import { FG, FG_MUTED, OG_CONTENT_TYPE, OG_SIZE, OgFooter, OgFrame, accentHex, ogFonts } from '@/lib/og';
import { getProject, projectSlugs } from '@/lib/projects';
import { prettyUrl } from '@/lib/utils';
import { site } from '../../../../config/site.config';

export const alt = 'Case study';
export const size = OG_SIZE;
export const contentType = OG_CONTENT_TYPE;

/* Without this the route is generated on demand, which would be the only
   dynamic thing on an otherwise fully prerendered site. */
export function generateStaticParams() {
  return projectSlugs().map((slug) => ({ slug }));
}

export default async function Image({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const project = getProject(slug);

  if (!project) {
    return new ImageResponse(
      (
        <OgFrame accent={accentHex('sky')} eyebrow="Case study">
          <div style={{ display: 'flex', fontSize: 72, fontWeight: 600, color: FG }}>
            Not shipped
          </div>
          <OgFooter left="" right={site.url.replace(/^https?:\/\//, '')} />
        </OgFrame>
      ),
      { ...size, fonts: await ogFonts() },
    );
  }

  const accent = accentHex(project.accent);
  const tech = project.caseStudy.technologies.value.slice(0, 4);

  return new ImageResponse(
    (
      <OgFrame accent={accent} eyebrow="Case study">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 22 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ display: 'flex', width: 12, height: 12, borderRadius: 9999, background: accent }} />
            <div
              style={{
                display: 'flex',
                fontFamily: 'GeistMono',
                fontSize: 20,
                letterSpacing: 2,
                color: accent,
              }}
            >
              {project.status.toUpperCase()}
            </div>
          </div>

          <div
            style={{
              display: 'flex',
              fontSize: project.name.length > 22 ? 76 : 92,
              fontWeight: 600,
              letterSpacing: -3,
              lineHeight: 1.02,
              color: FG,
            }}
          >
            {project.name}
          </div>

          {/* Two lines at most. Taglines come from the manifest and vary in
              length, so this is clamped rather than trusted to fit. */}
          <div
            style={{
              display: 'flex',
              maxWidth: 940,
              fontSize: 30,
              lineHeight: 1.4,
              color: FG_MUTED,
            }}
          >
            {project.tagline.length > 128
              ? `${project.tagline.slice(0, 125).trimEnd()}…`
              : project.tagline}
          </div>

          {tech.length > 0 ? (
            <div style={{ display: 'flex', gap: 10, marginTop: 6 }}>
              {tech.map((t) => (
                <div
                  key={t}
                  style={{
                    display: 'flex',
                    border: '1px solid #ffffff26',
                    borderRadius: 9999,
                    padding: '8px 18px',
                    fontFamily: 'GeistMono',
                    fontSize: 19,
                    color: FG_MUTED,
                  }}
                >
                  {t}
                </div>
              ))}
            </div>
          ) : null}
        </div>

        <OgFooter
          left={project.liveUrl ? prettyUrl(project.liveUrl) : project.primaryRepo.name}
          right={`/work/${project.slug}`}
        />
      </OgFrame>
    ),
    { ...size, fonts: await ogFonts() },
  );
}
