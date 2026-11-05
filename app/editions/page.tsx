import type { Metadata } from 'next'
import { notFound } from 'next/navigation'
import EditionCard from '@/components/EditionCard'
import { getEditions } from '@/lib/editions'

export const metadata: Metadata = { title: 'Editions' }

export default function EditionsPage() {
  const editions = getEditions()
  if (editions.length === 0) notFound()
  const open = editions.filter(item => item.status === 'available' || item.status === 'free').length
  return (
    <div className="pf-page-shell pf-section-page">
      <div className="pf-page-hero">
        <p className="pf-eyebrow">BEYOND THE GALLERY</p>
        <h1>Editions</h1>
        <p>Flipbooks, stickers, prints, objects and collaborations from the Kaybid archive.</p>
      </div>
      <div className="pf-shop-bar">
        <span>{editions.length} editions</span>
        <span>{open} available now</span>
        <span className="pf-shop-soon">Shop opening soon</span>
      </div>
      <ul className="pf-shop-grid">
        {editions.map(edition => <EditionCard key={edition.id} edition={edition} />)}
      </ul>
    </div>
  )
}
