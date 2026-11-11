import type { MetadataRoute } from 'next'

// Static file generated at build time. Keeps crawlers off the API and the giveaway tool.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/', disallow: ['/api/', '/cekilis'] }],
  }
}
