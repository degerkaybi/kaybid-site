import type { MetadataRoute } from 'next'

// Static file generated at build time.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: '*', allow: '/' }],
  }
}
