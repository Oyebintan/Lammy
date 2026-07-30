import type { MetadataRoute } from 'next';
import { site } from '../../config/site.config';

export const dynamic = 'error';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: { userAgent: '*', allow: '/' },
    sitemap: `${site.url}/sitemap.xml`,
    host: site.url,
  };
}
