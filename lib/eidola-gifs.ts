import type { PortfolioPage } from '@/lib/portfolio'
import gifData from '@/data/eidola-gifs.json'

// The Eidōla works of the GIF and Halloween sections: one page per folder of Cloudinary's KBD/Eidola/SEZON/<season>. Refresh the list with
// `node scripts/sync-eidola-gifs.mjs S1 [S2 S3]` — the result is committed in data/eidola-gifs.json.
type Picture = { url: string; width: number; height: number }
// "gif" fills the GIF section, "halloween" the Halloween section under it.
export type EidolaGroup = 'gif' | 'halloween'
type GifItem = { id: string; group?: EidolaGroup; season: string; folder: string; title: string; images: Picture[]; cardImageIndex?: number }

const items = (gifData as { items: GifItem[] }).items

// Cloudinary serves the original under .../upload/v123/name.ext; a transformation goes between "upload/" and the version.
const transform = (url: string, transformation: string) => url.replace('/upload/', `/upload/${transformation}/`)

// A card shows one picture of its page's slider: the one at `cardImageIndex` (0-based, in the order the slider shows them)
// in data/eidola-gifs.json, by default the 7th.
const defaultCardImageIndex = 6

export type EidolaGif = {
  id: string
  group: EidolaGroup
  season: string
  title: string
  card: string
  // The pictures of the slider.
  slides: { src: string; alt: string }[]
}

const gifs: EidolaGif[] = items.map(item => {
  const cardIndex = item.cardImageIndex ?? defaultCardImageIndex
  const cover = item.images[cardIndex]
  if (!cover) throw new Error(`Eidōla "${item.title}" (${item.folder}) has ${item.images.length} pictures, so it has no picture at cardImageIndex ${cardIndex} for its card.`)
  return {
    id: item.id,
    group: item.group || 'gif',
    season: item.season,
    title: item.title,
    card: transform(cover.url, 'w_480,f_auto,q_auto'),
    slides: item.images.map((image, index) => ({ src: transform(image.url, 'f_auto,q_auto,w_1400'), alt: `${item.title} ${index + 1}` })),
  }
})

export const getEidolaGifs = (group: EidolaGroup = 'gif') => gifs.filter(gif => gif.group === group)
export const getEidolaGif = (pageId: string) => gifs.find(gif => gif.id === pageId) || null

type Data = { pages: Record<string, PortfolioPage> }

// Each work is a page under "Browse All Eidōla", so it gets the archive address, the Works / Eidōla breadcrumb and a static route.
// Its content (the slider) is drawn by EidolaGifPage, so the page has no blocks of its own.
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
      blocks: [],
    }
  }
}
