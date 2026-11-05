import type { Metadata } from 'next'
import DesktopModal from '@/components/DesktopModal'
import WorkExplorer from '@/components/WorkExplorer'
import { desktopFilters, getDesktopWorks } from '@/lib/desktop'
import { filters, getMainWorks, getPage, getPageImages, getStillImage, hasWorkSubPages, silentStepsId, voltaId } from '@/lib/portfolio'
import { getSilentSteps } from '@/lib/silent-steps'

export const metadata: Metadata = { title: 'Works' }

// Reorder these IDs to change the cards on /works. New works not listed here appear afterward.
const workOrder = [
  '62d2c83c-d0e0-4654-90db-610ddb78bfc7', // Silent Steps Series
  '22a39248-8fe5-80c8-aae6-fcdebd717fb8', // Silent Steps “PANDA”
  '25f39248-8fe5-80df-ac77-ca4a82b720c4', // Paris Olympics, 2024
  'added-arsa-payi', // Arsa Payı
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe', // Milan Ed. Silent Steps/Night Watch
  '30239248-8fe5-8018-85f0-d341175edced', // UpCycle X Silent Steps
  '1b039248-8fe5-80f7-9589-d1dd2ffbba93', // Volta
  'da5cf4ff-a5a7-4d81-b2b4-651d85c9a9d8', // Eidōla
  'f4ec0763-6c97-4df6-88d6-4ff6631ec26c', // Somewhere
  '22a39248-8fe5-8077-8278-ccc0674023b1', // Rabbit H0le
  '25f39248-8fe5-80b9-9041-d50804c968cf', // Just Because You're Paranoid
  '25f39248-8fe5-806f-bada-c95b0519b8f6', // G.O.T.
  '25f39248-8fe5-8048-97c3-e58496e8b2cd', // Hope
  '2e639248-8fe5-80cc-a7c3-c51c30088b4e', // Re-Map
  '26c39248-8fe5-80ae-a265-ee5989cd0311', // One Of Us
  '33239248-8fe5-8018-b85b-cbdb6ba6e03f', // İstek Şarkı Çalmayı Katiyen Reddeden Müzisyen Heykeli
  '33239248-8fe5-80b8-95e0-c3971654c746', // Find What You Love and Let It Kill You
  '33239248-8fe5-8035-b6e9-ceb07a9c84fd', // Jinns – Bent Souls
  '3ec39248-8fe5-8095-845c-f590582f19c9', // Re-Cower
  'bd62c75c-ff0b-4b11-a857-1ea394db1d59', // Night Watch
  '4902f670-013a-4661-8234-1cc6d94f00d4', // Night Watch Bull Run Edition
  '22a39248-8fe5-80f2-8c33-e898a8fc01a6', // Mamut Art
  '22a39248-8fe5-8050-8c6f-d28fd81cb677', // Faces
  'added-back-to-the-commencis', // Back To The Commencis
  'added-human-zer0', // Human Zer0
]

export default function WorksPage() {
  const order = new Map(workOrder.map((id, index) => [id, index] as const))
  const works = getMainWorks().sort((a, b) =>
    (order.get(a.page.id) ?? Number.MAX_SAFE_INTEGER) - (order.get(b.page.id) ?? Number.MAX_SAFE_INTEGER)
  )
  const birdPage = getPage('1bf39248-8fe5-80b1-86bd-f1e5cdfcb4f1') // The Bird at Table Nine
  const voltaCardImage = birdPage ? getPageImages(birdPage, 1)[0] : null
  const penguinCardImage = getSilentSteps()?.years.flatMap(year => year.items).find(item => item.name === 'Penguin')?.src
  const summaries = works.map(work => {
    const cover = work.page.id === voltaId ? voltaCardImage : work.page.id === silentStepsId ? penguinCardImage : null
    return {
      id: work.page.id,
      title: work.page.title.replace(/\s*:\|\|\s*$/, ''),
      titleNote: work.titleNote,
      href: work.href,
      image: cover || work.image,
      still: cover ? getStillImage(cover) : work.still,
      tags: work.tags,
      year: work.year,
      series: work.series,
      summary: work.summary,
      hasSubPages: hasWorkSubPages(work),
      searchText: `${work.page.title} ${work.series || ''} ${work.tags.join(' ')} ${work.summary}`.toLocaleLowerCase(),
    }
  })

  return (
    <div className="pf-page-shell pf-works-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">KAYBID / PORTFOLIO</p>
        <h1>Works</h1>
        <p>Across streets, images, motion, objects and sound. Each work can belong to more than one practice.</p>
        <DesktopModal works={getDesktopWorks()} filters={desktopFilters} />
      </div>
      <WorkExplorer works={summaries} filters={filters} />
    </div>
  )
}
