import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound, redirect } from 'next/navigation'
import RichContent from '@/components/RichContent'
import EidolaGifPage from '@/components/EidolaGifPage'
import { getEidolaGif } from '@/lib/eidola-gifs'
import { Fragment } from 'react'
import { browseEidolaId, eidolaId, getPage, getPageBySlug, getPageHref, getPageLabel, getSection, getWorkSlug, type PortfolioPage } from '@/lib/portfolio'
import archive from '@/data/portfolio-content.json'
import { textLang } from '@/lib/locale'

// The page opens with its own "WWF Market x Kaybid Collaboration" heading, so the archive title above it is left out.
const wwfPageId = '22a39248-8fe5-8019-9671-dd9af9e33095'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return Object.values(archive.pages).map(page => ({ slug: getWorkSlug(page as PortfolioPage) }))
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const page = getPageBySlug((await params).slug)
  return { title: page ? getPageLabel(page) : 'Archive' }
}

export default async function ArchivePage({ params }: Props) {
  const page = getPageBySlug((await params).slug)
  if (!page) notFound()
  // "Browse All Eidōla" no longer has a page of its own: its paintings open the Eidōla page.
  if (page.id === browseEidolaId) {
    const eidola = getPage(eidolaId)
    if (eidola) redirect(getPageHref(eidola))
  }
  const parent = page.parentId ? getPage(page.parentId) : null
  const portrait = parent?.parentId === eidolaId
  // Every non-root ancestor, outermost first: Works / Eidōla / this page.
  const trail: PortfolioPage[] = []
  for (let ancestor = parent; ancestor?.parentId; ancestor = getPage(ancestor.parentId)) if (ancestor.id !== browseEidolaId) trail.unshift(ancestor)
  // Pages that sit under the Editions section lead back to Editions, everything else to Works.
  let top: PortfolioPage | null = parent
  while (top?.parentId) top = getPage(top.parentId)
  const inEditions = !!top && top.id === getSection('art-ideas')?.id
  // The Eidōla GIF pages: the GIF, then a slider with the pictures of its folder.
  const gif = getEidolaGif(page.id)
  if (gif) {
    return (
      <div className="pf-page-shell pf-detail-page">
        <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/works">Works</Link>{trail.map(ancestor => <Fragment key={ancestor.id}><span>/</span><Link href={getPageHref(ancestor)}>{ancestor.title}</Link></Fragment>)}<span>/</span><span>{gif.title}</span></nav>
        <header className="pf-detail-header is-compact"><div><p className="pf-eyebrow">{gif.group === 'halloween' ? 'EIDŌLA HALLOWEEN' : `EIDŌLA GIF · ${gif.season}`}</p><h1 lang={textLang(gif.title)}>{gif.title}</h1></div></header>
        <EidolaGifPage gif={gif} />
      </div>
    )
  }
  const header = <header className={`pf-detail-header${portrait ? ' is-compact' : ''}`}><div><p className="pf-eyebrow">FROM THE ARCHIVE</p><h1 lang={textLang(page.title)}>{getPageLabel(page)}</h1></div></header>
  const content = <div className={`pf-detail-content${portrait ? ' is-compact' : ''}`}><RichContent blocks={page.blocks} portrait={portrait} hideCrumbs /></div>
  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href={inEditions ? '/editions' : '/works'}>{inEditions ? 'Editions' : 'Works'}</Link>{trail.map(ancestor => <Fragment key={ancestor.id}><span>/</span><Link href={getPageHref(ancestor)}>{ancestor.title}</Link></Fragment>)}<span>/</span><span>{getPageLabel(page)}</span></nav>
      {portrait ? <div className="pf-portrait-page">{header}{content}</div> : <>{page.id === wwfPageId ? null : header}{content}</>}
    </div>
  )
}
