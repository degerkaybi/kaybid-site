import Link from 'next/link'
import Lightbox from './Lightbox'
import RichContent from './RichContent'
import { type PortfolioPage } from '@/lib/portfolio'
import { textLang } from '@/lib/locale'

export default function SectionLayout({ page, eyebrow, title, introduction, zoomable = false, portrait = false, before }: { page: PortfolioPage; eyebrow: string; title: string; introduction?: string; zoomable?: boolean; portrait?: boolean; before?: React.ReactNode }) {
  const hero = (
    <div className="pf-page-hero">
      <p className="pf-eyebrow">{eyebrow}</p>
      <h1 lang={textLang(title)}>{title}</h1>
      {introduction && <p>{introduction}</p>}
    </div>
  )
  const body = (
    <div className={`pf-section-body${portrait ? ' is-portrait' : ''}`}>
      {zoomable ? <Lightbox><RichContent blocks={page.blocks} zoomable /></Lightbox> : <RichContent blocks={page.blocks} portrait={portrait} />}
    </div>
  )
  return (
    <div className="pf-page-shell pf-section-page">
      {portrait ? <>{before}<div className="pf-portrait-page">{hero}{body}</div></> : <>{hero}{before}{body}</>}
      <Link href="/works" className="pf-back-link">Explore the works <span aria-hidden="true">↗</span></Link>
    </div>
  )
}
