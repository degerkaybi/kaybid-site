import type { DesktopWork } from '@/components/WorkDesktop'
import { eidolaId, getMainWorks, getPageImages, getPageSummary, hasWorkSubPages, silentStepsId, voltaId } from '@/lib/portfolio'

export const desktopFilters = ['Installation', 'Street Art', 'Collage', 'Animation', 'Sculpture', 'Painting', 'Sound', 'Digital', 'Assemblage', 'Exhibition']

// First in line when the table is tidied; everything after these is shuffled.
const tidyOrder = [
  silentStepsId,
  voltaId,
  eidolaId,
  '25f39248-8fe5-80df-ac77-ca4a82b720c4', // Paris Olympics, 2024
  '22a39248-8fe5-803f-a915-f0b8c5bd2ebe', // Milan Ed. Silent Steps/Night Watch
  '22a39248-8fe5-80c8-aae6-fcdebd717fb8', // Silent Steps “PANDA”
  '30239248-8fe5-8018-85f0-d341175edced', // UpCycle X Silent Steps
]

export function getDesktopWorks(): DesktopWork[] {
  // Each project gets one icon; its child pages live on the project page.
  return getMainWorks().map(work => {
    const images = [work.image, ...getPageImages(work.page, 4)].filter((image, index, all): image is string => !!image && all.indexOf(image) === index).slice(0, 3)
    return {
      id: work.page.id,
      title: work.page.title.replace(/\s*:\|\|\s*$/, '') + (work.titleNote ? ` · ${work.titleNote}` : ''),
      href: work.href,
      image: work.still || work.image,
      tags: work.tags,
      year: work.year,
      series: work.series,
      rank: tidyOrder.includes(work.page.id) ? tidyOrder.indexOf(work.page.id) : null,
      hasSubPages: hasWorkSubPages(work),
      summary: getPageSummary(work.page) || work.excerpt,
      previews: images,
    }
  })
}
