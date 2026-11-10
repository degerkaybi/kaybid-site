import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import AboutTabs from '@/components/AboutTabs'
import ExhibitionList from '@/components/ExhibitionList'
import { getAboutParts } from '@/lib/exhibitions'

export const metadata: Metadata = { title: 'Exhibitions' }

export default function ExhibitionsPage() {
  const parts = getAboutParts()
  if (!parts || parts.exhibitions.length === 0) notFound()
  const years = parts.exhibitions.map(item => Number(item.year)).filter(Boolean)
  return (
    <div className="pf-page-shell pf-section-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">SELECTED EXHIBITIONS AND INSTALLATIONS</p>
        <h1>Exhibitions</h1>
        <p>Shows, festivals and street installations{years.length > 0 && `, ${Math.min(...years)}–${Math.max(...years)}`}.</p>
      </div>
      <AboutTabs current="exhibitions" />
      <div className="pf-section-body">
        <ExhibitionList items={parts.exhibitions} />
      </div>
      <Link href="/works" className="pf-back-link">Explore the works <span aria-hidden="true">→</span></Link>
    </div>
  )
}
