import type { MetadataRoute } from 'next';
import { projects, generatedAt } from '@/lib/projects';
import { site } from '../../config/site.config';

export const dynamic = 'error';

export default function sitemap(): MetadataRoute.Sitemap {
  const lastModified = new Date(generatedAt);

  return [
    { url: site.url, lastModified, changeFrequency: 'weekly', priority: 1 },
    { url: `${site.url}/work`, lastModified, changeFrequency: 'weekly', priority: 0.9 },
    { url: `${site.url}/ship-log`, lastModified, changeFrequency: 'daily', priority: 0.7 },
    ...projects.map((p) => ({
      url: `${site.url}/work/${p.slug}`,
      lastModified: new Date(p.primaryRepo.pushedAt),
      changeFrequency: 'monthly' as const,
      priority: p.featured ? 0.8 : 0.6,
    })),
  ];
}
