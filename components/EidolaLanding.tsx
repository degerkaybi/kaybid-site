import Link from 'next/link'
import { getPage, getPageHref, type NotionBlock, type Work } from '@/lib/portfolio'

export function eidolaIntro(blocks: NotionBlock[]): string {
  for (const block of blocks) {
    const text = ((block[block.type] as { rich_text?: { plain_text?: string }[] } | undefined)?.rich_text || []).map(part => part.plain_text || '').join('').trim()
    if (block.type === 'paragraph' && text.startsWith('In this series')) return text
    const nested = block.children ? eidolaIntro(block.children) : ''
    if (nested) return nested
  }
  return ''
}

export default function EidolaLanding({ work }: { work: Work }) {
  const browseBlock = work.page.blocks.find(block => block.type === 'child_page')
  const browsePage = browseBlock ? getPage(browseBlock.id) : null
  const intro = eidolaIntro(work.page.blocks)

  return (
    <>
      <div className="pf-eidola-cover"><img src="/eidola-cover.webp" alt="Eidōla — a painted face with wide eyes and fangs" /></div>
      {intro && <p className="pf-detail-lead">{intro}</p>}
      <nav className="pf-eidola-options" aria-label="Eidōla">
        <Link href={`${work.href}/about`} className="pf-eidola-option">
          <span>THE SERIES</span>
          <strong>About Eidōla <span aria-hidden="true">↗</span></strong>
        </Link>
        {browsePage && (
          <Link href={getPageHref(browsePage)} className="pf-eidola-option is-primary">
            <span>THE PAINTINGS</span>
            <strong>Browse All Eidōla <span aria-hidden="true">↗</span></strong>
          </Link>
        )}
      </nav>
    </>
  )
}
