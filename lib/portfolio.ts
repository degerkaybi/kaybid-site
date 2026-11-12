import archive from '@/data/portfolio-content.json'
import mediaUrls from '@/data/media-urls.json'
import { addExtraEidola } from '@/lib/eidola-extra'
import { addEidolaGifs, getEidolaGif } from '@/lib/eidola-gifs'
import { addedWorks, removedWorkIds, workCatalog } from '@/lib/work-catalog'

export type ContentBlock = {
  id: string
  type: string
  has_children?: boolean
  children?: ContentBlock[]
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
  blocks: ContentBlock[]
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
    ...(work.videos || []).map((item, index): ContentBlock => {
      const film = (url: string, id: string): ContentBlock => ({ id, type: 'video', video: { url } })
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
  '30239248-8fe5-8018-85f0-d341175edced': 'https://res.cloudinary.com/epzod3uc/image/upload/v1793891116/Up4K_h3uyie.gif', // UpCycle X Silent Steps
}

// For those works, lift the first image of the page out of the body so it can lead the page.
export function splitLeadImage(page: PortfolioPage): { image: string; blocks: ContentBlock[] } | null {
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

// The Eidōla films, hosted as files instead of on YouTube (Notion media id → file).
const cloudinaryFilm = (version: string, name: string, hash: string) => `https://res.cloudinary.com/epzod3uc/video/upload/v${version}/${name}_By_Kaybid_${hash}.mp4`
const filmOverrides: Record<string, string> = {
  '879447d2e24ab2593ae7': cloudinaryFilm('1793963550', 'Evil', 'soawwp'),
  'e3416782fddcd7431931': cloudinaryFilm('1793963545', 'Rest', 'p85e6g'),
  '507a2baf216867069f73': cloudinaryFilm('1793963544', 'Insomnia', 'hzwgl9'),
  'f36b2c177e0785128190': cloudinaryFilm('1793963542', 'Fire', 'evyrqk'),
  '759c34c64655872f5aa2': cloudinaryFilm('1793963542', 'Rhythm', 'sfcb0r'),
  'c3ae8c9f15175d916822': cloudinaryFilm('1793963541', 'Seed', 'xjxq27'),
  'bfe010f0c26191a45add': cloudinaryFilm('1793963539', 'Reverie', 'v8xrcu'),
}

export function getMediaUrl(mediaId?: string | null): string | null {
  if (!mediaId) return null
  if (filmOverrides[mediaId]) return filmOverrides[mediaId]
  const item = data.media[mediaId]
  if (!item) return null
  if (item.error) return null
  if (item.localPath) {
    // No entry in data/media-urls.json means the file is not on Cloudinary (the local copy is not deployed), so there is nothing to show.
    return (mediaUrls as Record<string, string>)[item.localPath] || null
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

function findImageInBlocks(blocks: ContentBlock[]): string | null {
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

function textFromBlocks(blocks: ContentBlock[]): string[] {
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
  const visit = (blocks: ContentBlock[]): boolean =>
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

function collectImages(blocks: ContentBlock[], found: string[], limit: number) {
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

// Pages whose address is written by hand instead of coming from their title.
const manualSlugs: Record<string, string> = {
  'added-back-to-the-commencis': 'back-to-the-commencis',
  'added-human-zer0': 'human-zer0',
  'added-arsa-payi': 'arsa-payi',
  // "Trust" exists twice as a GIF page (season 1 and 2) and in no Notion page, so "-gif" cannot tell them apart.
  '85d909f7-e07f-4cd7-8ad5-e8b7fba1dcc9': 'trust-s2',
}

function titleSlug(page: PortfolioPage): string {
  const base = slugify(getPageLabel(page))
  return manualSlugs[page.id] || (slugWithoutMore.has(page.id) ? base.replace(/^more-/, '') : base) || 'work'
}

// The address the site used until the Notion-style ids were dropped: title + first 8 characters of the page id.
// Only for redirects from old URLs (lib/redirects.ts). The 8 characters are shared by many pages, so pair old and new by page id.
export function getLegacyWorkSlug(page: PortfolioPage): string {
  const base = slugify(getPageLabel(page))
  return `${(slugWithoutMore.has(page.id) ? base.replace(/^more-/, '') : base) || 'work'}-${page.id.replaceAll('-', '').slice(0, 8)}`
}

let slugsById: Map<string, string> | null = null

// The address of every page: its title. When two pages would share one, the Notion page keeps it and the Cloudinary GIF page
// gets "-gif" added. Any other duplicate fails the build.
function getSlugs(): Map<string, string> {
  if (slugsById) return slugsById
  const groups = new Map<string, PortfolioPage[]>()
  for (const page of [...Object.values(data.pages), ...addedPages]) {
    const base = titleSlug(page)
    groups.set(base, [...(groups.get(base) || []), page])
  }
  const slugs = new Map<string, string>()
  const problems: string[] = []
  for (const [base, pages] of groups) {
    const gifs = pages.filter(page => getEidolaGif(page.id))
    const others = pages.filter(page => !getEidolaGif(page.id))
    if (pages.length === 1) slugs.set(pages[0].id, base)
    else if (others.length === 1 && gifs.length > 0 && gifs.length === pages.length - 1 && gifs.length === 1) {
      slugs.set(others[0].id, base)
      slugs.set(gifs[0].id, `${base}-gif`)
    } else problems.push(`"${base}": ${pages.map(page => `${page.id} (${page.title})`).join(', ')}`)
  }
  const taken = new Map<string, string>()
  for (const [id, slug] of slugs) {
    if (taken.has(slug)) problems.push(`"${slug}" (after adding -gif): ${taken.get(slug)}, ${id}`)
    taken.set(slug, id)
  }
  if (problems.length) throw new Error(`Page address collision. Two pages in the same route group would get the same address (only a Notion page + its Cloudinary GIF page is resolved automatically, with "-gif"). Give one of them a manual slug in lib/portfolio.ts (manualSlugs):\n${problems.join('\n')}`)
  slugsById = slugs
  return slugs
}

export function getWorkSlug(page: PortfolioPage): string {
  return getSlugs().get(page.id) || titleSlug(page)
}

// Every page of the archive data, including the Eidōla pages added in code.
export function getAllPages(): PortfolioPage[] {
  return Object.values(data.pages)
}

// The Notion root "home" page is served by "/", so it has no /archive page: its archive addresses redirect to "/".
export const homePageId = data.roots.home
export const hasArchivePage = (page: PortfolioPage) => page.id !== homePageId

// Every page that is built under /archive/[slug].
export function getArchivePages(): PortfolioPage[] {
  return getAllPages().filter(hasArchivePage)
}

function yearFrom(page: PortfolioPage): string | null {
  const titleYear = page.title.match(/\b(20\d{2})\b/)
  if (titleYear) return titleYear[1]
  const text = textFromBlocks(page.blocks).slice(0, 3).join(' ')
  return text.match(/\b(20\d{2})\b/)?.[1] || null
}

// The Eidōla on the "Browse All Eidōla" page, each with its own page and the picture shown on that page.
export const browseEidolaId ='22a39248-8fe5-805a-9be0-daa6cad580cf'
addExtraEidola(data, browseEidolaId)
// The Contact page no longer opens on a film: only its text, links and pictures remain.
const contactPage = data.pages[data.roots.contact]
if (contactPage) contactPage.blocks = contactPage.blocks.filter(block => block.type !== 'video')
addEidolaGifs(data, browseEidolaId)
let eidolonWorks: Work[] | null = null

const eidolonExcerpt = (callout: ContentBlock) => richTextPlain((callout.callout as { rich_text?: unknown } | undefined)?.rich_text).replace(/^[-\s]+|[-\s]+$/g, '')

function getEidolonWorks(): Work[] {
  if (eidolonWorks) return eidolonWorks
  const works: Work[] = []
  const visit = (blocks: ContentBlock[]) => {
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
  return getArchivePages().find(page => getWorkSlug(page) === slug) || null
}

export function getPageHref(page: PortfolioPage): string {
  const rootEntry = Object.entries(data.roots).find(([, id]) => id === page.id)
  if (rootEntry) {
    const paths: Record<string, string> = { home: '/', about: '/about', works: '/works', 'art-ideas': '/editions', press: '/about/press', contact: '/contact' }
    return paths[rootEntry[0]] || '/'
  }
  // "Browse All Eidōla" has no page of its own: links go straight to Eidōla instead of through its redirect.
  const eidola = page.id === browseEidolaId ? data.pages[ids.eidola] : null
  if (eidola) return getPageHref(eidola)
  const work = getAllWorks().find(item => item.page.id === page.id)
  return work?.href || `/archive/${getWorkSlug(page)}`
}

// First path segments that are real routes (folders and files in app/). An old root address with one of these names is
// never redirected: the real page answers it. lib/redirects.ts checks this list against app/ at build time.
export const routeRoots = ['about', 'api', 'archive', 'contact', 'desktop', 'editions', 'hello', 'icon.svg', 'press', 'robots.txt', 'works']

let aliasPages: Map<string, PortfolioPage> | null = null

// The old root addresses: a page's 32-character id, or its title ("/kaybid"). Where two pages share a title, the first one wins.
export function getAliasPages(): Map<string, PortfolioPage> {
  if (aliasPages) return aliasPages
  const aliases = new Map<string, PortfolioPage>()
  for (const page of getAllPages()) {
    for (const alias of [slugify(page.title), page.id.replaceAll('-', '')]) {
      if (alias && !aliases.has(alias)) aliases.set(alias, page)
    }
  }
  aliasPages = aliases
  return aliases
}

// Where an old root address leads now: the page's final URL, or null when it names no page (or a real route).
export function getAliasHref(alias: string): string | null {
  if (routeRoots.includes(alias)) return null
  const page = getAliasPages().get(alias)
  return page ? getPageHref(page) : null
}

// A link written in the content that points inside the site the old way (/<32-character id>, /<title>, or a Notion page address).
// `internal` is false for everything else (external links, real routes). `href` is the final URL, or null when the page is gone.
export function resolveInternalLink(href: string): { internal: false } | { internal: true; href: string | null } {
  const notionId = href.match(/^https?:\/\/(?:[\w-]+\.)*notion\.(?:com|so)\/(?:.*[-/])?([0-9a-f]{32})(?:[?#].*)?$/i)?.[1]
  if (notionId) return { internal: true, href: getAliasHref(notionId.toLowerCase()) }
  const path = href.match(/^\/([^/?#]+)([?#].*)?$/)
  if (!path || routeRoots.includes(path[1])) return { internal: false }
  const target = getAliasHref(path[1].toLowerCase())
  return { internal: true, href: target ? target + (path[2] || '') : null }
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
