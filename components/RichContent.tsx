import Link from 'next/link'
import ImageStack, { type Slide } from './ImageStack'
import PortraitVideo from './PortraitVideo'
import WorkCard from './WorkCard'
import InstagramPostEmbed from './InstagramPostEmbed'
import { getMediaUrl, getPage, getPageHref, getPageImage, type NotionBlock } from '@/lib/portfolio'

type RichPart = {
  plain_text?: string
  href?: string | null
  annotations?: { bold?: boolean; italic?: boolean; underline?: boolean; strikethrough?: boolean; code?: boolean }
  mention?: { type?: string; page?: { id?: string } }
}

function richText(parts: RichPart[] = []) {
  return parts.map((part, index) => {
    let text: React.ReactNode = part.plain_text || ''
    if (part.annotations?.code) text = <code>{text}</code>
    if (part.annotations?.bold) text = <strong>{text}</strong>
    if (part.annotations?.italic) text = <em>{text}</em>
    if (part.annotations?.underline) text = <u>{text}</u>
    if (part.annotations?.strikethrough) text = <s>{text}</s>
    const linkedPage = part.mention?.type === 'page' && part.mention.page?.id ? getPage(part.mention.page.id) : null
    if (linkedPage) return <Link key={index} href={getPageHref(linkedPage)}>{text}</Link>
    if (part.href) return <a key={index} href={part.href} target="_blank" rel="noopener noreferrer">{text}</a>
    if (/https?:\/\//.test(part.plain_text || '')) {
      return <span key={index}>{(part.plain_text || '').split(/(https?:\/\/[^\s]+)/g).map((piece, pieceIndex) => /^https?:\/\//.test(piece) ? <a key={pieceIndex} href={piece} target="_blank" rel="noopener noreferrer">{piece}</a> : piece)}</span>
    }
    return <span key={index}>{text}</span>
  })
}

export function youtubeEmbed(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (parsed.hostname === 'youtu.be') return `https://www.youtube-nocookie.com/embed/${parsed.pathname.slice(1)}`
    if (parsed.hostname.endsWith('youtube.com')) {
      const id = parsed.searchParams.get('v') || parsed.pathname.match(/\/(?:embed|shorts)\/([^/]+)/)?.[1]
      return id ? `https://www.youtube-nocookie.com/embed/${id}` : null
    }
  } catch {}
  return null
}

function Media({ value, kind, caption, zoomable = false }: { value: { mediaId?: string; url?: string }; kind: string; caption?: RichPart[]; zoomable?: boolean }) {
  const url = getMediaUrl(value.mediaId) || value.url
  const label = caption?.map(part => part.plain_text).join('') || ''
  if (!url) return <figure className="pf-media-unavailable"><span>{kind === 'image' ? 'Image currently unavailable' : 'Media currently unavailable'}</span>{label && <figcaption>{richText(caption)}</figcaption>}</figure>
  if (kind === 'image') {
    const image = <img src={url} alt={label} loading="lazy" decoding="async" />
    return <figure className="pf-figure">{zoomable ? <button type="button" className="pf-lightbox-trigger pf-zoom" data-lightbox={url} data-alt={label} data-caption={label} aria-label={label ? `Enlarge ${label}` : 'Enlarge image'}>{image}</button> : image}{label && <figcaption>{richText(caption)}</figcaption>}</figure>
  }
  if (kind === 'video') {
    const embed = youtubeEmbed(url)
    return <figure className="pf-figure pf-video">{embed ? <iframe src={embed} title={label || 'Artwork video'} loading="lazy" allowFullScreen /> : <video src={url} controls preload="metadata" />}{label && <figcaption>{richText(caption)}</figcaption>}</figure>
  }
  if (kind === 'audio') return <figure className="pf-audio"><audio src={url} controls preload="none" />{label && <figcaption>{richText(caption)}</figcaption>}</figure>
  return <a className="pf-file" href={url} target="_blank" rel="noopener noreferrer">{label || 'Open file'} ↗</a>
}

function Embed({ url, title }: { url: string; title: string }) {
  const instagram = instagramPostPermalink(url)
  if (instagram) return <InstagramPostEmbed permalink={instagram} />
  const youtube = youtubeEmbed(url)
  if (youtube) return <div className="pf-embed pf-video"><iframe src={youtube} title={title} loading="lazy" allowFullScreen /></div>
  if (/google\.[^/]+\/maps/.test(url)) {
    const mapUrl = url.replace('/edit?', '/embed?').replace('/viewer?', '/embed?')
    return <div className="pf-embed pf-map"><iframe src={mapUrl} title={title} loading="lazy" /></div>
  }
  if (/spotify\.com|soundcloud\.com|music\.youtube\.com/.test(url)) return <div className="pf-embed pf-sound"><iframe src={url} title={title} loading="lazy" /></div>
  return <a className="pf-external-link" href={url} target="_blank" rel="noopener noreferrer">{title} ↗</a>
}

function instagramPostPermalink(url: string): string | null {
  try {
    const parsed = new URL(url)
    if (!/(^|\.)instagram\.com$/.test(parsed.hostname)) return null
    const post = parsed.pathname.match(/\/(p|reel|tv)\/([A-Za-z0-9_-]+)(?:\/|$)/)
    return post ? `https://www.instagram.com/${post[1]}/${post[2]}/` : null
  } catch {
    return null
  }
}

// A row of Instagram posts: every column holds one post link and nothing else.
function instagramRow(block: NotionBlock): string[] {
  if (block.type !== 'column_list' || !block.children?.length) return []
  const links = block.children.map(column => {
    const items = (column.children || []).filter(item => !(item.type === 'paragraph' && !plainText((item.paragraph as { rich_text?: RichPart[] } | undefined)?.rich_text)))
    const url = items.length === 1 && (items[0].type === 'embed' || items[0].type === 'link_preview') ? (items[0][items[0].type] as { url?: string } | undefined)?.url : undefined
    return url ? instagramPostPermalink(url) : null
  })
  return links.every(Boolean) ? links as string[] : []
}

// A callout made only of page mentions (e.g. "Eidōla / Browse All Eidōla") is navigation, not a note.
function pageCrumbs(block: NotionBlock) {
  const parts = [block, ...(block.children || [])].flatMap(item => ((item[item.type] as { rich_text?: RichPart[] } | undefined)?.rich_text) || [])
  const meaningful = parts.filter(part => part.plain_text?.trim())
  if (meaningful.length === 0 || !meaningful.every(part => part.mention?.type === 'page' && part.mention.page?.id)) return []
  return meaningful.flatMap(part => getPage(part.mention?.page?.id || '') || [])
}

const plainText = (parts: RichPart[] = []) => parts.map(part => part.plain_text || '').join('').trim()

// A Browse All column: equation (name) + image + callout (subtitle) holding a link to the Eidōlon page.
function EidolonCard({ column }: { column: NotionBlock }) {
  const items = column.children || []
  const equation = items.find(item => item.type === 'equation')
  const image = items.find(item => item.type === 'image')
  const callout = items.find(item => item.type === 'callout' && item.children?.some(child => child.type === 'child_page'))
  const linkBlock = callout?.children?.find(child => child.type === 'child_page')
  const page = linkBlock ? getPage(linkBlock.id) : null
  if (!equation || !image || !callout || !page) return null
  const name = (equation.equation as { expression?: string } | undefined)?.expression || page.title
  const subtitle = plainText((callout.callout as { rich_text?: RichPart[] } | undefined)?.rich_text)
  const picture = image.image as { mediaId?: string; url?: string } | undefined
  const src = getMediaUrl(picture?.mediaId) || picture?.url
  return (
    <Link href={getPageHref(page)} className="pf-eidolon">
      {src ? <img src={src} alt="" loading="lazy" decoding="async" /> : <span className="pf-eidolon-empty" />}
      <span className="pf-eidolon-info">
        <strong>{name}</strong>
        {subtitle && <em>{subtitle}</em>}
      </span>
    </Link>
  )
}

function isEidolonColumn(column: NotionBlock) {
  const items = column.children || []
  return items.some(item => item.type === 'equation') && items.some(item => item.type === 'image') && items.some(item => item.type === 'callout' && item.children?.some(child => child.type === 'child_page'))
}

function Block({ block, inColumn = false, zoomable = false }: { block: NotionBlock; inColumn?: boolean; zoomable?: boolean }) {
  const value = (block[block.type] || {}) as {
    rich_text?: RichPart[]
    caption?: RichPart[]
    mediaId?: string
    url?: string
    title?: string
    checked?: boolean
    language?: string
    page_id?: string
    is_toggleable?: boolean
    expression?: string
  }
  const content = richText(value.rich_text)
  const children = block.children?.length ? <RichContent blocks={block.children} inColumn={inColumn || block.type === 'column'} zoomable={zoomable} /> : null

  // Notion headings are often used for whole sentences; set those as text, not display type.
  const headingLength = (value.rich_text || []).reduce((total, part) => total + (part.plain_text?.length || 0), 0)
  const headingClass = `pf-block-heading${headingLength > 200 ? ' is-text' : headingLength > 80 ? ' is-long' : ''}`

  switch (block.type) {
    case 'paragraph':
      return <div className="pf-block"><p>{content}</p>{children}</div>
    case 'heading_1':
    case 'heading_2':
    case 'heading_3':
    case 'heading_4': {
      const Heading = block.type === 'heading_1' ? 'h2' : block.type === 'heading_2' ? 'h3' : 'h4'
      const heading = <Heading className={headingClass}>{content}</Heading>
      if (!children) return heading
      if (value.is_toggleable) return <details className="pf-toggle pf-toggle-heading" open><summary>{heading}</summary>{children}</details>
      return <>{heading}{children}</>
    }
    case 'equation':
      return value.expression ? <p className="pf-equation">{value.expression}</p> : null
    case 'image':
    case 'video':
    case 'audio':
    case 'file':
    case 'pdf':
      return <Media value={value} kind={block.type} caption={value.caption} zoomable={zoomable} />
    case 'embed':
    case 'link_preview':
      return value.url ? <Embed url={value.url} title={value.caption?.[0]?.plain_text || 'External media'} /> : null
    case 'bookmark':
      return value.url ? <a className="pf-bookmark" href={value.url} target="_blank" rel="noopener noreferrer"><span>{value.caption?.[0]?.plain_text || value.url}</span><span>↗</span></a> : null
    case 'quote':
      return <blockquote className="pf-quote">{content}{children}</blockquote>
    case 'callout': {
      const crumbs = pageCrumbs(block)
      if (crumbs.length > 0) return <nav className="pf-crumbs" aria-label="Eidōla">{crumbs.map((page, crumbIndex) => <span key={page.id}>{crumbIndex > 0 && <span aria-hidden="true">/</span>}<Link href={getPageHref(page)}>{page.title}</Link></span>)}</nav>
      return <aside className="pf-callout">{content}{children}</aside>
    }
    case 'bulleted_list_item':
      return <div className="pf-list-item"><span aria-hidden="true">•</span><div>{content}{children}</div></div>
    case 'numbered_list_item':
      return <div className="pf-list-item"><span aria-hidden="true">—</span><div>{content}{children}</div></div>
    case 'to_do':
      return <div className="pf-list-item"><span aria-hidden="true">{value.checked ? '☑' : '□'}</span><div>{content}{children}</div></div>
    case 'toggle':
      return <details className="pf-toggle"><summary>{content}</summary>{children}</details>
    case 'divider':
      return <hr className="pf-divider" />
    case 'column_list': {
      const count = block.children?.length || 2
      const imagesOnly = count > 3 && block.children?.every(column => column.children?.length === 1 && column.children[0].type === 'image')
      return <div className={`pf-columns${imagesOnly ? ' is-images' : ''}`} style={{ '--pf-cols': imagesOnly ? 4 : Math.min(count, 3) } as React.CSSProperties}>{block.children?.map(child => <Block key={child.id} block={child} inColumn={inColumn} zoomable={zoomable} />)}</div>
    }
    case 'column':
      if (isEidolonColumn(block)) return <div className="pf-column"><EidolonCard column={block} /></div>
      return <div className="pf-column">{children}</div>
    case 'synced_block':
      return <>{children}</>
    case 'child_page': {
      const page = getPage(block.id)
      if (!page) return null
      // "Back" is an empty Notion page; send it up two levels (Browse All → the series) instead.
      const parent = page.title === 'Back' && !page.blocks.length && page.parentId ? getPage(page.parentId) : null
      const target = (parent?.parentId && getPage(parent.parentId)) || parent || page
      return <Link className="pf-child-page" href={getPageHref(target)}>{page.title}<span aria-hidden="true">{target === page ? '↗' : '←'}</span></Link>
    }
    case 'link_to_page': {
      const page = value.page_id ? getPage(value.page_id) : null
      return page ? <Link className="pf-child-page" href={getPageHref(page)}>{page.title}<span aria-hidden="true">↗</span></Link> : null
    }
    case 'code':
      return <pre className="pf-code"><code>{value.rich_text?.map(part => part.plain_text).join('')}</code></pre>
    case 'table':
      return <div className="pf-table-wrap"><table><tbody>{block.children?.map(row => {
        const rowValue = row.table_row as { cells?: RichPart[][] } | undefined
        return <tr key={row.id}>{rowValue?.cells?.map((cell, index) => <td key={index}>{richText(cell)}</td>)}</tr>
      })}</tbody></table></div>
    default:
      return value.rich_text?.length ? <div className="pf-block"><p>{content}</p>{children}</div> : children
  }
}

// Browse All lays the Eidōla out in several 3-up rows separated by dividers; pool the cards into one grid.
const eidolonColumns = (block: NotionBlock) => block.type === 'column_list' ? (block.children || []).filter(isEidolonColumn) : []
const isDividerList = (block: NotionBlock) => block.type === 'column_list' && !!block.children?.length && block.children.every(column => column.children?.every(child => child.type === 'divider'))

// Slider pictures: standalone images plus rows of three or more image-only columns. A side-by-side pair stays below the slider.
const isImageRow = (block: NotionBlock) => block.type === 'column_list' && (block.children?.length || 0) > 2 && block.children!.every(column => column.children?.length === 1 && column.children[0].type === 'image')
// The small side-by-side pair that used to follow the slider is dropped on portrait pages.
const isImagePair = (block: NotionBlock) => block.type === 'column_list' && !isImageRow(block) && !!block.children?.some(column => column.children?.some(child => child.type === 'image')) && block.children.every(column => column.children?.every(child => child.type === 'image' || isEmptyParagraph(child)))
const stackImages = (block: NotionBlock) => block.type === 'image' ? [block] : isImageRow(block) ? block.children!.map(column => column.children![0]) : []

// The caption line under each Eidōlon video: "Fire" 1/1 edition MPEG4, 39.7 MiB, 41 s, 2246 x 1592 px
const isCredit = (block: NotionBlock) => block.type === 'paragraph' && /\d+\s*x\s*\d+\s*px/.test(plainText((block.paragraph as { rich_text?: RichPart[] } | undefined)?.rich_text))
const isEmptyParagraph = (block: NotionBlock) => block.type === 'paragraph' && !plainText((block.paragraph as { rich_text?: RichPart[] } | undefined)?.rich_text) && !block.children?.length

// Streaming and social links are shown by name instead of as long raw URLs.
const platforms: [RegExp, string][] = [
  [/(^|\.)instagram\.com$/, 'Instagram'],
  [/^music\.youtube\.com$/, 'YouTube Music'],
  [/(^|\.)spotify\.com$/, 'Spotify'],
  [/^music\.apple\.com$/, 'Apple Music'],
  [/(^|\.)deezer\.com$/, 'Deezer'],
  [/(^|\.)soundcloud\.com$/, 'SoundCloud'],
]

function platformLink(block: NotionBlock): { href: string; label: string } | null {
  const value = block[block.type] as { rich_text?: RichPart[]; url?: string; caption?: RichPart[] } | undefined
  const href = block.type === 'bookmark' && !plainText(value?.caption) ? value?.url : block.type === 'paragraph' && !block.children?.length ? plainText(value?.rich_text) : undefined
  if (!href || !/^https?:\/\/\S+$/.test(href)) return null
  try {
    const host = new URL(href).hostname
    const label = platforms.find(([pattern]) => pattern.test(host))?.[1]
    return label ? { href, label } : null
  } catch {
    return null
  }
}

// Volta: rows of image-only columns under "- GALLERY" become one slider.
function galleryImages(blocks: NotionBlock[]) {
  if (!blocks.length || !blocks.every(block => block.type === 'column_list')) return []
  return blocks.flatMap(row => row.children || []).flatMap(column => column.children || []).flatMap(image => {
    const picture = image.type === 'image' ? image.image as { mediaId?: string; url?: string } | undefined : undefined
    const src = getMediaUrl(picture?.mediaId) || picture?.url
    return src ? [{ kind: 'image' as const, src, alt: '' }] : []
  })
}

// Lifts the "- GALLERY" picture rows out of the page so the page can open with them as a slider.
export function splitGallery(blocks: NotionBlock[]): { images: Slide[]; blocks: NotionBlock[] } | null {
  const holder = blocks.find(block => block.type === 'paragraph' && galleryImages(block.children || []).length > 1)
  if (!holder) return null
  return { images: galleryImages(holder.children || []), blocks: blocks.filter(block => block !== holder) }
}

export default function RichContent({ blocks, inColumn = false, zoomable = false, portrait = false, hideCrumbs = false, showcase = false }: { blocks: NotionBlock[]; inColumn?: boolean; zoomable?: boolean; portrait?: boolean; hideCrumbs?: boolean; showcase?: boolean }) {
  const content: React.ReactNode[] = []
  const cards = inColumn ? [] : blocks.flatMap(eidolonColumns)
  let gridPlaced = false
  // Portrait pages (the Eidōla) pool the video and every picture into one slider.
  const images = portrait && !inColumn ? blocks.flatMap(stackImages).flatMap(image => {
    const picture = image.image as { mediaId?: string; url?: string; caption?: RichPart[] } | undefined
    const src = getMediaUrl(picture?.mediaId) || picture?.url
    return src ? [{ kind: 'image' as const, src, alt: plainText(picture?.caption) }] : []
  }) : []
  const firstVideo = portrait && !inColumn ? blocks.findIndex(block => block.type === 'video') : -1
  // The credit moves above the slider, set off from the poem by a thin rule.
  const credit = firstVideo >= 0 ? blocks.slice(firstVideo + 1).find(isCredit) : undefined
  const video = firstVideo >= 0 ? blocks[firstVideo].video as { mediaId?: string; url?: string; caption?: RichPart[] } | undefined : undefined
  const embed = video ? youtubeEmbed(getMediaUrl(video.mediaId) || video.url || '') : null
  const creditText = credit ? plainText((credit.paragraph as { rich_text?: RichPart[] }).rich_text) : ''
  const size = creditText.match(/(\d+)\s*x\s*(\d+)\s*px/)
  // Use the stated frame when it is portrait; otherwise assume the usual 3:4 picture.
  const aspect = size && Number(size[1]) < Number(size[2]) ? `${size[1]} / ${size[2]}` : '3 / 4'
  const videoSlide = embed ? { kind: 'video' as const, id: embed.split('/embed/')[1], title: plainText(video?.caption) || 'Artwork video', aspect } : null
  const useStack = images.length > 1 || (!!videoSlide && images.length > 0)
  // Video first; the picture that used to open the slider now closes it.
  const slides = useStack ? [...(videoSlide ? [videoSlide] : []), ...images.slice(1), ...images.slice(0, 1)] : []
  const stackAt = !useStack ? -1 : videoSlide ? firstVideo : blocks.findIndex(block => stackImages(block).length > 0)
  const deferred: React.ReactNode[] = []
  for (let index = 0; index < blocks.length;) {
    const block = blocks[index]
    if (portrait && !inColumn && (isEmptyParagraph(block) || block === credit || isImagePair(block) || (hideCrumbs && block.type === 'callout' && pageCrumbs(block).length > 0))) {
      index++
      continue
    }
    if (portrait && !inColumn && block.type === 'video' && videoSlide && index === firstVideo) {
      if (credit) content.push(<p className="pf-credit" key={`${block.id}-credit`}>{richText((credit.paragraph as { rich_text?: RichPart[] }).rich_text)}</p>)
      content.push(useStack
        ? <ImageStack key={`${block.id}-stack`} items={slides} />
        : <figure className="pf-figure pf-video-portrait" key={block.id}><PortraitVideo id={videoSlide.id} title={videoSlide.title} aspect={aspect} /></figure>)
      index++
      continue
    }
    if (!inColumn && instagramRow(block).length > 0) {
      // Rows of posts (and the blank lines between them) become one unbroken grid of carousels.
      const posts: string[] = []
      let end = index
      while (end < blocks.length && (instagramRow(blocks[end]).length > 0 || isEmptyParagraph(blocks[end]))) {
        posts.push(...instagramRow(blocks[end]))
        end++
      }
      content.push(<div className="pf-instagram-grid" key={block.id}>{posts.map(post => <InstagramPostEmbed key={post} permalink={post} bare />)}</div>)
      index = end
      continue
    }
    const link = platformLink(block)
    if (link) {
      let end = index + 1
      while (end < blocks.length && platformLink(blocks[end])) end++
      content.push(<div className="pf-links" key={block.id}>{blocks.slice(index, end).flatMap(item => platformLink(item) || []).map(item => <a className="pf-chip" key={item.href} href={item.href} target="_blank" rel="noopener noreferrer">{item.label}<span aria-hidden="true">↗</span></a>)}</div>)
      index = end
      continue
    }
    if (showcase && !inColumn && block.type === 'child_page') {
      let end = index
      while (end < blocks.length && blocks[end].type === 'child_page') end++
      // A long run of sub-pages is a catalogue: show each as a card with its picture, like the works gallery.
      if (end - index > 2) {
        const pages = blocks.slice(index, end).flatMap(item => getPage(item.id) || [])
        content.push(<div className="pf-work-grid pf-catalogue" key={block.id}>{pages.map(item => <WorkCard key={item.id} work={{ id: item.id, title: item.title.trim(), href: getPageHref(item), image: getPageImage(item, true), tags: [], year: null, series: null }} />)}</div>)
        if (deferred.length > 0) content.push(<div className="pf-actions" key={`${block.id}-actions`}>{deferred.splice(0)}</div>)
        index = end
        continue
      }
      // The odd one or two sub-pages (concept text, etc.) wait until after the catalogue.
      deferred.push(<Block key={block.id} block={block} zoomable={zoomable} />)
      index++
      continue
    }
    if (useStack && stackImages(block).length > 0) {
      if (index === stackAt) content.push(<ImageStack key={block.id} items={slides} />)
      index++
      continue
    }
    if (cards.length > 0 && (eidolonColumns(block).length > 0 || isDividerList(block) || (block.type === 'paragraph' && !(block.paragraph as { rich_text?: unknown[] } | undefined)?.rich_text?.length))) {
      if (!gridPlaced && eidolonColumns(block).length > 0) {
        gridPlaced = true
        content.push(<div className="pf-eidolon-grid" key={block.id}>{cards.map(card => <EidolonCard key={card.id} column={card} />)}</div>)
      }
      index++
      continue
    }
    if (!inColumn && block.type === 'image') {
      let end = index + 1
      while (end < blocks.length && blocks[end].type === 'image') end++
      if (end - index > 1) {
        content.push(<div className="pf-image-gallery" key={block.id}>{blocks.slice(index, end).map(image => <Block key={image.id} block={image} zoomable={zoomable} />)}</div>)
        index = end
        continue
      }
    }
    content.push(<Block key={block.id} block={block} inColumn={inColumn} zoomable={zoomable} />)
    index++
  }
  if (deferred.length > 0) content.push(<div className="pf-actions" key="deferred-actions">{deferred}</div>)
  return <div className={`pf-rich-content${portrait && !inColumn ? ' is-portrait' : ''}`}>{content}</div>
}
