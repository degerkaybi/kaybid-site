import { readdirSync } from 'node:fs'
import path from 'node:path'
import { browseEidolaId, eidolaId, getAliasPages, getAllPages, getAllWorks, getLegacyWorkSlug, getPageHref, getWorkSlug, routeRoots, silentStepsId } from '@/lib/portfolio'

export type Redirect = { source: string; destination: string; permanent: true }

// Top-level names that real routes or public files answer to, read from app/ and public/. A redirect from one of them would hide the real page.
function getReservedRoots(root: string): Set<string> {
  const special = /^(layout|loading|page|error|not-found|template|default)\./
  const fromApp = readdirSync(path.join(root, 'app'))
    .filter(name => !/^[_@[(]/.test(name) && !special.test(name))
    .map(name => name.replace(/^(robots)\.(ts|js)$/, '$1.txt'))
  const unknown = fromApp.filter(name => !routeRoots.includes(name))
  if (unknown.length) throw new Error(`New route(s) in app/ missing from routeRoots in lib/portfolio.ts: ${unknown.join(', ')}`)
  return new Set([...routeRoots, ...readdirSync(path.join(root, 'public'))])
}

// Permanent redirects from every old address to the new one, generated from the same data the pages
// are built from: the old suffixed addresses (title + 8-character id) and the old root aliases (title or 32-character id).
// Old and new are paired by the full page id. Every destination is the final URL, so no redirect chains.
export function getRedirects(root: string): Redirect[] {
  const reserved = getReservedRoots(root)
  const found = new Map<string, string>()
  const add = (source: string, destination: string) => {
    if (source === destination) return
    const existing = found.get(source)
    if (existing && existing !== destination) throw new Error(`Redirect conflict: ${source} -> ${existing} and ${destination}`)
    found.set(source, destination)
  }

  const works = getAllWorks().filter(work => work.href.startsWith('/works/'))
  const workByPageId = new Map(works.map(work => [work.page.id, work]))

  for (const work of works) {
    const old = `/works/${getLegacyWorkSlug(work.page)}`
    add(old, work.href)
    if (work.page.id === silentStepsId) add(`${old}/story`, `${work.href}/story`)
    if (work.page.id === eidolaId) add(`${old}/about`, `${work.href}/about`)
  }

  for (const page of getAllPages()) {
    const work = workByPageId.get(page.id)
    // "Browse All Eidōla" redirects to Eidōla itself, so its old address goes straight there. A page that is also a work lives
    // under /works; every other archive page keeps its place under /archive.
    const destination = page.id === browseEidolaId ? getPageHref(page) : work ? work.href : `/archive/${getWorkSlug(page)}`
    add(`/archive/${getLegacyWorkSlug(page)}`, destination)
  }

  // Old root aliases go straight to the final URL. An alias that would redirect to itself, or that a real route answers, is skipped.
  for (const [alias, page] of getAliasPages()) {
    if (!reserved.has(alias)) add(`/${alias}`, getPageHref(page))
  }

  const chained = [...found.values()].filter(destination => found.has(destination))
  if (chained.length) throw new Error(`Redirect chain: these destinations are themselves redirected: ${chained.join(', ')}`)

  return [...found].map(([source, destination]) => ({ source, destination, permanent: true as const }))
}
