import type { Metadata } from 'next'
import Link from 'next/link'
import InstagramPostEmbed from '@/components/InstagramPostEmbed'
import { monxCover, monxImages, monxPost } from '@/lib/editions'

const title = 'Kaybid X monx.culture'

// Not for search engines: no indexing, no following, no cached copy.
export const metadata: Metadata = {
  title,
  robots: { index: false, follow: false, nocache: true, googleBot: { index: false, follow: false, noimageindex: true } },
}

// Laid out like the other pages under Editions: breadcrumb, archive header, then the content.
export default function MonxPage() {
  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/editions">Editions</Link><span>/</span><span>{title}</span></nav>
      <header className="pf-detail-header"><div><p className="pf-eyebrow">FROM THE ARCHIVE</p><h1 lang="en">{title}</h1></div></header>
      <div className="pf-detail-content">
        <div className="pf-rich-content">
          <figure className="pf-figure"><img src={monxCover} alt={title} /></figure>
          <InstagramPostEmbed permalink={monxPost} showLink={false} />
          <div className="pf-image-gallery">
            {monxImages.map((src, index) => <figure className="pf-figure" key={src}><img src={src} alt={`${title}, photo ${index + 1}`} loading="lazy" /></figure>)}
          </div>
        </div>
      </div>
    </div>
  )
}
