const path = require('node:path')
const { pathToFileURL } = require('node:url')

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Old addresses (title + 8-character id, root aliases) redirect permanently to the new ones; the list comes from lib/redirects.ts.
  async redirects() {
    const { registerTs } = await import(pathToFileURL(path.join(__dirname, 'scripts', 'register-ts.mjs')).href)
    registerTs()
    const { getRedirects } = await import(pathToFileURL(path.join(__dirname, 'lib', 'redirects.ts')).href)
    const redirects = getRedirects(__dirname)
    console.log(`Redirects: ${redirects.length} permanent redirects from old URLs`)
    // The removed giveaway tool.
    return [...redirects, { source: '/cekilis', destination: '/', permanent: true }]
  },
  experimental: {
    cpus: 2,
    staticGenerationMaxConcurrency: 2,
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.amazonaws.com',
      },
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
      },
      {
        protocol: 'https',
        hostname: '**.imgur.com',
      },
    ],
  },
}

module.exports = nextConfig
