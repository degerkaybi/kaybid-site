import archive from '@/data/portfolio-content.json'
import mediaUrls from '@/data/media-urls.json'
import { addedWorks, removedWorkIds, workCatalog } from '@/lib/work-catalog'

export type NotionBlock = {
  id: string
  type: string
  has_children?: boolean
  children?: NotionBlock[]
  [key: string]: unknown
}

export type PortfolioPage = {
  id: string
  parentId: string | null
  title: string
  createdTime: string
  lastEditedTime: string
  cover: unknown
  icon: unknown
  blocks: NotionBlock[]
}

export type Work = {
  page: PortfolioPage
  slug: string
  href: string
  image: string | null
  // The work's own opening picture, for its page header; `image` may be a different card picture.
  pageImage: string | null
  still: string | null
  excerpt: string
  // One-line description for cards; the works list wording where there is one.
  summary: string
  // A name shown beside the title (e.g. who made it with the artist).
  titleNote?: string
  tags: string[]
  series: string | null
  year: string | null
}

type MediaItem = {
  id: string
  url?: string
  localPath: string | null
  mimeType: string | null
  error: string | null
}

const data = archive as unknown as {
  roots: Record<string, string>
  pages: Record<string, PortfolioPage>
  media: Record<string, MediaItem>
}

const ids = {
  silentSteps: '62d2c83c-d0e0-4654-90db-610ddb78bfc7',
  volta: '1b039248-8fe5-80f7-9589-d1dd2ffbba93',
  nightWatch: 'bd62c75c-ff0b-4b11-a857-1ea394db1d59',
  eidola: 'da5cf4ff-a5a7-4d81-b2b4-651d85c9a9d8',
}

const tagMap: Record<string, string[]> = {
  [ids.silentSteps]: ['Sokak sanatı', 'Kolaj', 'Animasyon'],
  '30239248-8fe5-8018-85f0-d341175edced': ['Sokak sanatı', 'Kolaj'],
  '22a39248-8fe5-80c8-aae6-fcdebd717fb8': ['Sokak sanatı', 'Kolaj', 'Animasyon'],
  '25f39248-8fe5-80df-ac77-ca4a82b720c4': ['Sokak sanatı', 'Sergi'],
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe': ['Sokak sanatı', 'Animasyon', 'Sergi'],
  '26c39248-8fe5-80ae-a265-ee5989cd0311': ['Sokak sanatı', 'Kolaj', 'Animasyon'],
  '26c39248-8fe5-80ff-b74c-f811b5bc29c0': ['Sokak sanatı', 'Video'],
  '4902f670-013a-4661-8234-1cc6d94f00d4': ['Sokak sanatı', 'Dijital'],
  '33239248-8fe5-8018-b85b-cbdb6ba6e03f': ['Heykel', 'Enstalasyon'],
  '36439248-8fe5-8078-9dd3-f09a1b16667f': ['Heykel', 'Enstalasyon'],
  '33239248-8fe5-80b8-95e0-c3971654c746': ['Heykel'],
  '33239248-8fe5-8035-b6e9-ceb07a9c84fd': ['Heykel'],
  '3ec39248-8fe5-8095-845c-f590582f19c9': ['Sergi', 'Enstalasyon'],
  [ids.volta]: ['Kolaj', 'Ses', 'Sergi'],
  'f4ec0763-6c97-4df6-88d6-4ff6631ec26c': ['Animasyon'],
  '22a39248-8fe5-8077-8278-ccc0674023b1': ['Animasyon', 'Video'],
  '25f39248-8fe5-80b9-9041-d50804c968cf': ['Animasyon', 'Video'],
  '25f39248-8fe5-806f-bada-c95b0519b8f6': ['Animasyon', 'Video'],
  '25f39248-8fe5-8048-97c3-e58496e8b2cd': ['Animasyon', 'Video'],
  [ids.nightWatch]: ['Kolaj', 'Animasyon', 'Dijital'],
  '2e639248-8fe5-80cc-a7c3-c51c30088b4e': ['Sergi'],
  '22a39248-8fe5-80f2-8c33-e898a8fc01a6': ['Sergi'],
  [ids.eidola]: ['Resim', 'Animasyon'],
  '22a39248-8fe5-8050-8c6f-d28fd81cb677': [],
}

