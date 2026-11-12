import fs from 'node:fs'
import path from 'node:path'
import type { ContentBlock, PortfolioPage } from '@/lib/portfolio'

// Eidōla that are not in Notion. Each has a film (hosted on Cloudinary) and a slider of pictures taken from
// its own folder, public/media/<Name>/ (the cover is only the picture on its card) — drop the images in there and they appear on the page (in file name order).
const extraEidola = [
  { name: 'Persona', id: 'e1d01a01-0000-4000-8000-000000000001', film: 'https://res.cloudinary.com/epzod3uc/video/upload/v1793967060/Persona_By_Kaybid_qzeicj.mp4', cover: 'https://res.cloudinary.com/epzod3uc/image/upload/v1793967599/Persona_ttpjio.jpg' },
  { name: 'Love', id: 'e1d01a02-0000-4000-8000-000000000002', film: 'https://res.cloudinary.com/epzod3uc/video/upload/v1793967060/Love_By_Kaybid_ixlxwu.mp4', cover: 'https://res.cloudinary.com/epzod3uc/image/upload/f_auto,q_auto,w_1200/v1793967517/1_cuppuf.jpg' },
  { name: 'Mycelia', id: 'e1d01a03-0000-4000-8000-000000000003', film: 'https://res.cloudinary.com/epzod3uc/video/upload/v1793967056/Mycelia_By_Kaybid_wumfbs.mp4', cover: 'https://res.cloudinary.com/epzod3uc/image/upload/v1793967698/Mycelia_roreou.jpg' },
]

const imagePattern = /\.(webp|png|jpe?g|gif|avif)$/i

function folderImages(name: string): string[] {
  try {
    return fs.readdirSync(path.join(process.cwd(), 'public', 'media', name))
      .filter(file => imagePattern.test(file))
      .sort((a, b) => a.localeCompare(b, undefined, { numeric: true }))
  } catch {
    return []
  }
}

type Data = { pages: Record<string, PortfolioPage>; media: Record<string, unknown> }

// Adds the pages to the archive data and their cards to the end of the Browse All grid.
export function addExtraEidola(data: Data, browseId: string) {
  const browse = data.pages[browseId]
  if (!browse) return
  const columns: ContentBlock[] = []
  for (const { name, id, film, cover } of extraEidola) {
    const images: ContentBlock[] = folderImages(name).map((file, index) => {
      const mediaId = `${id}-image-${index}`
      data.media[mediaId] = { id: mediaId, source: 'file', mimeType: null, localPath: `/media/${name}/${file}`, error: null }
      return { id: mediaId, type: 'image', image: { mediaId } }
    })
    data.pages[id] = {
      id,
      parentId: browseId,
      title: `“${name}”`,
      createdTime: '',
      lastEditedTime: '',
      cover: null,
      icon: null,
      blocks: [{ id: `${id}-film`, type: 'video', video: { url: film, caption: [] } }, ...images],
    }
    columns.push({
      id: `${id}-card`,
      type: 'column',
      children: [
        { id: `${id}-name`, type: 'equation', equation: { expression: name } },
        { id: `${id}-card-image`, type: 'image', image: { url: cover } },
        { id: `${id}-link`, type: 'callout', callout: { rich_text: [] }, children: [{ id, type: 'child_page' }] },
      ],
    })
  }
  const row: ContentBlock = { id: 'eidola-extra-row', type: 'column_list', children: columns }
  const back = browse.blocks.findIndex(block => block.type === 'child_page')
  browse.blocks.splice(back < 0 ? browse.blocks.length : back, 0, row)
}
