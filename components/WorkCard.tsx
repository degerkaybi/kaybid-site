import Link from 'next/link'
import HoverGif from './HoverGif'

export type WorkCardData = {
  id: string
  title: string
  href: string
  image: string | null
  still?: string | null
  tags: string[]
  year: string | null
  series: string | null
  hasSubPages?: boolean
  summary?: string
  // Shown beside the title on the Works page (e.g. who made it with the artist).
  titleNote?: string
}

export default function WorkCard({ work, featured = false, catalogue = false }: { work: WorkCardData; featured?: boolean; catalogue?: boolean }) {
  const displaySeries = work.series?.replace(/\s*:\|\|\s*$/, '')
  // Works page: title under the picture, with no description and no year (the list view carries it).
  if (catalogue) {
    return (
      <Link href={work.href} className={`pf-work-card pf-work-card-catalogue ${work.hasSubPages ? 'pf-work-card-has-subpages' : ''}`}>
        <div className="pf-work-card-media">
          {work.image && work.still ? <HoverGif src={work.image} still={work.still} label={work.hasSubPages ? 'Series' : undefined} /> : (
            <div className="pf-work-card-image">
              {work.image ? <img src={work.image} alt="" loading="lazy" decoding="async" /> : <span className="pf-image-placeholder">KAYBID</span>}
              <span className={`pf-card-arrow${work.hasSubPages ? ' is-labelled' : ''}`} aria-hidden="true">{work.hasSubPages && 'Series '}<span className="pf-arrow-glyph">→</span></span>
            </div>
          )}
        </div>
        <div className="pf-work-card-info"><div><h3>{work.title}{work.titleNote && <span className="pf-card-title-note"> · {work.titleNote}</span>}</h3></div></div>
      </Link>
    )
  }
  return (
    <Link href={work.href} className={`pf-work-card ${featured ? 'pf-work-card-featured' : ''} ${work.hasSubPages ? 'pf-work-card-has-subpages' : ''}`}>
      {work.image && work.still ? <HoverGif src={work.image} still={work.still} label={work.hasSubPages ? 'Series' : undefined} /> : (
        <div className="pf-work-card-image">
          {work.image ? <img src={work.image} alt="" loading="lazy" decoding="async" /> : <span className="pf-image-placeholder">KAYBID</span>}
          <span className={`pf-card-arrow${work.hasSubPages ? ' is-labelled' : ''}`} aria-hidden="true">{work.hasSubPages && 'Series '}<span className="pf-arrow-glyph">→</span></span>
        </div>
      )}
      <div className="pf-work-card-info">
        <div>
          <h3>{work.title}{work.titleNote && <span className="pf-card-title-note"> · {work.titleNote}</span>}</h3>
          {displaySeries && displaySeries !== work.title && <p className="pf-card-series">{displaySeries}</p>}
        </div>
        {work.year && <span className="pf-card-year">{work.year}</span>}
      </div>
      {featured && <div className="pf-card-tags">{work.tags.slice(0, 3).join(' · ')}</div>}
    </Link>
  )
}
