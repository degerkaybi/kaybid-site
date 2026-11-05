import Link from 'next/link'
import type { Edition } from '@/lib/editions'

const statusLabel = { available: 'Available', free: 'Free', 'sold-out': 'Sold out', collaboration: 'Collaboration' } as const

// One product in the editions shop: picture, status, short text and where to go next.
export default function EditionCard({ edition }: { edition: Edition }) {
  const soldOut = edition.soldOut
  const picture = (
    <>
      {edition.image ? <img src={edition.image} alt="" loading="lazy" decoding="async" /> : <span className="pf-image-placeholder">KAYBID</span>}
      <span className="pf-edition-badges">
        <span className="pf-edition-status">{statusLabel[edition.status]}</span>
        {soldOut && edition.status !== 'sold-out' && <span className="pf-edition-status is-out">Sold out</span>}
      </span>
    </>
  )
  // The picture goes where the button goes: the edition's page, or the outside link when it has no page.
  return (
    <li className={`pf-edition is-${edition.status}${soldOut && edition.status !== 'sold-out' ? ' is-sold-out' : ''}`}>
      {edition.href ? <Link className="pf-edition-image is-link" href={edition.href} aria-label={`${edition.title}: ${edition.hrefLabel}`}>{picture}</Link>
        : edition.external ? <a className="pf-edition-image is-link" href={edition.external} target="_blank" rel="noopener noreferrer" aria-label={`${edition.title}: ${edition.externalLabel}`}>{picture}</a>
        : <div className="pf-edition-image">{picture}</div>}
      <div className="pf-edition-info">
        <h2>{edition.title}</h2>
        {edition.description && <p className="pf-edition-text">{edition.description}</p>}
        <div className="pf-edition-actions">
          {edition.external && <a className="pf-chip is-solid" href={edition.external} target="_blank" rel="noopener noreferrer">{edition.externalLabel} <span aria-hidden="true">↗</span></a>}
          {edition.href && <Link className="pf-chip" href={edition.href}>{edition.hrefLabel} <span aria-hidden="true">↗</span></Link>}
          {soldOut && !edition.href && <span className="pf-edition-note">No longer in stock</span>}
        </div>
      </div>
    </li>
  )
}