const topWorkIds = new Set([
  ...(data.pages[data.roots.works]?.blocks
    .filter(block => block.type === 'child_page')
    .map(block => block.id) || []).filter(id => !removedWorkIds.has(id)),
  ...addedWorks.map(work => work.id),
])

// The added works are not in Notion: each is a small page that opens on its YouTube film, or on its own text and videos.
const addedPages: PortfolioPage[] = addedWorks.map(work => ({
  id: work.id,
  parentId: null,
  title: work.title,
  createdTime: '',
  lastEditedTime: '',
  cover: { url: work.cover || `https://i.ytimg.com/vi/${work.youtube}/maxresdefault.jpg` },
  icon: null,
  blocks: [
    ...(work.youtube ? [{ id: `${work.id}-film`, type: 'embed', embed: { url: `https://www.youtube.com/watch?v=${work.youtube}` } }] : []),
    // The first paragraph is the page's lead-in (its summary), so it is not repeated in the body; the card picture follows it.
    ...(work.cover ? [{ id: `${work.id}-cover`, type: 'image', image: { url: work.cover } }] : []),
    ...(work.paragraphs || []).slice(1).map((text, index) => ({ id: `${work.id}-text-${index}`, type: 'paragraph', paragraph: { rich_text: [{ plain_text: text }] } })),
    ...(work.videos || []).map((item, index): NotionBlock => {
      const film = (url: string, id: string): NotionBlock => ({ id, type: 'video', video: { url } })
      if (typeof item === 'string') return film(item, `${work.id}-video-${index}`)
      return {
        id: `${work.id}-videos-${index}`,
        type: 'column_list',
        children: item.map((url, position) => ({ id: `${work.id}-videos-${index}-${position}`, type: 'column', children: [film(url, `${work.id}-video-${index}-${position}`)] })),
      }
    }),
  ],
}))
export const isAddedWork = (id: string) => addedWorks.some(work => work.id === id)

const conceptualVoltaTitles = new Set([
  'Resimlerimin Mırıldandığı Şarkılar',
  'Kavramsal Metin',
])

export const silentStepsId = ids.silentSteps
export const voltaId = ids.volta

// Works whose page header shows their own opening GIF instead of the Notion icon image.
const leadImageIds = new Set([
  '22a39248-8fe5-80c8-aae6-fcdebd717fb8', // Silent Steps “PANDA”
  '25f39248-8fe5-80df-ac77-ca4a82b720c4', // Paris Olympics, 2024
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe', // Milan Ed. Silent Steps/Night Watch
  '26c39248-8fe5-80ae-a265-ee5989cd0311', // “One Of Us”
  '26c39248-8fe5-80ff-b74c-f811b5bc29c0', // Figures
  '4902f670-013a-4661-8234-1cc6d94f00d4', // "Night Watch" Bull Run Edition
  'f4ec0763-6c97-4df6-88d6-4ff6631ec26c', // Somewhere
  '22a39248-8fe5-8077-8278-ccc0674023b1', // Rabbit H0le
  '25f39248-8fe5-80b9-9041-d50804c968cf', // Just Because You're Paranoid,
  '25f39248-8fe5-806f-bada-c95b0519b8f6', // G.O.T.
  '25f39248-8fe5-8048-97c3-e58496e8b2cd', // Hope
])

// Opening GIFs hosted elsewhere, used instead of the page's own first picture.
const leadImageOverrides: Record<string, string> = {
  '4902f670-013a-4661-8234-1cc6d94f00d4': 'https://i.imgur.com/X42dN2c.gif', // "Night Watch" Bull Run Edition
}

// Card pictures (home, works, desktop) that differ from the work's own first picture.
const cardImageOverrides: Record<string, string> = {
  '30239248-8fe5-8018-85f0-d341175edced': 'https://res.cloudinary.com/dlyp8lb1b/image/upload/v1793891116/Up4K_h3uyie.gif', // UpCycle X Silent Steps
}

