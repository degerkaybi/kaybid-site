import { getMediaUrl, type NotionBlock } from '@/lib/portfolio'

type Item = { id: string; kind: 'image' | 'video'; src: string }

const flat = (blocks: NotionBlock[]): NotionBlock[] => blocks.flatMap(block => [block, ...flat(block.children || [])])

// Press pictures as equal small tiles. Hovering one floats a larger copy beside it; a click opens the
// surrounding <Lightbox> (images and video alike).
export default function PressGallery({ blocks }: { blocks: NotionBlock[] }) {
  const items: Item[] = flat(blocks).flatMap(block => {
    if (block.type !== 'image' && block.type !== 'video') return []
    const value = block[block.type] as { mediaId?: string; url?: string } | undefined
    const src = getMediaUrl(value?.mediaId) || value?.url
    return src ? [{ id: block.id, kind: block.type, src }] : []
  })
  if (items.length === 0) return null
  return (
    <div className="pf-press-gallery">
      {items.map((item, index) => item.kind === 'image' ? (
        <button key={item.id} type="button" className="pf-press-thumb" data-lightbox={item.src} data-kind="image" data-alt="" aria-label={`Enlarge press picture ${index + 1}`}>
          <img src={item.src} alt="" loading="lazy" decoding="async" />
          <img className="pf-press-peek" src={item.src} alt="" loading="lazy" decoding="async" />
        </button>
      ) : (
        <button key={item.id} type="button" className="pf-press-thumb is-video" data-lightbox={item.src} data-kind="video" data-alt="" aria-label="Play press video">
          <video src={`${item.src}#t=0.1`} muted playsInline preload="metadata" />
          <span className="pf-press-play" aria-hidden="true">▶</span>
        </button>
      ))}
    </div>
  )
}
