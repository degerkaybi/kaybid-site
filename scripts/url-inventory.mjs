// URL safety net for URL refactors.
//
//   node scripts/url-inventory.mjs snapshot   Collect every public URL from the current code -> url-inventory.json
//   node scripts/url-inventory.mjs check      Request every URL in url-inventory.json against a running
//                                             production server (default http://localhost:3000)
//
// snapshot builds nothing and starts no server. It loads lib/portfolio.ts through a tiny in-process TypeScript loader
// (the TypeScript compiler is already a devDependency) so the URLs come from the same data functions the pages
// use in generateStaticParams. The per-route logic below mirrors each page's generateStaticParams; if a route with a
// dynamic segment exists in app/ that is not handled here, snapshot fails instead of silently missing URLs.
//
// check passes a URL when it answers 200, or redirects (307/308, or a prerendered 200 page whose <meta refresh> points
// elsewhere, which is how Next serves redirect() in static pages) to a URL that answers 200. One hop at most.
// Environment: BASE_URL (default http://localhost:3000), CONCURRENCY (default 8).

import { readdir, readFile, writeFile } from 'node:fs/promises'
import { register } from 'node:module'
import path from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..')
const inventoryFile = path.join(root, 'url-inventory.json')
const baseUrl = (process.env.BASE_URL || 'http://localhost:3000').replace(/\/+$/, '')
const concurrency = Number(process.env.CONCURRENCY) || 8

// Static public URLs that must always be in the inventory, even if file discovery in app/ misses them.
const requiredStatic = [
  '/', '/about', '/about/exhibitions', '/about/press', '/contact', '/editions', '/editions/kaybid-x-m-c',
  '/editions/kaybid-x-upcycle', '/press', '/works', '/desktop', '/hello', '/cekilis', '/robots.txt',
]

// ---------------------------------------------------------------------------------------------------------------------
// TypeScript loader: resolves the "@/" alias and extensionless imports, transpiles .ts/.tsx, wraps .json as modules.
// ---------------------------------------------------------------------------------------------------------------------
function installLoader() {
  const hooks = `
    import { readFile, access } from 'node:fs/promises'
    import { createRequire } from 'node:module'
    import { fileURLToPath, pathToFileURL } from 'node:url'
    const root = ${JSON.stringify(root)}
    const ts = createRequire(root + '/package.json')('typescript')
    const exists = p => access(p).then(() => true, () => false)
    async function withExtension(file) {
      if (/\\.[a-z]+$/i.test(file) && await exists(file)) return file
      for (const ext of ['.ts', '.tsx', '.js', '.json']) if (await exists(file + ext)) return file + ext
      return null
    }
    export async function resolve(specifier, context, next) {
      let file = null
      if (specifier.startsWith('@/')) file = await withExtension(root + '/' + specifier.slice(2))
      else if ((specifier.startsWith('./') || specifier.startsWith('../')) && context.parentURL?.startsWith('file:')) {
        const base = fileURLToPath(new URL(specifier, context.parentURL))
        if (base.startsWith(root) && !base.includes('node_modules')) file = await withExtension(base)
      }
      if (file) return { url: pathToFileURL(file).href, shortCircuit: true }
      return next(specifier, context)
    }
    export async function load(url, context, next) {
      if (url.startsWith('file:') && !url.includes('/node_modules/')) {
        if (url.endsWith('.json')) {
          const text = await readFile(fileURLToPath(url), 'utf8')
          return { format: 'module', source: 'export default ' + text, shortCircuit: true }
        }
        if (/\\.tsx?$/.test(url)) {
          const text = await readFile(fileURLToPath(url), 'utf8')
          const out = ts.transpileModule(text, { fileName: url, compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } })
          return { format: 'module', source: out.outputText, shortCircuit: true }
        }
      }
      return next(url, context)
    }
  `
  register('data:text/javascript,' + encodeURIComponent(hooks), import.meta.url)
}

// ---------------------------------------------------------------------------------------------------------------------
// Snapshot
// ---------------------------------------------------------------------------------------------------------------------
const pageFile = /^page\.(tsx|ts|jsx|js|mdx)$/

// Walk app/ and return { statics: ['/about', ...], dynamics: ['/works/[slug]/about', ...], handlers: ['/robots.txt'] }.
async function discoverRoutes() {
  const statics = [], dynamics = [], handlers = []
  const walk = async (dir, segments) => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const name = entry.name
      if (entry.isDirectory()) {
        if (name === 'api' && segments.length === 0) continue
        if (name.startsWith('_') || name.startsWith('@')) continue
        const isGroup = name.startsWith('(') && name.endsWith(')')
        await walk(path.join(dir, name), isGroup ? segments : [...segments, name])
        continue
      }
      const route = '/' + segments.join('/')
      if (pageFile.test(name)) (segments.some(s => s.includes('[')) ? dynamics : statics).push(route)
      else if (/^robots\.(ts|js)$/.test(name)) handlers.push('/robots.txt')
      else if (/^sitemap\.(ts|js)$/.test(name)) handlers.push('/sitemap.xml')
      else if (/^(icon|apple-icon)\.(svg|png|jpe?g|ico)$/.test(name)) handlers.push(route === '/' ? `/${name}` : `${route}/${name}`)
      else if (name === 'favicon.ico') handlers.push('/favicon.ico')
    }
  }
  await walk(path.join(root, 'app'), [])
  return { statics, dynamics, handlers }
}

