import type { Metadata } from 'next'
import Link from 'next/link'
import { upcycleImages, upcycleQuote } from '@/lib/editions'

const title = 'Kaybid X UpCycle'

export const metadata: Metadata = {
  title,
  description: 'Şehirde Fil Var! Kaybid’s paper elephants from the Silent Steps series at the Upcycle Istanbul Festival, Terminal Kadıköy.',
}

// Laid out like the other pages under Editions: breadcrumb, archive header, then the content.
export default function UpcyclePage() {
  const [heading, ...paragraphs] = upcycleQuote
  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/editions">Editions</Link><span>/</span><span>{title}</span></nav>
      <header className="pf-detail-header"><div><p className="pf-eyebrow">COLLABORATION</p><h1 lang="en">{title}</h1></div></header>
      <div className="pf-detail-content">
        <div className="pf-rich-content">
          <figure className="pf-figure"><img src={upcycleImages[0]} alt={title} /></figure>
          <blockquote className="pf-quote" lang="tr">
            <p><strong>{heading}</strong></p>
            {paragraphs.map(text => <p key={text}>{text}</p>)}
          </blockquote>
          <figure className="pf-figure"><img src={upcycleImages[1]} alt={`${title}, Şehirde Fil Var!`} loading="lazy" /></figure>
        </div>
      </div>
    </div>
  )
}