// For those works, lift the first image of the page out of the body so it can lead the page.
export function splitLeadImage(page: PortfolioPage): { image: string; blocks: NotionBlock[] } | null {
  if (!leadImageIds.has(page.id)) return null
  const index = page.blocks.findIndex(block => block.type === 'image' && imageFromObject(block.image))
  if (index < 0) return null
  return { image: leadImageOverrides[page.id] || imageFromObject(page.blocks[index].image) as string, blocks: page.blocks.filter((_, position) => position !== index) }
}
export const eidolaId = ids.eidola
export const featuredIds = [ids.silentSteps, '22a39248-8fe5-80c8-aae6-fcdebd717fb8' /* Silent Steps “PANDA” */, 'added-arsa-payi', ids.volta]
const tagLabels: Record<string, string> = {
  'Sokak sanatı': 'Street Art',
  Kolaj: 'Collage',
  Animasyon: 'Animation',
  Heykel: 'Sculpture',
  Resim: 'Painting',
  Ses: 'Sound',
  Dijital: 'Digital',
  Sergi: 'Exhibition',
  Enstalasyon: 'Installation',
  Video: 'Video',
}

export const filters = ['All', 'Street Art', 'Collage', 'Animation', 'Painting', 'Sound', 'Digital', 'Exhibition', 'Sculpture', 'Assemblage']

export function getPage(id: string): PortfolioPage | null {
  return data.pages[id] || null
}

export function getSection(slug: string): PortfolioPage | null {
  return getPage(data.roots[slug])
}

export function getMediaUrl(mediaId?: string | null): string | null {
  if (!mediaId) return null
  const item = data.media[mediaId]
  if (!item) return null
  if (item.error) return null
  if (item.localPath) {
    return (mediaUrls as Record<string, string>)[item.localPath] || item.localPath
  }
  return item.url?.startsWith('https://') && item.url.includes('amazonaws.com') ? null : item.url || null
}

export function getMediaMimeType(mediaId?: string | null): string | null {
  return (mediaId && data.media[mediaId]?.mimeType) || null
}

let animatedUrls: Set<string> | null = null

// First frame of an animated picture, so lists can stay still until hovered. Null for anything else.
export function getStillImage(url: string | null): string | null {
  if (!url) return null
  const imgur = url.match(/^(https:\/\/i\.imgur\.com\/\w+)\.gif$/)
  if (imgur) return `${imgur[1]}h.jpg`
  if (!animatedUrls) {
    animatedUrls = new Set()
    for (const item of Object.values(data.media)) {
      if (item.mimeType !== 'image/gif' || !item.localPath) continue
      animatedUrls.add(item.localPath)
      const hosted = (mediaUrls as Record<string, string>)[item.localPath]
      if (hosted) animatedUrls.add(hosted)
    }
  }
  // Hosted GIFs of the added works are not in the Notion media list, so recognise them by address.
  const hostedGif = (addedWorks.some(work => work.cover === url) || Object.values(cardImageOverrides).includes(url)) && /\.gif$/i.test(url)
  if (!(animatedUrls.has(url) || hostedGif) || !url.includes('res.cloudinary.com') || !url.includes('/upload/')) return null
  return url.replace('/upload/', '/upload/pg_1/').replace(/\.\w+$/, '.jpg')
}

function imageFromObject(value: unknown): string | null {
  if (!value || typeof value !== 'object') return null
  const object = value as { mediaId?: string; url?: string }
  return getMediaUrl(object.mediaId) || (object.url?.startsWith('https://') ? object.url : null)
}

function findImageInBlocks(blocks: NotionBlock[]): string | null {
  for (const block of blocks) {
    if (block.type === 'image') {
      const image = imageFromObject(block.image)
      if (image) return image
    }
    if (block.children?.length) {
      const image = findImageInBlocks(block.children)
      if (image) return image
    }
  }
  return null
}

export function getPageImage(page: PortfolioPage, includeChildPages = false): string | null {
  const own = imageFromObject(page.cover) || imageFromObject(page.icon) || findImageInBlocks(page.blocks)
  if (own || !includeChildPages) return own
  for (const block of page.blocks) {
    if (block.type === 'child_page') {
      const child = getPage(block.id)
      if (child) {
        const image = getPageImage(child)
        if (image) return image
      }
    }
  }
  return null
}

function richTextPlain(value: unknown): string {
  if (!Array.isArray(value)) return ''
  return value.map(part => (part as { plain_text?: string }).plain_text || '').join('')
}

