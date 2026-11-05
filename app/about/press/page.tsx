import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AboutTabs from '@/components/AboutTabs'
import Lightbox from '@/components/Lightbox'
import PressGallery from '@/components/PressGallery'
import { getSection } from '@/lib/portfolio'
import { getPressLinks } from '@/lib/press'

export const metadata: Metadata = { title: 'Press' }

export default function PressPage() {
  const page = getSection('press')
  if (!page) notFound()
  // Pictures and video come first, up to the divider; the addresses after it are shown as buttons.
  const divider = page.blocks.findIndex(block => block.type === 'divider')
  const media = divider >= 0 ? page.blocks.slice(0, divider) : page.blocks.filter(block => block.type !== 'paragraph')
  const links = getPressLinks()
  return (
    <div className="pf-page-shell pf-section-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">SELECTED COVERAGE</p>
        <h1>Press</h1>
        <p>Articles, interviews and broadcasts featuring Kaybid&apos;s work.</p>
      </div>
      <AboutTabs current="press" />
      <div className="pf-section-body">
        <Lightbox>
          <div className="pf-press-layout">
            <PressGallery blocks={media} />
            {links.length > 0 && (
              <ul className="pf-press-links">
                {links.map(item => <li key={item.href}><a href={item.href} target="_blank" rel="noopener noreferrer">{item.label}<span aria-hidden="true">↗</span></a></li>)}
              </ul>
            )}
          </div>
        </Lightbox>
      </div>
      <Link href="/works" className="pf-back-link">Explore the works <span aria-hidden="true">↗</span></Link>
    </div>
  )
}
