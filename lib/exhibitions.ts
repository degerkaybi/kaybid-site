import { getAllWorks, getSection, voltaId, type NotionBlock } from '@/lib/portfolio'

export type Exhibition = { year: string; title: string; place: string; flag: string; href: string | null }

type Part = { plain_text?: string }

const plain = (block: NotionBlock) =>
  (((block[block.type] as { rich_text?: Part[] } | undefined)?.rich_text) || []).map(part => part.plain_text || '').join('').trim()

// Exhibitions that have a page of their own among the works.
const workLinks: [RegExp, string][] = [
  [/Bull Run/, '4902f670-013a-4661-8234-1cc6d94f00d4'],
  [/Paris Olympics/, '25f39248-8fe5-80df-ac77-ca4a82b720c4'],
  [/Volta/, voltaId],
  [/Milano/, '22a39248-8fe5-803f-a915-f0b8c5bd2ebe'],
  [/"Panda"/, '22a39248-8fe5-80c8-aae6-fcdebd717fb8'],
]

// Shows that are not in the Notion list yet; they lead their year, unless `after` names the show they follow.
const addedExhibitions: (Exhibition & { after?: string })[] = [
  { year: '2026', title: 'Arsa Payı', place: 'Subnomad.tv - Kadıköy - İstanbul', flag: '🇹🇷', href: null },
  { year: '2026', title: 'UpCycle X Silent Steps', place: 'Terminal Kadıköy - İstanbul', flag: '🇹🇷', href: null, after: 'ReCover' },
]

// "Title (Venue - City) 2025 🇹🇷" in its several spellings → year / title / place / flag.
export function parseExhibition(text: string): Exhibition {
  const flag = text.match(/[\u{1F1E6}-\u{1F1FF}]{2}/u)?.[0] || ''
  const years = [...text.matchAll(/\b(?:19|20)\d{2}\b/g)]
  const year = years[years.length - 1]?.[0] || ''
  let rest = text.replace(flag, '')
  if (year) rest = rest.replace(new RegExp(`${year}(?!.*${year})`), '')
  rest = rest.replace(/[\s|,-]+$/, '').trim()
  const place = rest.match(/\(([^()]*)\)$/)
  if (place) rest = rest.slice(0, place.index).trim()
  const title = rest.replace(/[\s,|-]+$/, '').trim()
  const target = workLinks.find(([pattern]) => pattern.test(text))?.[1]
  const href = target ? getAllWorks().find(work => work.page.id === target)?.href || null : null
  return { year, title, place: place?.[1].trim() || '', flag, href }
}

// Notion lists "Penguin and Rhino" as one 2024 show; here they are two works, Rhino sitting under ReMap in 2025.
function splitPenguinAndRhino(list: Exhibition[]): Exhibition[] {
  const both = list.findIndex(item => /Penguin and Rhino/.test(item.title))
  if (both < 0) return list
  const penguin = { ...list[both], title: list[both].title.replace('Penguin and Rhino', 'Penguin') }
  const rhino = { ...list[both], title: list[both].title.replace('Penguin and Rhino', 'Rhino'), year: '2025' }
  const rest = list.map((item, index) => (index === both ? penguin : item))
  const remap = rest.findIndex(item => item.year === '2025' && /^ReMap/.test(item.title))
  const at = remap >= 0 ? remap + 1 : rest.findLastIndex(item => item.year === '2025') + 1
  return [...rest.slice(0, at), rhino, ...rest.slice(at)]
}

// The About page in Notion carries the exhibition list in the middle of the story. Split it out:
// before / after stay on About, the list (and whatever documents it) moves to its own page.
export function getAboutParts() {
  const page = getSection('about')
  if (!page) return null
  const start = page.blocks.findIndex(block => block.type === 'heading_1' && /Selected Exhibitions/i.test(plain(block)))
  if (start < 0) return { page, before: page.blocks, after: [] as NotionBlock[], extra: [] as NotionBlock[], exhibitions: [] as Exhibition[] }
  let end = start + 1
  while (end < page.blocks.length && page.blocks[end].type === 'bulleted_list_item') end++
  const listed = splitPenguinAndRhino(page.blocks.slice(start + 1, end).map(block => parseExhibition(plain(block))).filter(item => item.title))
  const missing = addedExhibitions.filter(added => !listed.some(item => item.title === added.title && item.year === added.year))
  const exhibitions = [...missing.filter(added => !added.after), ...listed]
  for (const { after, ...added } of missing.filter(added => added.after)) {
    const at = exhibitions.findIndex(item => item.year === added.year && item.title === after)
    exhibitions.splice(at < 0 ? 0 : at + 1, 0, added)
  }
  // Up to the next divider: spacing and the two videos that follow the list.
  let tail = end
  while (tail < page.blocks.length && page.blocks[tail].type !== 'divider') tail++
  return {
    page,
    before: page.blocks.slice(0, start),
    after: page.blocks.slice(tail + 1),
    extra: page.blocks.slice(end, tail).filter(block => block.type !== 'paragraph' || plain(block)),
    exhibitions,
  }
}
