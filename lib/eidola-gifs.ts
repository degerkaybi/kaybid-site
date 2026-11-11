import type { PortfolioPage } from '@/lib/portfolio'
import gifData from '@/data/eidola-gifs.json'

// The Eidōla GIFs: one page per folder of Cloudinary's KBD/Eidola/SEZON/<season>. Refresh the list with
// `node scripts/sync-eidola-gifs.mjs S1 [S2 S3]` — the result is committed in data/eidola-gifs.json.
type Picture = { url: string; width: number; height: number }
// "gif" fills the GIF section, "halloween" the Halloween section under it.
export type EidolaGroup = 'gif' | 'halloween'
type GifItem = { id: string; group?: EidolaGroup; season: string; folder: string; title: string; gif: Picture | null; images: Picture[] }

const items = (gifData as { items: GifItem[] }).items

// Cloudinary serves the original under .../upload/v123/name.ext; a transformation goes between "upload/" and the version.
function variant(url: string, transformation: string, extension?: string) {
  const resized = url.replace('/upload/', `/upload/${transformation}/`)
  return extension ? resized.replace(/\.[a-z0-9]+$/i, `.${extension}`) : resized
}

export type EidolaGif = {
  id: string
  group: EidolaGroup
  season: string
  title: string
  // The card shows a still (first frame, same width as the old animated cover); the animated picture
  // (animated WebP: ~1/6 of the GIF's weight) is only loaded on the page.
  card: string
  page: string
  // The GIF as uploaded, for the full-size view.
  original: string | null
  // The pictures of the slider. A folder without a GIF opens with its first picture instead.
  slides: { src: string; alt: string }[]
}

const gifs: EidolaGif[] = items.map(item => {
  const cover = item.gif || item.images[0]
  const animated = !!item.gif
  return {
    id: item.id,
    group: item.group || 'gif',
    season: item.season,
    title: item.title,
    card: animated ? variant(cover.url, 'pg_1,w_480,f_auto,q_auto', 'jpg') : variant(cover.url, 'f_auto,q_auto,w_480'),
    page: animated ? variant(cover.url, 'w_800,q_auto', 'webp') : variant(cover.url, 'f_auto,q_auto,w_1200'),
    original: item.gif?.url || null,
    slides: item.images.map((image, index) => ({ src: variant(image.url, 'f_auto,q_auto,w_1400'), alt: `${item.title} ${index + 1}` })),
  }
})

export const getEidolaGifs = (group: EidolaGroup = 'gif') => gifs.filter(gif => gif.group === group)
export const getEidolaGif = (pageId: string) => gifs.find(gif => gif.id === pageId) || null

type Data = { pages: Record<string, PortfolioPage> }

// Each GIF is a page under "Browse All Eidōla", so it gets the archive address, the Works / Eidōla breadcrumb and a static route.
export function addEidolaGifs(data: Data, browseId: string) {
  for (const gif of gifs) {
    data.pages[gif.id] = {
      id: gif.id,
      parentId: browseId,
      title: gif.title,
      createdTime: '',
      lastEditedTime: '',
      cover: null,
      icon: null,
      blocks: [{ id: `${gif.id}-gif`, type: 'image', image: { url: gif.page } }],
    }
  }
}
