import Link from 'next/link'
import RichContent from '@/components/RichContent'
import EidolaGifSection from '@/components/EidolaGifSection'
import { getPage, type ContentBlock, type Work } from '@/lib/portfolio'

export function eidolaIntro(blocks: ContentBlock[]): string {
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
  // The former "Browse All Eidōla" page now opens the landing page: its grid of paintings, without the trailing "Back" link.
  const grid = (browsePage?.blocks || []).filter(block => block.type !== 'child_page')
  const intro = eidolaIntro(work.page.blocks)

  return (
    <>
      {grid.length > 0 && <div className="pf-detail-content"><RichContent blocks={grid} /></div>}
      <EidolaGifSection />
      <EidolaGifSection group="halloween" />
      <div className="pf-eidola-about-nav">
        <Link href={`${work.href}/about`} className="pf-eidola-option is-primary">
          <span>THE SERIES</span>
          <strong>About Eidōla <span aria-hidden="true">→</span></strong>
        </Link>
      </div>
      <div className="pf-eidola-feature">
        <div className="pf-eidola-cover"><img src="/eidola-cover.webp" alt="Eidōla — a painted face with wide eyes and fangs" /></div>
        {intro && <p className="pf-detail-lead">{intro}</p>}
      </div>
    </>
  )
}
