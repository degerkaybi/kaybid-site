import { getSection, type ContentBlock } from '@/lib/portfolio'

export type PressLink = { label: string; href: string }

// Outlet names for the addresses on the Press page; anything else falls back to its domain.
const outlets: Record<string, string> = {
  'trt2.com.tr': 'TRT 2',
  'tr.wikipedia.org': 'Wikipedia',
  'mimarizm.com': 'Mimarizm',
  'commencis.com': 'Commencis',
  'gazetekadikoy.com.tr': 'Gazete Kadıköy',
  'madeinshoreditch.co.uk': 'Made in Shoreditch',
  'bantmag.com': 'BANT Mag',
  'birgun.net': 'BirGün',
  'meinweisserelefant.de': 'Mein Weißer Elefant',
  'artfulliving.com.tr': 'Artful Living',
  'hurriyet.com.tr': 'Hürriyet',
  'magmadergisi.com': 'Magma',
  'oggito.com': 'Oggito',
  'aposto.com': 'Aposto',
  'dergipark.org.tr': 'DergiPark',
  'artdogistanbul.com': 'Art Doğ İstanbul',
  'bienal.iksv.org': 'Istanbul Biennial',
  'mamutartproject.com': 'Mamut Art Project',
  'dadanizm.com': 'Dadanizm',
}

// Every article address listed as plain text on the Press page, by outlet.
export function getPressLinks(): PressLink[] {
  const page = getSection('press')
  if (!page) return []
  const flat = (blocks: ContentBlock[]): ContentBlock[] => blocks.flatMap(block => [block, ...flat(block.children || [])])
  const links: PressLink[] = []
  for (const block of flat(page.blocks)) {
    if (block.type !== 'paragraph') continue
    const text = ((block.paragraph as { rich_text?: { plain_text?: string }[] } | undefined)?.rich_text || []).map(part => part.plain_text || '').join('').trim()
    // A paragraph can hold several addresses, one per line.
    for (const address of text.match(/https?:\/\/\S+/g) || []) {
      try {
        const host = new URL(address).hostname.replace(/^www\./, '')
        if (!links.some(link => link.href === address)) links.push({ label: outlets[host] || host, href: address })
      } catch {}
    }
  }
  return links
}
