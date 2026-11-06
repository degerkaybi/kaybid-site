import type { Metadata } from 'next'
import Link from 'next/link'
import AboutTabs from '@/components/AboutTabs'
import ArtistBio from '@/components/ArtistBio'
import ExhibitionList from '@/components/ExhibitionList'
import { getAboutParts } from '@/lib/exhibitions'
import RichContent, { YouTubeFilm } from '@/components/RichContent'

export const metadata: Metadata = { title: 'About' }

// The film at the end of the page.
const aboutVideo = 'https://www.youtube.com/watch?v=WyjQgpMvEt8'

export default function AboutPage() {
  const parts = getAboutParts()
  const exhibitions = parts?.exhibitions || []
  const extra = parts?.extra || []
  return (
    <div className="pf-page-shell pf-section-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">THE ARTIST</p>
        <h1>About</h1>
      </div>
      <AboutTabs current="about" />
      <div className="pf-section-body">
        <ArtistBio />
        {exhibitions.length > 0 && (
          <section className="pf-exhibitions-preview" aria-labelledby="recent-exhibitions">
            <h2 id="recent-exhibitions" className="pf-block-heading">Recent exhibitions</h2>
            <ExhibitionList items={exhibitions.slice(0, 5)} />
            <Link href="/about/exhibitions" className="pf-chip">All exhibitions <span aria-hidden="true">↗</span></Link>
          </section>
        )}
        {extra.length > 0 && <RichContent blocks={extra} />}
        <div className="pf-embed pf-video"><YouTubeFilm url={aboutVideo} title="Kaybid" /></div>
      </div>
    </div>
  )
}