function textFromBlocks(blocks: NotionBlock[]): string[] {
  const texts: string[] = []
  for (const block of blocks) {
    const value = block[block.type] as { rich_text?: unknown } | undefined
    if (['paragraph', 'quote', 'callout'].includes(block.type)) {
      const text = richTextPlain(value?.rich_text).trim()
      if (text && !/^https?:\/\//.test(text) && text.length > 45) texts.push(text)
    }
    if (block.children?.length) texts.push(...textFromBlocks(block.children))
  }
  return texts
}

function getExcerpt(page: PortfolioPage): string {
  const text = textFromBlocks(page.blocks)[0] || ''
  return text.length > 170 ? `${text.slice(0, 167).trimEnd()}…` : text
}

// True when the page links to pages of its own, at any depth (columns and callouts included).
export function hasSubPages(page: PortfolioPage): boolean {
  const visit = (blocks: NotionBlock[]): boolean =>
    blocks.some(block => block.type === 'child_page' || (!!block.children?.length && visit(block.children)))
  return visit(page.blocks)
}

// Silent Steps has section routes defined in code; the other works expose Notion child pages.
export function hasWorkSubPages(work: Work): boolean {
  return work.page.id === ids.silentSteps || hasSubPages(work.page)
}

// A few more paragraphs than the card excerpt, for windows that have room to read.
export function getPageSummary(page: PortfolioPage, limit = 460): string {
  const text = textFromBlocks(page.blocks).slice(0, 2).join('\n\n')
  return text.length > limit ? `${text.slice(0, limit - 1).trimEnd()}…` : text
}

function collectImages(blocks: NotionBlock[], found: string[], limit: number) {
  for (const block of blocks) {
    if (found.length >= limit) return
    if (block.type === 'image') {
      const image = imageFromObject(block.image)
      if (image && !found.includes(image)) found.push(image)
    }
    if (block.children?.length) collectImages(block.children, found, limit)
  }
}

export function getPageImages(page: PortfolioPage, limit = 3): string[] {
  const found: string[] = []
  collectImages(page.blocks, found, limit)
  return found
}

export function slugify(value: string): string {
  return value
    .toLocaleLowerCase('tr')
    .replace(/ı/g, 'i')
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 64)
}

// Pages whose address drops the leading "more-" of their title.
const slugWithoutMore = new Set(['22a39248-8fe5-8019-9671-dd9af9e33095']) // More about WWF Market X Kaybid

// Edition pages shown by their edition's name, without the "More about" in front of it.
const withoutMoreAbout = new Set([
  '22a39248-8fe5-8002-bf57-cf365b91d67f', // User Manual for Vitality
  '22a39248-8fe5-8024-89eb-c87f7546a320', // First Aid Kit For City Hackers
])

// The title as shown on the page, in the breadcrumb and in the tab.
export function getPageLabel(page: PortfolioPage): string {
  return withoutMoreAbout.has(page.id) ? page.title.replace(/^more about\s+/i, '').trim() : page.title
}

export function getWorkSlug(page: PortfolioPage): string {
  const base = slugify(getPageLabel(page))
  return `${(slugWithoutMore.has(page.id) ? base.replace(/^more-/, '') : base) || 'work'}-${page.id.replaceAll('-', '').slice(0, 8)}`
}

function yearFrom(page: PortfolioPage): string | null {
  const titleYear = page.title.match(/\b(20\d{2})\b/)
  if (titleYear) return titleYear[1]
  const text = textFromBlocks(page.blocks).slice(0, 3).join(' ')
  return text.match(/\b(20\d{2})\b/)?.[1] || null
}

// The Eidōla on the "Browse All Eidōla" page, each with its own page and the picture shown on that page.
const browseEidolaId = '22a39248-8fe5-805a-9be0-daa6cad580cf'
let eidolonWorks: Work[] | null = null

const eidolonExcerpt = (callout: NotionBlock) => richTextPlain((callout.callout as { rich_text?: unknown } | undefined)?.rich_text).replace(/^[-\s]+|[-\s]+$/g, '')

