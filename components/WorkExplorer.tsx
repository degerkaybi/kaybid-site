'use client'

import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import WorkCard, { type WorkCardData } from './WorkCard'

type FilterableWork = WorkCardData & { searchText: string }

const sortOptions = [
  { value: 'default', label: 'Featured' },
  { value: 'newest', label: 'Newest first' },
  { value: 'oldest', label: 'Oldest first' },
  { value: 'title', label: 'Title A–Z' },
] as const
type SortMode = typeof sortOptions[number]['value']

// Works without a year always go last, whichever way the years are sorted.
const yearOf = (work: FilterableWork) => {
  const match = work.year?.match(/\d{4}/)
  return match ? Number(match[0]) : null
}

const GridIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <rect x="2.75" y="2.75" width="5.5" height="5.5" /><rect x="11.75" y="2.75" width="5.5" height="5.5" />
    <rect x="2.75" y="11.75" width="5.5" height="5.5" /><rect x="11.75" y="11.75" width="5.5" height="5.5" />
  </svg>
)
const ListIcon = () => (
  <svg viewBox="0 0 20 20" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.5" aria-hidden="true">
    <path d="M2.5 4.5h15M2.5 10h15M2.5 15.5h15" />
  </svg>
)

export default function WorkExplorer({ works, filters }: { works: FilterableWork[]; filters: string[] }) {
  const [activeFilter, setActiveFilter] = useState('All')
  const [query, setQuery] = useState('')
  const [view, setView] = useState<'grid' | 'list'>('grid')
  const [sort, setSort] = useState<SortMode>('default')

  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = params.get('filter')
    if (fromUrl && filters.includes(fromUrl)) setActiveFilter(fromUrl)
    let savedView: string | null = params.get('view')
    if (!savedView) {
      try { savedView = window.localStorage.getItem('pf-works-view') } catch {}
    }
    if (savedView === 'list' || savedView === 'grid') setView(savedView)
    const sortFromUrl = params.get('sort')
    if (sortOptions.some(option => option.value === sortFromUrl)) setSort(sortFromUrl as SortMode)
  }, [filters])

  const chooseSort = (mode: SortMode) => {
    setSort(mode)
    const url = new URL(window.location.href)
    if (mode === 'default') url.searchParams.delete('sort')
    else url.searchParams.set('sort', mode)
    window.history.replaceState(null, '', url)
  }

  const chooseView = (mode: 'grid' | 'list') => {
    setView(mode)
    try { window.localStorage.setItem('pf-works-view', mode) } catch {}
    const url = new URL(window.location.href)
    if (mode === 'grid') url.searchParams.delete('view')
    else url.searchParams.set('view', mode)
    window.history.replaceState(null, '', url)
  }

  const chooseFilter = (filter: string) => {
    setActiveFilter(filter)
    const url = new URL(window.location.href)
    if (filter === 'All') url.searchParams.delete('filter')
    else url.searchParams.set('filter', filter)
    window.history.replaceState(null, '', url)
  }

  const visible = useMemo(() => {
    const term = query.trim().toLocaleLowerCase()
    const matching = works.filter(work => {
      if (activeFilter !== 'All' && !work.tags.includes(activeFilter)) return false
      return !term || work.searchText.includes(term)
    })
    if (sort === 'default') return matching
    if (sort === 'title') return [...matching].sort((a, b) => a.title.localeCompare(b.title, 'en', { sensitivity: 'base' }))
    // Array.prototype.sort is stable, so works from the same year keep the archive order.
    return [...matching].sort((a, b) => {
      const first = yearOf(a)
      const second = yearOf(b)
      if (first === null || second === null) return first === second ? 0 : first === null ? 1 : -1
      return sort === 'newest' ? second - first : first - second
    })
  }, [works, activeFilter, query, sort])

  return (
    <section className="pf-explorer" aria-labelledby="all-works-heading">
      <div className="pf-section-heading">
        <div>
          <p className="pf-eyebrow">THE ARCHIVE</p>
          <h2 id="all-works-heading">All works</h2>
        </div>
        <div className="pf-heading-tools">
          <label className="pf-search">
            <span className="sr-only">Search works</span>
            <input value={query} onChange={event => setQuery(event.target.value)} type="search" placeholder="Search works" />
            <span aria-hidden="true">⌕</span>
          </label>
          <label className="pf-sort">
            <span className="sr-only">Sort works</span>
            <select value={sort} onChange={event => chooseSort(event.target.value as SortMode)}>
              {sortOptions.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}
            </select>
          </label>
          <div className="pf-view-toggle" role="group" aria-label="Change view">
            {(['grid', 'list'] as const).map(mode => (
              <button
                key={mode}
                type="button"
                className={view === mode ? 'is-active' : ''}
                aria-pressed={view === mode}
                aria-label={mode === 'grid' ? 'Grid view' : 'List view'}
                title={mode === 'grid' ? 'Grid view' : 'List view'}
                onClick={() => chooseView(mode)}
              >
                {mode === 'grid' ? <GridIcon /> : <ListIcon />}
              </button>
            ))}
          </div>
        </div>
      </div>
      <div className="pf-toolbar">
        <div className="pf-filters" role="group" aria-label="Filter works by practice">
          {filters.map(filter => (
            <button
              key={filter}
              type="button"
              className={activeFilter === filter ? 'is-active' : ''}
              aria-pressed={activeFilter === filter}
              onClick={() => chooseFilter(filter)}
            >
              {filter}
            </button>
          ))}
        </div>
      </div>
      {view === 'grid' ? (
        <div className="pf-work-grid">
          {visible.map(work => <WorkCard key={work.id} work={work} catalogue />)}
        </div>
      ) : (
        <ul className="pf-work-list">
          {visible.map(work => {
            const thumb = work.still || work.image
            const series = work.series?.replace(/\s*:\|\|\s*$/, '')
            return (
              <li key={work.id}>
                <Link prefetch={false} href={work.href} className="pf-work-row">
                  <span className="pf-work-row-thumb">
                    {thumb ? <img src={thumb} alt="" loading="lazy" decoding="async" /> : <span className="pf-image-placeholder">K</span>}
                  </span>
                  <span className="pf-work-row-main">
                    <span className="pf-work-row-title">{work.title}{work.titleNote && <span className="pf-card-title-note"> · {work.titleNote}</span>}</span>
                    {series && series !== work.title && <span className="pf-work-row-series">{series}</span>}
                  </span>
                  <span className="pf-work-row-tags">{work.tags.slice(0, 3).join(' · ')}</span>
                  <span className="pf-work-row-year">{work.year}</span>
                  <span className="pf-work-row-arrow" aria-hidden="true"><span className="pf-arrow-glyph">→</span></span>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
      {visible.length === 0 && <p className="pf-empty">No works match this search. Try another term or category.</p>}
    </section>
  )
}
