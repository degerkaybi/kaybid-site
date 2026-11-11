import type { Metadata } from 'next'
import { Fragment } from 'react'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import ImageStack from '@/components/ImageStack'
import SubNav from '@/components/SubNav'
import RichContent, { splitGallery } from '@/components/RichContent'
import SilentStepsContent from '@/components/SilentStepsContent'
import WorkCard from '@/components/WorkCard'
import EidolaLanding from '@/components/EidolaLanding'
import { eidolaId, filters, getAllWorks, isAddedWork, getPage, getPageHref, getRelatedWorks, getWorkBySlug, hasWorkSubPages, silentStepsId, splitLeadImage, voltaId, type ContentBlock, type PortfolioPage } from '@/lib/portfolio'
import { getSilentSteps } from '@/lib/silent-steps'
import { textLang } from '@/lib/locale'

const pandaId = '22a39248-8fe5-80c8-aae6-fcdebd717fb8'
const facesId = '22a39248-8fe5-8050-8c6f-d28fd81cb677'

const blockText = (block: ContentBlock) => (((block[block.type] as { rich_text?: { plain_text?: string }[] } | undefined)?.rich_text) || []).map(part => part.plain_text || '').join('').trim()

// Faces opens straight into its Instagram carousels: no lead picture, and no copied site menu or empty tail at the end.
function facesBlocks(blocks: ContentBlock[]) {
  const lead = blocks.findIndex(block => block.type === 'image')
  // A lone Instagram embed is set as a one-post row so it gets the same bare carousel frame as the rest.
  const kept = blocks
    .filter((block, index) => index !== lead && !(block.type === 'paragraph' && /^Home\s*\|\s*About/.test(blockText(block))))
    .map((block): ContentBlock => block.type === 'embed' ? { id: `${block.id}-row`, type: 'column_list', children: [{ id: `${block.id}-column`, type: 'column', children: [block] }] } : block)
  while (kept.length && (kept[kept.length - 1].type === 'divider' || (kept[kept.length - 1].type === 'paragraph' && !blockText(kept[kept.length - 1])))) kept.pop()
  return kept
}

type Props = { params: Promise<{ slug: string }> }

// Every valid slug is prerendered at build time; unknown slugs are a static 404, never a function call.
export const dynamicParams = false

const hasImage = (blocks: ContentBlock[]): boolean => blocks.some(block => block.type === 'image' || (!!block.children && hasImage(block.children)))

export function generateStaticParams() {
  return getAllWorks().filter(work => work.href.startsWith('/works/')).map(work => ({ slug: work.slug }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const work = getWorkBySlug((await params).slug)
  const description = work?.page.id === silentStepsId ? getSilentSteps()?.lead : work?.excerpt
  return { title: work ? `${work.page.title}${work.titleNote ? ` · ${work.titleNote}` : ''}` : 'Work', description: description || undefined }
}

export default async function WorkPage({ params }: Props) {
  const work = getWorkBySlug((await params).slug)
  if (!work) notFound()
  // The Eidōla keep their own pages; they only appear in the works list.
  if (!work.href.startsWith('/works/')) redirect(work.href)
  const related = getRelatedWorks(work)
  const silentSteps = work.page.id === silentStepsId ? getSilentSteps() : null
  // Sub-pages (the Volta songs) show their parents: Works / Kaybid Records “Volta“ / Song.
  const trail: PortfolioPage[] = []
  for (let ancestor = work.page.parentId ? getPage(work.page.parentId) : null; ancestor?.parentId; ancestor = getPage(ancestor.parentId)) trail.unshift(ancestor)
  const lead = splitLeadImage(work.page)
  // Volta opens with its gallery as a slider instead of a single cover picture.
  const gallery = work.page.id === voltaId ? splitGallery(work.page.blocks) : null
  // The Volta songs show the picture that is already in their text, not a second one in a beige header.
  const plainHeader = work.page.parentId === voltaId && hasImage(work.page.blocks)
  // Panda opens straight into its text and film, without the cover animation and the lead-in excerpt above them.
  const bare = work.page.id === pandaId
  const faces = work.page.id === facesId
  const contentBlocks = gallery?.blocks || lead?.blocks || (faces ? facesBlocks(work.page.blocks) : work.page.blocks)
  // ...and the film moves to the top.
  const video = bare ? contentBlocks.find(block => block.type === 'video') : undefined
  const blocks = video ? [video, ...contentBlocks.filter(block => block !== video)] : contentBlocks

  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/works">Works</Link>{trail.map(ancestor => <Fragment key={ancestor.id}><span>/</span><Link href={getPageHref(ancestor)}>{ancestor.title}</Link></Fragment>)}<span>/</span><span>{work.page.title}{work.titleNote && ` · ${work.titleNote}`}</span></nav>
      <header className="pf-detail-header">
        <div><p className="pf-eyebrow" lang={textLang(work.series ?? '')}>{work.series && work.series !== work.page.title ? work.series : 'SELECTED WORK'}</p><h1 lang={textLang(work.page.title)}>{work.page.title}{work.titleNote && <span className="pf-card-title-note"> · {work.titleNote}</span>}</h1></div>
        <div className="pf-detail-meta">{work.year && <span>{work.year}</span>}{work.tags.map(tag => filters.includes(tag) ? <Link href={`/works?filter=${encodeURIComponent(tag)}`} key={tag}>{tag}</Link> : <span key={tag}>{tag}</span>)}</div>
      </header>
      {silentSteps && <SubNav label="Silent Steps sections" current="series" tabs={[{ key: 'series', label: 'Silent Steps', href: work.href }, { key: 'story', label: 'More about the series', href: `${work.href}/story` }]} />}
      {work.page.id === eidolaId ? <EidolaLanding work={work} /> : silentSteps ? <SilentStepsContent content={silentSteps} /> : <>
        {gallery ? <div className="pf-gallery"><ImageStack items={gallery.images} /></div> : !plainHeader && !bare && !faces && !isAddedWork(work.page.id) && (lead?.image || work.pageImage) && <div className="pf-detail-cover"><img src={lead?.image || work.pageImage || ''} alt={work.page.title} /></div>}
        {work.excerpt && !gallery && !bare && <p className="pf-detail-lead">{work.excerpt}</p>}
        <div className="pf-detail-content"><RichContent blocks={blocks} showcase={work.page.id === voltaId} /></div>
      </>}
      {work.page.id === '33239248-8fe5-8018-b85b-cbdb6ba6e03f' && (() => {
        const otherPresentation = getPage('36439248-8fe5-8078-9dd3-f09a1b16667f')
        return otherPresentation ? <div className="pf-presentation-link"><span>ALSO PRESENTED AT UPCYCLE</span><Link href={getPageHref(otherPresentation)}>View this presentation →</Link></div> : null
      })()}
      {related.length > 0 && <section className="pf-related" aria-labelledby="related-heading"><div className="pf-section-heading"><div><p className="pf-eyebrow">CONTINUE EXPLORING</p><h2 id="related-heading">Related works.</h2></div></div><div className="pf-work-grid">{related.map(item => <WorkCard key={item.page.id} work={{ id: item.page.id, title: item.page.title, href: item.href, image: item.image, still: item.still, tags: item.tags, year: item.year, series: item.series, hasSubPages: hasWorkSubPages(item) }} />)}</div></section>}
    </div>
  )
}
