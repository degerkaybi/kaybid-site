import { getMediaMimeType, getMediaUrl, getPage, getSection, silentStepsId, type NotionBlock } from '@/lib/portfolio'

type RichPart = { plain_text?: string }
type MediaValue = { mediaId?: string; url?: string; caption?: RichPart[]; rich_text?: RichPart[] }

export type SilentStepsAnimation = {
  id: string
  src: string
  name: string
  years: string
  place: string
  note: string
  video: string | null
  description: string
}

export type SilentStepsYear = { year: string; items: SilentStepsAnimation[] }
export type SilentStepsVideo = { id: string; url: string; caption: string }
export type SilentStepsPhoto = { id: string; src: string }

export type SilentStepsContent = {
  lead: string
  quote: string
  about: string[]
  years: SilentStepsYear[]
  videos: SilentStepsVideo[]
  photos: SilentStepsPhoto[]
  rest: NotionBlock[]
}

const yearPattern = /\b((?:19|20)\d{2})(?:\s*[-–]\s*((?:19|20)\d{2}))?/
// Animations whose video is shown beside the GIF instead of in the films section.
const pairedVideoNames = new Set(['Panda'])
// Text shown beside a paired video.
const videoDescriptions: Record<string, string> = {
  Panda:
    'It took me nearly four years to capture the frames in this film. From beginning to end, in less than a minute, an entire lifetime passes before our eyes. In fact, if you watch each loop only once in sequence, it doesn’t even add up to five seconds. I extended it in the edit through repetition. Everything happens between two blinks of an eye.',
}
// Animations that are not in the Notion page, filed under their year like the others.
const addedAnimations: (Omit<SilentStepsAnimation, 'video' | 'description'> & { year: string })[] = [
  { id: 'added-fil', year: '2026', src: 'https://res.cloudinary.com/dlyp8lb1b/image/upload/v1793891116/Up4K_h3uyie.gif', name: 'Fil', years: '2026', place: 'İstanbul', note: '' },
  { id: 'added-yikim-ekibi', year: '2026', src: 'https://res.cloudinary.com/dlyp8lb1b/image/upload/v1793888874/YIKIM-EK%C4%B0B%C4%B0-----_lksef5.gif', name: 'Yıkım Ekibi', years: '2026', place: '', note: '' },
]
const separators = /^[\s,\-–—]+|[\s,\-–—]+$/g

function plain(parts?: RichPart[]): string {
  return (parts || []).map(part => part.plain_text || '').join('')
}

function valueOf(block: NotionBlock): MediaValue {
  return (block[block.type] || {}) as MediaValue
}

function mediaSrc(value: MediaValue): string | null {
  return getMediaUrl(value.mediaId) || value.url || null
}

function flatten(blocks: NotionBlock[]): NotionBlock[] {
  return blocks.flatMap(block => [block, ...flatten(block.children || [])])
}

// Captions look like "Bear 2023, Milan" or "Panda, 2018-2022- Istanbul, Ankara".
function parseCaption(caption: string) {
  const match = caption.match(yearPattern)
  if (!match || match.index === undefined) return { name: caption.trim(), year: null, years: '', place: '', note: '' }
  const name = caption.slice(0, match.index).replace(separators, '')
  let place = caption.slice(match.index + match[0].length)
  let note = ''
  const noteStart = place.indexOf('I started')
  if (noteStart >= 0) {
    note = place.slice(noteStart).trim()
    place = place.slice(0, noteStart)
  }
  // One caption repeats itself ("Istanbul" + "Elephant, 2018, Istanbul").
  const repeat = name ? place.indexOf(name) : -1
  if (repeat > 0) place = place.slice(0, repeat)
  // A range such as 2018-2022 files under its last year.
  return { name, year: match[2] || match[1], years: match[0].replace(/\s+/g, ''), place: place.replace(separators, ''), note }
}

function introFrom(blocks: NotionBlock[]) {
  const heading = blocks.find(block => block.type === 'heading_3')
  const text = heading ? plain(valueOf(heading).rich_text) : ''
  const quoteStart = text.indexOf('”')
  if (quoteStart < 0) return { lead: text.trim(), quote: '' }
  return {
    lead: text.slice(0, quoteStart).trim(),
    quote: text.slice(quoteStart + 1).replace(/”\s*$/, '').trim(),
  }
}

function aboutParagraphs(): string[] {
  const about = getSection('about')
  if (!about) return []
  const texts = about.blocks.map(block => plain(valueOf(block).rich_text).trim())
  return [
    texts.find(text => text.includes('Silent Steps series')),
    texts.find(text => text.startsWith('The animal images')),
  ].filter((text): text is string => !!text)
}

export function getSilentSteps(): SilentStepsContent | null {
  const page = getPage(silentStepsId)
  if (!page) return null

  const mapStart = page.blocks.findIndex(block => block.type === 'heading_1' && plain(valueOf(block).rich_text).trim().startsWith('Google Maps'))
  const mediaBlocks = flatten(mapStart < 0 ? page.blocks : page.blocks.slice(0, mapStart))
  const rest = (mapStart < 0 ? [] : page.blocks.slice(mapStart)).filter(
    block => !(block.type === 'paragraph' && plain(valueOf(block).rich_text).startsWith('You can see all of the past and current street installations'))
  )

  const groups = new Map<string, SilentStepsAnimation[]>()
  const photos: SilentStepsPhoto[] = []
  const videos: SilentStepsVideo[] = []
  const seen = new Set<string>()

  for (const block of mediaBlocks) {
    const value = valueOf(block)
    const src = mediaSrc(value)
    if (!src) continue

    if (block.type === 'video') {
      videos.push({ id: block.id, url: src, caption: plain(value.caption).trim() })
      continue
    }
    if (block.type !== 'image' || seen.has(src)) continue
    seen.add(src)

    if (getMediaMimeType(value.mediaId) === 'image/gif' || /\.gif(\?|$)/i.test(src)) {
      const { name, year, years, place, note } = parseCaption(plain(value.caption))
      const key = year || 'Undated'
      groups.set(key, [...(groups.get(key) || []), { id: block.id, src, name, years, place, note, video: null, description: '' }])
    } else {
      photos.push({ id: block.id, src })
    }
  }

  for (const { year, ...animation } of addedAnimations) {
    if (seen.has(animation.src)) continue
    seen.add(animation.src)
    groups.set(year, [...(groups.get(year) || []), { ...animation, video: null, description: '' }])
  }

  const films = videos.filter(video => {
    const name = parseCaption(video.caption).name
    const item = pairedVideoNames.has(name) ? [...groups.values()].flat().find(candidate => candidate.name === name && !candidate.video) : null
    if (!item) return true
    item.video = video.url
    item.description = videoDescriptions[name] || ''
    return false
  })

  const years = [...groups.entries()]
    .sort(([a], [b]) => (a === 'Undated' ? 1 : b === 'Undated' ? -1 : Number(b) - Number(a)))
    .map(([year, items]) => ({ year, items }))

  return { ...introFrom(page.blocks), about: aboutParagraphs(), years, videos: films, photos, rest }
}
