import { getMediaUrl, getPage, getPageHref, getSection, type ContentBlock } from '@/lib/portfolio'

export type EditionStatus = 'available' | 'free' | 'sold-out' | 'collaboration'

export type Edition = {
  id: string
  title: string
  status: EditionStatus
  // Out of stock, whatever the badge says (the WWF collaboration is both).
  soldOut: boolean
  image: string | null
  description: string
  // Page with more about the edition, and an outside link (e.g. GIPHY), when there is one.
  href: string | null
  hrefLabel: string | null
  external: string | null
  externalLabel: string | null
}

// The monx.culture × Kaybid page and the Instagram post it shows. The page itself stays out of search engines.
export const monxPage = '/editions/kaybid-x-m-c'
export const monxCover = 'https://res.cloudinary.com/epzod3uc/image/upload/v1793886759/Ekran_g%C3%B6r%C3%BCnt%C3%BCs%C3%BC_2026-11-05_165140_rslw9i.png'
export const monxPost = 'https://www.instagram.com/monx.culture/p/DadYeNPCn1p/?img_index=6'
// The photos in Cloudinary under KBD/Monk/Kimo, in the order they were taken. Resized and re-encoded by Cloudinary: the originals are 2000px+ JPEGs.
const monxPhoto = (version: string, id: string) => `https://res.cloudinary.com/epzod3uc/image/upload/f_auto,q_auto,w_1600/v${version}/${id}.jpg`
export const monxImages = [
  monxPhoto('1794334001', '20260310_170913_nszbsc'),
  monxPhoto('1794334087', '20260310_170915_v6lzkg'),
  monxPhoto('1794333924', '20260310_170927_bwlzpa'),
  monxPhoto('1794334044', '20260310_170936_sze7gz'),
]

// The Kaybid X UpCycle page: the "Şehirde Fil Var!" installation at the Upcycle Istanbul Festival. The first picture is the card cover.
export const upcyclePage = '/editions/kaybid-x-upcycle'
export const upcycleImages = [
  'https://res.cloudinary.com/epzod3uc/image/upload/v1793892172/Bu_sene_festival_bitti%C4%9Finde_ve_Terminal_Kad%C4%B1k%C3%B6y_%C3%BCn_kap%C4%B1lar%C4%B1_bizim_i%C3%A7in_kapand%C4%B1%C4%9F%C4%B1nda_modern_zama_2_vrpf5o.jpg',
  'https://res.cloudinary.com/epzod3uc/image/upload/v1793892153/Ekran_g%C3%B6r%C3%BCnt%C3%BCs%C3%BC_2026-11-05_182012_ysdgc1.png',
]
export const upcycleQuote = [
  'Şehirde Fil Var! 🐘',
  'Upcycle Istanbul Festivali boyunca Terminal Kadıköy’de karşınıza çıkabilecek bu gizli misafirler, yalnızca bir sanat yerleştirmesi değil; aynı zamanda şehirle, doğayla ve kaybettiklerimizle kurduğumuz ilişkinin sessiz bir hatırlatıcısı.',
  'Sanatçı Kaybid’in “Sessiz Adımlar” serisi kapsamında, tamamı atık kağıtlardan ileri dönüşüm tekniğiyle üretilen filler; festival alanında, terminal çevresinde aniden karşınıza çıkabilir. Şehir yaşamında görmeye alışık olmadığımız bu devasa yaban hayvanları, bu kez sokaklarda bizimle birlikte yürüyor.',
  'Kaybid, yalnızca ellerini kullanarak oluşturduğu kolajlarla; şehirlerde yaşam alanı giderek daralan vahşi hayvanları yeniden görünür kılıyor. Her bir figür için hazırlanan onlarca kolaj ve kare kare oluşturulan animasyonlar, doğanın şehirde bıraktığı sessiz izlere dönüşüyor.',
  'Ve şimdi sıra sizde!',
  'Festival boyunca filleri bulun, fotoğraf çekin, paylaşımınızda festivali etiketleyin ve “Şehirde Fil Var!” oyununun 33 kazananından biri olun. Kaybid merchleri sizi bekliyor. ♻️✨',
]

type Part = { plain_text?: string }

const plain = (block: ContentBlock) =>
  (((block[block.type] as { rich_text?: Part[] } | undefined)?.rich_text) || []).map(part => part.plain_text || '').join('').trim()

function descendants(blocks: ContentBlock[]): ContentBlock[] {
  return blocks.flatMap(block => [block, ...descendants(block.children || [])])
}

// The Notion page lists each edition as "〉 Title - Sold Out!" followed by a two-column block (picture | text).
// Read that into product data so the page can lay it out as a shop.
export function getEditions(): Edition[] {
  const page = getSection('art-ideas')
  if (!page) return []
  const editions: Edition[] = []
  page.blocks.forEach((block, index) => {
    if (block.type !== 'heading_1') return
    const heading = plain(block).replace(/^[〈〉〈〉>\s]+/, '')
    const soldOut = /sold\s*out/i.test(heading)
    const title = heading.replace(/\s*[-–—]\s*sold\s*out!?\s*$/i, '').trim()
    const content: ContentBlock[] = []
    for (let next = index + 1; next < page.blocks.length && page.blocks[next].type !== 'heading_1'; next++) content.push(...descendants([page.blocks[next]]))

    const picture = content.find(item => item.type === 'image')?.image as { mediaId?: string; url?: string } | undefined
    const texts = content.filter(item => item.type === 'paragraph').map(plain).filter(Boolean)
    const external = texts.find(text => /^https?:\/\/\S+$/.test(text)) || null
    const description = texts.filter(text => text !== external && !text.endsWith(':')).join('\n\n')
    const child = content.find(item => item.type === 'child_page')
    const childPage = child ? getPage(child.id) : null

    editions.push({
      id: block.id,
      title,
      soldOut,
      // The WWF cooperation is a collaboration that is also sold out.
      status: /WWF/.test(title) ? 'collaboration' : soldOut ? 'sold-out' : external ? 'free' : 'available',
      image: getMediaUrl(picture?.mediaId) || picture?.url || null,
      description,
      href: childPage ? getPageHref(childPage) : null,
      hrefLabel: childPage ? 'Details' : null,
      external,
      externalLabel: external ? 'Open on GIPHY' : null,
    })
  })
  editions.push({
    id: 'kaybid-x-m-c',
    title: 'Kaybid X monx.culture',
    status: 'collaboration',
    soldOut: false,
    image: monxCover,
    description: 'A collaboration between Kaybid and monx.culture.',
    href: monxPage,
    hrefLabel: 'Details',
    external: null,
    externalLabel: null,
  })
  editions.push({
    id: 'kaybid-x-upcycle',
    title: 'Kaybid X UpCycle',
    status: 'collaboration',
    soldOut: false,
    image: upcycleImages[0],
    description: 'Şehirde Fil Var! Paper elephants from the Silent Steps series at the Upcycle Istanbul Festival, Terminal Kadıköy.',
    href: upcyclePage,
    hrefLabel: 'Details',
    external: null,
    externalLabel: null,
  })
  return editions
}
