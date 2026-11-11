// Build guardrail: runs after `next build` (package.json "postbuild").
// Fails if any route is dynamic or uses revalidate/ISR, or if middleware/proxy exists. No dynamic routes are allowed.
// Reads the build manifests in .next/ (not the console output), so it does not depend on Next's log format.

import { existsSync, readFileSync } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const next = path.join(root, '.next')

const errors = []
const read = file => {
  const full = path.join(next, file)
  if (!existsSync(full)) {
    console.error(`FAIL: ${file} not found. Run "next build" first.`)
    process.exit(1)
  }
  return JSON.parse(readFileSync(full, 'utf8'))
}

// 1. Middleware / proxy files and build output
for (const dir of ['.', 'src']) {
  for (const name of ['middleware', 'proxy']) {
    for (const ext of ['ts', 'js', 'mts', 'mjs', 'tsx', 'jsx']) {
      const file = path.join(dir, `${name}.${ext}`)
      if (existsSync(path.join(root, file))) errors.push(`${file} exists. Middleware/proxy runs on every request and is not allowed.`)
    }
  }
}
const middleware = read('server/middleware-manifest.json')
if (Object.keys(middleware.middleware || {}).length || (middleware.sortedMiddleware || []).length) {
  errors.push('Build output contains middleware.')
}

// 2. Every app route must be prerendered, with no revalidate
const appRoutes = Object.values(read('app-path-routes-manifest.json'))
const prerender = read('prerender-manifest.json')
const prerendered = prerender.routes || {}
const dynamicRoutes = prerender.dynamicRoutes || {}

let staticPages = 0
for (const route of appRoutes) {
  const isDynamicSegment = /\[.+\]/.test(route)
  if (isDynamicSegment) {
    const entry = dynamicRoutes[route]
    if (!entry) errors.push(`${route} is dynamic: not prerendered at build time.`)
    else if (entry.fallback !== false) errors.push(`${route} renders unknown params at runtime (needs generateStaticParams and dynamicParams = false).`)
    else if (!Object.values(prerendered).some(r => r.srcRoute === route)) errors.push(`${route} has no prerendered paths.`)
  } else if (!prerendered[route]) {
    errors.push(`${route} is dynamic: server-rendered on demand.`)
  }
  staticPages++
}

for (const [route, entry] of Object.entries(prerendered)) {
  if (entry.initialRevalidateSeconds !== false) {
    errors.push(`${route} uses revalidate/ISR (revalidate: ${entry.initialRevalidateSeconds}).`)
  }
}

// 3. No functions at all (e.g. a route handler declaring maxDuration)
const configured = Object.keys(read('server/functions-config-manifest.json').functions || {})
for (const route of configured) {
  errors.push(`${route} is configured as a function.`)
}

if (errors.length) {
  console.error('FAIL: the build is not quota-safe:')
  for (const e of [...new Set(errors)].slice(0, 20)) console.error(`  - ${e}`)
  if (new Set(errors).size > 20) console.error(`  ... and ${new Set(errors).size - 20} more`)
  console.error('No dynamic routes are allowed. Remove force-dynamic, revalidate, cookies(), headers(), no-store, searchParams or middleware.')
  process.exit(1)
}

console.log(`OK: ${staticPages} static routes, 0 functions`)
