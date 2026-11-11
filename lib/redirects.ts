import { browseEidolaId, eidolaId, getAllPages, getAllWorks, getLegacyWorkSlug, getPageHref, getWorkSlug, silentStepsId } from '@/lib/portfolio'

export type Redirect = { source: string; destination: string; permanent: true }

// Permanent redirects from every old address (title + 8-character id) to the new one, generated from the same data the pages
// are built from. Old and new are paired by the full page id. Every destination is the final URL, so no redirect chains.
export function getRedirects(): Redirect[] {
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

  const chained = [...found.values()].filter(destination => found.has(destination))
  if (chained.length) throw new Error(`Redirect chain: these destinations are themselves redirected: ${chained.join(', ')}`)

  return [...found].map(([source, destination]) => ({ source, destination, permanent: true as const }))
}
