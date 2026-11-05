import Link from 'next/link'
import type { Exhibition } from '@/lib/exhibitions'

// Rows grouped by year: the year once on the left, each show with its venue and city beside it.
export default function ExhibitionList({ items }: { items: Exhibition[] }) {
  const years: [string, Exhibition[]][] = []
  for (const item of items) {
    const group = years.find(([year]) => year === item.year)
    if (group) group[1].push(item)
    else years.push([item.year, [item]])
  }
  return (
    <div className="pf-exhibitions">
      {years.map(([year, rows]) => (
        <section className="pf-exhibition-year" key={year || 'undated'}>
          <h3>{year}</h3>
          <ul>
            {rows.map(row => (
              <li key={`${row.title}-${row.place}`}>
                <span className="pf-exhibition-title">{row.href ? <Link href={row.href}>{row.title}</Link> : row.title}</span>
                <span className="pf-exhibition-place">{row.place}{row.flag && <span aria-hidden="true"> {row.flag}</span>}</span>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  )
}