function getEidolonWorks(): Work[] {
  if (eidolonWorks) return eidolonWorks
  const works: Work[] = []
  const visit = (blocks: NotionBlock[]) => {
    for (const block of blocks) {
      if (block.type === 'column') {
        const items = block.children || []
        const picture = items.find(item => item.type === 'image' && items.some(other => other.type === 'equation'))
        const callout = items.find(item => item.type === 'callout' && item.children?.some(child => child.type === 'child_page'))
        const link = callout?.children?.find(child => child.type === 'child_page')
        const page = link ? getPage(link.id) : null
        if (picture && callout && page) {
          const root = Object.entries(data.roots).some(([, id]) => id === page.id)
          works.push({
            page,
            slug: getWorkSlug(page),
            href: root ? getPageHref(page) : `/archive/${getWorkSlug(page)}`,
            image: imageFromObject(picture.image),
            pageImage: imageFromObject(picture.image),
            still: null,
            excerpt: eidolonExcerpt(callout),
            summary: eidolonExcerpt(callout),
            tags: (tagMap[ids.eidola] || []).map(tag => tagLabels[tag] || tag),
            series: 'Eidōla',
            year: null,
          })
        }
      }
      if (block.children?.length) visit(block.children)
    }
  }
  visit(getPage(browseEidolaId)?.blocks || [])
  eidolonWorks = works
  return works
}

export function getAllWorks(): Work[] {
  const topLevel = [...Object.values(data.pages).filter(page => topWorkIds.has(page.id) && page.id !== '36439248-8fe5-8078-9dd3-f09a1b16667f'), ...addedPages]
  const voltaChildren = Object.values(data.pages).filter(
    page => page.parentId === ids.volta && !conceptualVoltaTitles.has(page.title.trim())
  )
  const works = [...topLevel, ...voltaChildren].map(page => {
    const isVoltaChild = page.parentId === ids.volta
    const series = isVoltaChild ? 'Volta' : [ids.silentSteps, ids.volta, ids.nightWatch, ids.eidola].includes(page.id) ? page.title : null
    const listed = workCatalog[page.id] || addedWorks.find(work => work.id === page.id)?.entry
    const added = addedWorks.find(work => work.id === page.id)
    const excerpt = added ? added.paragraphs?.[0] || listed?.summary || '' : getExcerpt(page)
    return {
      page,
      slug: getWorkSlug(page),
      href: `/works/${getWorkSlug(page)}`,
      image: cardImageOverrides[page.id] || splitLeadImage(page)?.image || getPageImage(page, true),
      pageImage: splitLeadImage(page)?.image || getPageImage(page, true),
      still: null,
      excerpt,
      summary: listed?.summary || excerpt,
      titleNote: added?.titleNote,
      tags: listed?.tags || (isVoltaChild ? ['Kolaj', 'Ses'] : tagMap[page.id] || []).map(tag => tagLabels[tag] || tag),
      series,
      year: listed?.year || yearFrom(page),
    }
  })
  return [...works, ...getEidolonWorks()].map(work => ({ ...work, still: getStillImage(work.image) }))
}

// Catalogue cards and desktop icons show each project once. Child pages remain accessible from the project page.
export function getMainWorks(): Work[] {
  return getAllWorks().filter(work => topWorkIds.has(work.page.id))
}

export function getWorkBySlug(slug: string): Work | null {
  return getAllWorks().find(work => work.slug === slug) || null
}

export function getPageBySlug(slug: string): PortfolioPage | null {
  return Object.values(data.pages).find(page => getWorkSlug(page) === slug) || null
}

export function getPageHref(page: PortfolioPage): string {
  const rootEntry = Object.entries(data.roots).find(([, id]) => id === page.id)
  if (rootEntry) {
    const paths: Record<string, string> = { home: '/', about: '/about', works: '/works', 'art-ideas': '/editions', press: '/about/press', contact: '/contact' }
    return paths[rootEntry[0]] || '/'
  }
  const work = getAllWorks().find(item => item.page.id === page.id)
  return work?.href || `/archive/${getWorkSlug(page)}`
}

export function getFeaturedWorks(): Work[] {
  const works = getAllWorks()
  return featuredIds.map(id => works.find(work => work.page.id === id)).filter((work): work is Work => !!work)
}

export function getRelatedWorks(work: Work): Work[] {
  return getAllWorks()
    .filter(item => item.page.id !== work.page.id)
    .map(item => ({ item, score: item.tags.filter(tag => work.tags.includes(tag)).length + (item.series && item.series === work.series ? 2 : 0) }))
    .filter(result => result.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, 3)
    .map(result => result.item)
}