async function collectUrls() {
  process.chdir(root)
  installLoader()
  // portfolio.ts first: it enriches the shared archive JSON (extra Eidola pages), exactly as when a page module loads.
  const portfolio = await import(pathToFileURL(path.join(root, 'lib', 'portfolio.ts')).href)
  const { default: archive } = await import(pathToFileURL(path.join(root, 'data', 'portfolio-content.json')).href)
  const { getAllWorks, getWorkSlug, slugify, silentStepsId, eidolaId } = portfolio

  // One entry per dynamic route in app/, mirroring that page's generateStaticParams.
  const dynamicRoutes = {
    '/works/[slug]': () => getAllWorks().filter(work => work.href.startsWith('/works/')).map(work => `/works/${work.slug}`),
    '/works/[slug]/about': () => getAllWorks().filter(work => work.page.id === eidolaId).map(work => `/works/${work.slug}/about`),
    '/works/[slug]/story': () => getAllWorks().filter(work => work.page.id === silentStepsId).map(work => `/works/${work.slug}/story`),
    '/archive/[slug]': () => portfolio.getArchivePages().map(page => `/archive/${getWorkSlug(page)}`),
    '/[slug]': () => {
      const slugs = new Set()
      for (const page of Object.values(archive.pages)) {
        slugs.add(slugify(page.title))
        slugs.add(page.id.replaceAll('-', ''))
      }
      return [...slugs].filter(Boolean).map(slug => `/${slug}`)
    },
  }

  const { statics, dynamics, handlers } = await discoverRoutes()
  const unhandled = dynamics.filter(route => !dynamicRoutes[route])
  if (unhandled.length) throw new Error(`Dynamic routes with no inventory logic in scripts/url-inventory.mjs: ${unhandled.join(', ')}`)
  const missing = Object.keys(dynamicRoutes).filter(route => !dynamics.includes(route))
  if (missing.length) console.warn(`Note: handlers for routes that no longer exist in app/: ${missing.join(', ')}`)

  const urls = new Set([...requiredStatic, ...statics, ...handlers])
  const counts = { static: urls.size }
  for (const route of dynamics) {
    const found = dynamicRoutes[route]()
    counts[route] = found.length
    for (const url of found) urls.add(url)
  }
  console.log('Collected:', JSON.stringify(counts))
  return [...urls].sort()
}

async function snapshot() {
  const urls = await collectUrls()
  await writeFile(inventoryFile, JSON.stringify(urls, null, 2) + '\n')
  console.log(`Wrote ${urls.length} URLs to ${path.relative(process.cwd(), inventoryFile) || 'url-inventory.json'}`)
}

// ---------------------------------------------------------------------------------------------------------------------
// Check
// ---------------------------------------------------------------------------------------------------------------------
const get = url => fetch(url, { redirect: 'manual' })

// A prerendered page that calls redirect() is served as HTTP 200 with <meta http-equiv="refresh" content="1;url=...">.
const metaRefresh = html => html.match(/<meta[^>]*http-equiv="refresh"[^>]*content="[^"]*?url=([^"]+)"/i)?.[1]?.replaceAll('&amp;', '&') || null

async function checkOne(url) {
  try {
    const first = await get(baseUrl + url)
    let location = null, via = first.status
    if (first.status === 200) {
      const type = first.headers.get('content-type') || ''
      location = type.includes('text/html') ? metaRefresh(await first.text()) : null
      if (!location) return { url, ok: true, kind: 'ok' }
      via = '200 meta-refresh'
    } else if (first.status === 307 || first.status === 308) {
      location = first.headers.get('location')
      if (!location) return { url, ok: false, reason: `${first.status} without Location` }
    } else {
      return { url, ok: false, reason: String(first.status) }
    }
    const target = new URL(location, baseUrl + url)
    if (target.origin !== new URL(baseUrl).origin) return { url, ok: false, reason: `${via} -> external ${target.href}` }
    const second = await get(target.href)
    const shown = target.pathname + target.search
    if (second.status !== 200) return { url, ok: false, reason: `${via} -> ${shown} -> ${second.status}` }
    if ((second.headers.get('content-type') || '').includes('text/html') && metaRefresh(await second.text())) return { url, ok: false, reason: `${via} -> ${shown} -> another redirect (chain)` }
    return { url, ok: true, kind: 'redirect', to: shown }
  } catch (error) {
    return { url, ok: false, reason: `request error: ${error?.cause?.code || error?.message || error}` }
  }
}

async function check() {
  let urls
  try {
    urls = JSON.parse(await readFile(inventoryFile, 'utf8'))
  } catch (error) {
    console.error(`Cannot read url-inventory.json (${error.message}). Run "node scripts/url-inventory.mjs snapshot" first.`)
    process.exit(2)
  }
  if (!Array.isArray(urls) || urls.length === 0) {
    console.error('url-inventory.json holds no URLs.')
    process.exit(2)
  }
  console.log(`Checking ${urls.length} URLs against ${baseUrl} ...`)
  const results = new Array(urls.length)
  let next = 0
  await Promise.all(Array.from({ length: Math.min(concurrency, urls.length) }, async () => {
    while (next < urls.length) {
      const index = next++
      results[index] = await checkOne(urls[index])
    }
  }))
  const ok = results.filter(r => r.ok && r.kind === 'ok').length
  const redirected = results.filter(r => r.ok && r.kind === 'redirect').length
  const failed = results.filter(r => !r.ok)
  console.log(`\n200:                 ${ok}`)
  console.log(`redirected-to-200:   ${redirected}`)
  console.log(`failed:              ${failed.length}`)
  console.log(`total:               ${results.length}`)
  if (failed.length) {
    console.log('\nFailing URLs:')
    for (const r of failed) console.log(`  ${r.url}  [${r.reason}]`)
    process.exit(1)
  }
}

const mode = process.argv[2]
if (mode === 'snapshot') await snapshot()
else if (mode === 'check') await check()
else {
  console.error('Usage: node scripts/url-inventory.mjs <snapshot|check>')
  process.exit(2)
}
