'use client'

import Link from 'next/link'
import { useEffect, useMemo, useRef, useState, type CSSProperties, type PointerEvent } from 'react'

export type DesktopWork = {
  id: string
  title: string
  href: string
  image: string | null
  tags: string[]
  year: string | null
  series: string | null
  rank: number | null
  hasSubPages: boolean
  summary: string
  previews: string[]
}

type WindowState = { id: string; x: number; y: number; w: number; h: number; z: number }

const videoId = 'lyU31zPyY6I'
const startTime = 68
const dragThreshold = 4
const minWindow = { w: 320, h: 260 }

// Same seed, same layout on server and client, so icons never jump on hydration.
function seeded(seed: number) {
  let t = seed + 0x6d2b79f5
  return () => {
    t = Math.imul(t ^ (t >>> 15), t | 1)
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

// Jittered grid in percentages, kept clear of the dock and the edges.
// `aspect` is the stage's width / height, so tall phone screens get fewer columns than wide desktops.
function scatter(count: number, seed = count * 97 + 11, aspect = 1.7): { x: number; y: number }[] {
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const cells = Array.from({ length: cols * rows }, (_, index) => index)
  const random = seeded(seed)
  for (let i = cells.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[cells[i], cells[j]] = [cells[j], cells[i]]
  }
  return cells.slice(0, count).map(cell => {
    const col = cell % cols
    const row = Math.floor(cell / cols)
    return {
      x: 6 + ((col + 0.15 + random() * 0.7) / cols) * 82,
      y: 5 + ((row + 0.1 + random() * 0.7) / rows) * 70,
    }
  })
}

// Ranked works lead in their set order, the rest follow shuffled; laid out as an even grid in percentages.
function arrange(works: DesktopWork[], aspect = 1.6): { x: number; y: number }[] {
  const count = works.length
  const cols = Math.max(1, Math.ceil(Math.sqrt(count * aspect)))
  const rows = Math.max(1, Math.ceil(count / cols))
  const ranked = works.map((work, index) => index).filter(index => works[index].rank !== null).sort((a, b) => (works[a].rank as number) - (works[b].rank as number))
  const rest = works.map((work, index) => index).filter(index => works[index].rank === null)
  for (let i = rest.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[rest[i], rest[j]] = [rest[j], rest[i]]
  }
  const order = [...ranked, ...rest]
  const grid = new Array<{ x: number; y: number }>(count)
  order.forEach((index, slot) => {
    grid[index] = { x: 4 + (slot % cols) * (92 / cols), y: 7 + Math.floor(slot / cols) * (74 / rows) }
  })
  return grid
}

export default function WorkDesktop({ works, filters, videoStart = startTime }: { works: DesktopWork[]; filters: string[]; videoStart?: number }) {
  const stageRef = useRef<HTMLDivElement>(null)
  const dockRef = useRef<HTMLElement>(null)
  const topZ = useRef(1000)
  const iconZ = useRef(1)
  const moved = useRef(false)
  const initial = useMemo(() => scatter(works.length), [works.length])
  const [positions, setPositions] = useState(initial)
  const [raised, setRaised] = useState<Record<string, number>>({})
  const [windows, setWindows] = useState<WindowState[]>([])
  const [active, setActive] = useState<string | null>(null)
  const [shuffled, setShuffled] = useState(false)
  const [tidy, setTidy] = useState(false)
  const [arranging, setArranging] = useState(false)
  const arrangeTimer = useRef<ReturnType<typeof setTimeout>>(undefined)

  // The server renders the fixed layout; once mounted, every visit deals the icons out afresh.
  useEffect(() => {
    const box = stageRef.current?.getBoundingClientRect()
    const aspect = box && box.height ? Math.min(1.7, box.width / box.height) : 1.7
    setPositions(scatter(works.length, Math.floor(Math.random() * 2 ** 32), aspect))
    setShuffled(true)
  }, [works.length])

  useEffect(() => {
    const fromUrl = new URLSearchParams(window.location.search).get('filter')
    if (fromUrl && filters.includes(fromUrl)) setActive(fromUrl)
  }, [filters])

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return
      setWindows(current => {
        if (!current.length) return current
        const top = current.reduce((a, b) => (a.z > b.z ? a : b))
        return current.filter(item => item.id !== top.id)
      })
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [])

  useEffect(() => () => clearTimeout(arrangeTimer.current), [])

  // A mouse wheel only scrolls vertically, so map it onto the dock's horizontal overflow.
  useEffect(() => {
    const dock = dockRef.current
    if (!dock) return
    const onWheel = (event: WheelEvent) => {
      if (dock.scrollWidth <= dock.clientWidth || Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
      event.preventDefault()
      dock.scrollLeft += event.deltaY
    }
    dock.addEventListener('wheel', onWheel, { passive: false })
    return () => dock.removeEventListener('wheel', onWheel)
  }, [])

  // Keep the active filter visible when the dock is narrower than its content.
  useEffect(() => {
    dockRef.current?.querySelector<HTMLElement>('button.is-active')?.scrollIntoView({ inline: 'nearest', block: 'nearest' })
  }, [active])

  const toggleTidy = () => {
    clearTimeout(arrangeTimer.current)
    setArranging(true)
    const { w, h } = stageSize()
    const aspect = Math.min(1.7, w / h)
    setPositions(tidy ? scatter(works.length, Math.floor(Math.random() * 2 ** 32), aspect) : arrange(works, aspect))
    setTidy(!tidy)
    arrangeTimer.current = setTimeout(() => setArranging(false), 800)
  }

  const isCompact = () => window.matchMedia('(max-width: 700px)').matches

  const chooseFilter = (filter: string | null) => {
    setActive(filter)
    const url = new URL(window.location.href)
    if (filter) url.searchParams.set('filter', filter)
    else url.searchParams.delete('filter')
    window.history.replaceState(null, '', url)
  }

  const stageSize = () => {
    const box = stageRef.current?.getBoundingClientRect()
    return { w: box?.width || 1, h: box?.height || 1 }
  }

  const dragIcon = (index: number) => (event: PointerEvent<HTMLButtonElement>) => {
    if (event.button !== 0) return
    const target = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const origin = positions[index]
    const size = stageSize()
    moved.current = false
    target.setPointerCapture(event.pointerId)
    iconZ.current += 1
    setRaised(current => ({ ...current, [works[index].id]: iconZ.current }))

    const move = (next: globalThis.PointerEvent) => {
      const dx = next.clientX - startX
      const dy = next.clientY - startY
      if (!moved.current && Math.hypot(dx, dy) < dragThreshold) return
      moved.current = true
      const x = Math.min(96, Math.max(0, origin.x + (dx / size.w) * 100))
      const y = Math.min(94, Math.max(0, origin.y + (dy / size.h) * 100))
      setPositions(current => current.map((position, i) => (i === index ? { x, y } : position)))
    }
    const end = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  const openWork = (work: DesktopWork) => {
    if (moved.current) {
      moved.current = false
      return
    }
    topZ.current += 1
    setWindows(current => {
      if (current.some(item => item.id === work.id)) {
        return current.map(item => (item.id === work.id ? { ...item, z: topZ.current } : item))
      }
      const size = stageSize()
      const w = Math.min(520, size.w - 24)
      const h = Math.min(600, size.h - 100)
      const offset = (current.length % 6) * 28
      return [
        ...current,
        {
          id: work.id,
          w,
          h,
          x: Math.max(8, (size.w - w) / 2 - 120 + offset),
          y: Math.max(8, (size.h - 70 - h) / 2 + offset - 10),
          z: topZ.current,
        },
      ]
    })
  }

  const focusWindow = (id: string) => {
    topZ.current += 1
    setWindows(current => current.map(item => (item.id === id ? { ...item, z: topZ.current } : item)))
  }

  const patchWindow = (id: string, patch: Partial<WindowState>) =>
    setWindows(current => current.map(item => (item.id === id ? { ...item, ...patch } : item)))

  const closeWindow = (id: string) => setWindows(current => current.filter(item => item.id !== id))

  const trackWindow = (win: WindowState, mode: 'move' | 'resize') => (event: PointerEvent<HTMLElement>) => {
    if (isCompact() || event.button !== 0) return
    event.preventDefault()
    focusWindow(win.id)
    const target = event.currentTarget
    const startX = event.clientX
    const startY = event.clientY
    const size = stageSize()
    target.setPointerCapture(event.pointerId)

    const move = (next: globalThis.PointerEvent) => {
      const dx = next.clientX - startX
      const dy = next.clientY - startY
      if (mode === 'move') {
        patchWindow(win.id, {
          x: Math.min(size.w - 80, Math.max(-win.w + 120, win.x + dx)),
          y: Math.min(size.h - 90, Math.max(0, win.y + dy)),
        })
      } else {
        patchWindow(win.id, {
          w: Math.max(minWindow.w, Math.min(size.w - win.x, win.w + dx)),
          h: Math.max(minWindow.h, Math.min(size.h - win.y, win.h + dy)),
        })
      }
    }
    const end = () => {
      target.removeEventListener('pointermove', move)
      target.removeEventListener('pointerup', end)
      target.removeEventListener('pointercancel', end)
    }
    target.addEventListener('pointermove', move)
    target.addEventListener('pointerup', end)
    target.addEventListener('pointercancel', end)
  }

  const byId = useMemo(() => new Map(works.map(work => [work.id, work])), [works])
  const matches = (work: DesktopWork) => !active || work.tags.includes(active)
  // The more works there are, the smaller each icon, so the table stays readable.
  const thumbSize = Math.round(Math.min(88, Math.max(52, 510 / Math.sqrt(works.length))))

  return (
    <section className="pf-desk" aria-label="All works" style={{ '--s': `${thumbSize}px` } as CSSProperties}>
      <div className="pf-desk-backdrop" aria-hidden="true">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&start=${videoStart}&rel=0&modestbranding=1&playsinline=1`}
          title="Background video"
          allow="autoplay; encrypted-media"
          tabIndex={-1}
        />
      </div>

      <h1 className="sr-only">Works</h1>

      <div className={`pf-desk-stage ${shuffled ? 'is-shuffled' : ''} ${arranging ? 'is-arranging' : ''}`} ref={stageRef}>
        {works.map((work, index) => {
          const dim = !matches(work)
          return (
            <button
              key={work.id}
              type="button"
              className={`pf-desk-icon ${dim ? 'is-dim' : ''} ${work.hasSubPages ? 'has-sub' : ''}`}
              style={{ '--x': `${positions[index].x}%`, '--y': `${positions[index].y}%`, zIndex: raised[work.id] || 1 } as CSSProperties}
              onPointerDown={dragIcon(index)}
              onClick={() => openWork(work)}
              disabled={dim}
              aria-label={`${work.title}${work.year ? `, ${work.year}` : ''}`}
            >
              <span className="pf-desk-thumb">
                {work.image ? <img src={work.image} alt="" loading="lazy" decoding="async" draggable={false} /> : <span>KAYBID</span>}
              </span>
              <span className="pf-desk-label">{work.title}</span>
            </button>
          )
        })}

        {windows.map(win => {
          const work = byId.get(win.id)
          if (!work) return null
          return (
            <article
              key={win.id}
              className="pf-desk-window"
              role="dialog"
              aria-label={work.title}
              style={{ left: win.x, top: win.y, width: win.w, height: win.h, zIndex: win.z } as CSSProperties}
              onPointerDown={() => focusWindow(win.id)}
            >
              <header className="pf-desk-titlebar" onPointerDown={trackWindow(win, 'move')}>
                <div className="pf-desk-titlebar-main">
                  <span>{work.title}</span>
                  <Link href={work.href} className="pf-desk-open" onPointerDown={event => event.stopPropagation()}>Open full page <span aria-hidden="true">↗</span></Link>
                </div>
                <button type="button" onPointerDown={event => event.stopPropagation()} onClick={() => closeWindow(win.id)} aria-label={`Close ${work.title}`}>✕</button>
              </header>
              <div className="pf-desk-body">
                <div className="pf-desk-meta">
                  {work.image && <img src={work.image} alt="" draggable={false} />}
                  <div>
                    <h2>{work.title}</h2>
                    {work.series && work.series !== work.title && <p>{work.series}</p>}
                    {work.year && <p>{work.year}</p>}
                  </div>
                </div>
                {work.summary && <p className="pf-desk-summary">{work.summary}</p>}
                {work.tags.length > 0 && (
                  <dl className="pf-desk-details">
                    <dt>Type</dt>
                    <dd>{work.tags.join(' › ')}</dd>
                  </dl>
                )}
                {work.previews.length > 0 && (
                  <div className="pf-desk-previews">
                    {work.previews.map(src => <img key={src} src={src} alt="" loading="lazy" decoding="async" draggable={false} />)}
                  </div>
                )}
              </div>
              <span className="pf-desk-resize" onPointerDown={trackWindow(win, 'resize')} aria-hidden="true" />
            </article>
          )
        })}
      </div>

      <nav className="pf-desk-dock" aria-label="Filter works" ref={dockRef}>
        <button type="button" className={!active ? 'is-active' : ''} aria-pressed={!active} onClick={() => chooseFilter(null)}>All</button>
        {filters.map(filter => (
          <button
            key={filter}
            type="button"
            className={active === filter ? 'is-active' : ''}
            aria-pressed={active === filter}
            onClick={() => chooseFilter(active === filter ? null : filter)}
          >
            {filter}
          </button>
        ))}
        <span className="pf-desk-dock-divider" aria-hidden="true" />
        <button type="button" className="pf-desk-tidy" onClick={toggleTidy}>{tidy ? 'Scatter' : 'Tidy up'}</button>
      </nav>
    </section>
  )
}
