'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import YouTubePlayer from './YouTubePlayer'
import FilePlayer from './FilePlayer'

export type Slide =
  | { kind: 'image'; src: string; alt: string }
  | { kind: 'video'; id: string; title: string; aspect: string; src?: string }

// A stacked-card slider: the active card sits in front, its neighbours fan out behind it.
export default function ImageStack({ items }: { items: Slide[] }) {
  const [index, setIndex] = useState(0)
  const touchStart = useRef<number | null>(null)
  const count = items.length

  // The slider loops: after the last picture comes the video again.
  const go = useCallback((target: number) => setIndex(((target % count) + count) % count), [count])

  useEffect(() => {
    for (const offset of [-1, 1]) {
      const neighbour = items[(index + offset + count) % count]
      if (neighbour?.kind === 'image') new window.Image().src = neighbour.src
    }
  }, [index, items, count])

  return (
    <div
      className="pf-stack"
      role="group"
      aria-roledescription="carousel"
      aria-label="Video and image slider"
      tabIndex={0}
      onKeyDown={event => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'ArrowRight') { event.preventDefault(); go(index + 1) }
        else if (event.key === 'ArrowLeft') { event.preventDefault(); go(index - 1) }
      }}
      onTouchStart={event => { touchStart.current = event.touches[0].clientX }}
      onTouchEnd={event => {
        if (touchStart.current === null) return
        const delta = event.changedTouches[0].clientX - touchStart.current
        touchStart.current = null
        if (Math.abs(delta) > 40) go(index + (delta < 0 ? 1 : -1))
      }}
    >
      <div className="pf-stack-stage">
        {items.map((item, position) => {
          // Shortest way round the loop, so the card after the last one sits on its right.
          let offset = position - index
          if (offset > count / 2) offset -= count
          else if (offset < -count / 2) offset += count
          const active = offset === 0
          const label = item.kind === 'video' ? item.title : `Image ${position + 1} of ${count}`
          return (
            <div
              key={item.kind === 'video' ? item.id : item.src}
              className="pf-stack-slide"
              style={{ '--o': offset, '--d': Math.abs(offset) } as React.CSSProperties}
              data-active={active}
              data-far={Math.abs(offset) > 1}
              hidden={Math.abs(offset) > 3}
              {...(active ? {} : {
                role: 'button',
                tabIndex: Math.abs(offset) > 1 ? -1 : 0,
                'aria-label': `Show ${label}`,
                onClick: () => go(position),
                onKeyDown: (event: React.KeyboardEvent) => { if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); go(position) } },
              })}
            >
              {item.kind === 'video'
                ? item.src
                  ? <FilePlayer src={item.src} title={item.title} aspect={item.aspect} loop active={active} />
                  : <YouTubePlayer videoId={item.id} title={item.title} aspect={item.aspect} portrait loop active={active} />
                : <img src={item.src} alt={item.alt} loading={Math.abs(offset) > 1 ? 'lazy' : 'eager'} decoding="async" draggable={false} />}
            </div>
          )
        })}
      </div>
      {count > 1 && (
        <div className="pf-stack-controls">
          <button type="button" className="pf-stack-restart" onClick={() => go(0)} disabled={index === 0} aria-label="Back to the first slide">
            <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7" /><polyline points="3 4 3 10 9 10" /></svg>
          </button>
          <button type="button" onClick={() => go(index - 1)} aria-label="Previous">←</button>
          <span aria-live="polite">{index + 1} / {count}</span>
          <button type="button" onClick={() => go(index + 1)} aria-label="Next">→</button>
        </div>
      )}
    </div>
  )
}
