import Link from 'next/link'
import WorkCard from '@/components/WorkCard'
import HomeHeroVideo from '@/components/HomeHeroVideo'
import { getFeaturedWorks, getMainWorks, getPage, getPageImages, getStillImage, hasWorkSubPages, silentStepsId, voltaId } from '@/lib/portfolio'
import { getSilentSteps } from '@/lib/silent-steps'

// "More to explore" on the home page, in this order.
const recentIds = [
  '30239248-8fe5-8018-85f0-d341175edced', // UpCycle X Silent Steps
  'f4ec0763-6c97-4df6-88d6-4ff6631ec26c', // Somewhere
  '25f39248-8fe5-80df-ac77-ca4a82b720c4', // Paris Olympics, 2024
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe', // Milan Ed. Silent Steps/Night Watch
]

export default function HomePage() {
  const featured = getFeaturedWorks()
  const main = getMainWorks()
  const recent = recentIds.flatMap(id => main.find(work => work.page.id === id) || [])
  const penguinCardImage = getSilentSteps()?.years.flatMap(year => year.items).find(item => item.name === 'Penguin')?.src
  const birdPage = getPage('1bf39248-8fe5-80b1-86bd-f1e5cdfcb4f1') // The Bird at Table Nine
  const voltaCardImage = birdPage ? getPageImages(birdPage, 1)[0] : null

  return (
    <>
      <HomeHeroVideo />

      <section id="featured-work" className="pf-featured-section" aria-labelledby="featured-heading">
        <div className="pf-section-intro">
          <p className="pf-eyebrow">SELECTED SERIES</p>
          <h2 id="featured-heading">Street, studio,<br />screen.</h2>
          <p>Projects that develop over time, across the street, the studio and the screen.</p>
        </div>
        <div className="pf-featured-grid">
          {featured.map((work, index) => {
            const cover = work.page.id === voltaId ? voltaCardImage : work.page.id === silentStepsId ? penguinCardImage : null
            return (
              <div className="pf-featured-item" key={work.page.id}>
                <span className="pf-featured-number">0{index + 1}</span>
                <WorkCard featured work={{ id: work.page.id, title: work.page.title.replace(/\s*:\|\|\s*$/, ''), titleNote: work.titleNote, href: work.href, image: cover || work.image, still: cover ? getStillImage(cover) : work.still, tags: work.tags, year: work.year, series: work.series, hasSubPages: hasWorkSubPages(work) }} />
              </div>
            )
          })}
        </div>
      </section>

      <section className="pf-home-works" aria-labelledby="recent-heading">
        <div className="pf-section-heading">
          <div><p className="pf-eyebrow">FROM THE ARCHIVE</p><h2 id="recent-heading">More to explore.</h2></div>
          <Link href="/works" className="pf-text-link">VIEW ALL WORKS <span aria-hidden="true">↗</span></Link>
        </div>
        <div className="pf-work-grid">
          {recent.map(work => <WorkCard key={work.page.id} work={{ id: work.page.id, title: work.page.title, titleNote: work.titleNote, href: work.href, image: work.image, still: work.still, tags: work.tags, year: work.year, series: work.series, hasSubPages: hasWorkSubPages(work) }} />)}
        </div>
      </section>
    </>
  )
}
