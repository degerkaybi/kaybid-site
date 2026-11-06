import Link from 'next/link'
import { getEidolaGifs, type EidolaGroup } from '@/lib/eidola-gifs'
import { getPage, getPageHref } from '@/lib/portfolio'

const sections: Record<EidolaGroup, { eyebrow: string; title: string }> = {
  gif: { eyebrow: 'ANIMATED EIDŌLA', title: 'GIF' },
  halloween: { eyebrow: 'SEASON 3', title: 'HALLOWEEN' },
}

// A section under the Eidōla films ("GIF", "Halloween"): one card per folder, the animated picture as its cover.
export default function EidolaGifSection({ group = 'gif' }: { group?: EidolaGroup }) {
  const cards = getEidolaGifs(group).flatMap(gif => {
    const page = getPage(gif.id)
    return page ? [{ gif, href: getPageHref(page) }] : []
  })
  if (!cards.length) return null
  const { eyebrow, title } = sections[group]
  return (
    <section className="pf-eidola-gifs" aria-labelledby={`eidola-${group}-heading`}>
      <div className="pf-section-heading"><div><p className="pf-eyebrow">{eyebrow}</p><h2 id={`eidola-${group}-heading`}>{title}</h2></div></div>
      <div className="pf-eidolon-grid">
        {cards.map(({ gif, href }) => (
          <Link key={gif.id} href={href} className="pf-eidolon">
            <img src={gif.card} alt="" loading="lazy" decoding="async" />
            <span className="pf-eidolon-info">
              <strong>{gif.title}</strong>
              <em>{gif.season}</em>
            </span>
          </Link>
        ))}
      </div>
    </section>
  )
}
