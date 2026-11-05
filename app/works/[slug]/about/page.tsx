import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RichContent from '@/components/RichContent'
import { eidolaId, getAllWorks, getPage, getPageHref, getWorkBySlug } from '@/lib/portfolio'
import { textLang } from '@/lib/locale'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllWorks().filter(work => work.page.id === eidolaId).map(work => ({ slug: work.slug }))
}

export const dynamicParams = false

export const metadata: Metadata = { title: 'About Eidōla' }

export default async function EidolaAboutPage({ params }: Props) {
  const work = getWorkBySlug((await params).slug)
  if (!work || work.page.id !== eidolaId) notFound()
  const browseBlock = work.page.blocks.find(block => block.type === 'child_page')
  const browsePage = browseBlock ? getPage(browseBlock.id) : null
  // The landing page carries the title and the browse link; everything else is the "About Eidōla" body.
  const blocks = work.page.blocks.filter((block, index) => block.type !== 'child_page' && !(index === 0 && block.type === 'heading_1'))

  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/works">Works</Link><span>/</span><Link href={work.href}>{work.page.title}</Link><span>/</span><span>About</span></nav>
      <header className="pf-detail-header">
        <div><p className="pf-eyebrow" lang={textLang(work.page.title)}>{work.page.title.toLocaleUpperCase(textLang(work.page.title))}</p><h1>About Eidōla</h1></div>
      </header>
      <div className="pf-detail-content"><RichContent blocks={blocks} /></div>
      {browsePage && <div className="pf-eidola-about-nav"><Link className="pf-eidola-option is-primary" href={getPageHref(browsePage)}><span>THE PAINTINGS</span><strong>Browse All Eidōla <span aria-hidden="true">↗</span></strong></Link></div>}
    </div>
  )
}
