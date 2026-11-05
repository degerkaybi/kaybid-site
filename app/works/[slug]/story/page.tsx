import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import RichContent from '@/components/RichContent'
import SubNav from '@/components/SubNav'
import { getAboutParts } from '@/lib/exhibitions'
import { getAllWorks, getWorkBySlug, silentStepsId } from '@/lib/portfolio'
import { textLang } from '@/lib/locale'

type Props = { params: Promise<{ slug: string }> }

export function generateStaticParams() {
  return getAllWorks().filter(work => work.page.id === silentStepsId).map(work => ({ slug: work.slug }))
}

export const dynamicParams = false

export const metadata: Metadata = { title: 'More about the series' }

export default async function SilentStepsStoryPage({ params }: Props) {
  const work = getWorkBySlug((await params).slug)
  if (!work || work.page.id !== silentStepsId) notFound()
  // The series' story, formerly on the About page.
  const parts = getAboutParts()
  const blocks = parts ? [...parts.before, ...parts.after] : []
  if (blocks.length === 0) notFound()

  return (
    <div className="pf-page-shell pf-detail-page">
      <nav className="pf-breadcrumbs" aria-label="Breadcrumb"><Link href="/works">Works</Link><span>/</span><Link href={work.href}>{work.page.title}</Link><span>/</span><span>More about the series</span></nav>
      <header className="pf-detail-header">
        <div><p className="pf-eyebrow">SELECTED WORK</p><h1 lang={textLang(work.page.title)}>{work.page.title}</h1></div>
      </header>
      <SubNav label="Silent Steps sections" current="story" tabs={[{ key: 'series', label: 'Silent Steps', href: work.href }, { key: 'story', label: 'More about the series', href: `${work.href}/story` }]} />
      <div className="pf-detail-content"><RichContent blocks={blocks} /></div>
    </div>
  )
}
