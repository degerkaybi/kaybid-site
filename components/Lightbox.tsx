'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { videoPoster } from '@/lib/video-poster'

type Slide = { src: string; alt: string; caption: string; video?: boolean }

// Wrap any markup in <Lightbox>. Every element carrying `data-lightbox="<full image url>"`
// (optionally `data-alt` and `data-caption`) opens the viewer, and the viewer steps through
// all of them in document order.
export default function Lightbox({ children }: { children: React.ReactNode }) {
  const rootRef = useRef<HTMLDivElement>(null)
  const dialogRef = useRef<HTMLDivElement>(null)
  const opener = useRef<HTMLElement | null>(null)
  const touchStart = useRef<number | null>(null)
  const [slides, setSlides] = useState<Slide[]>([])
  const [index, setIndex] = useState<number | null>(null)

  const open = index !== null
  const count = slides.length

  const close = useCallback(() => {
    setIndex(null)
    opener.current?.focus()
  }, [])

  const step = useCallback((direction: number) => {
    setIndex(current => (current === null || count === 0 ? current : (current + direction + count) % count))
  }, [count])

  function onClick(event: React.MouseEvent) {
    const trigger = (event.target as Element).closest<HTMLElement>('[data-lightbox]')
    if (!trigger || !rootRef.current) return
    const triggers = [...rootRef.current.querySelectorAll<HTMLElement>('[data-lightbox]')]
    opener.current = trigger
    setSlides(triggers.map(item => ({
      src: item.dataset.lightbox || '',
      alt: item.dataset.alt || '',
      caption: item.dataset.caption || '',
      video: item.dataset.kind === 'video',
    })))
    setIndex(triggers.indexOf(trigger))
  }

  useEffect(() => {
    if (!open) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    dialogRef.current?.querySelector<HTMLElement>('[data-close]')?.focus()

    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') close()
      else if (event.key === 'ArrowRight') step(1)
      else if (event.key === 'ArrowLeft') step(-1)
      else if (event.key === 'Tab') {
        const focusable = [...(dialogRef.current?.querySelectorAll<HTMLElement>('button') || [])]
        if (focusable.length === 0) return
        const first = focusable[0]
        const last = focusable[focusable.length - 1]
        if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
        else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
      }
    }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [open, close, step])

  // Warm the cache for the neighbours so stepping feels instant.
  useEffect(() => {
    if (index === null || count < 2) return
    for (const offset of [1, -1]) {
      const neighbour = slides[(index + offset + count) % count]
      if (neighbour.video) continue
      const image = new Image()
      image.src = neighbour.src
    }
  }, [index, slides, count])

  const slide = index === null ? null : slides[index]

  return (
    <div ref={rootRef} onClick={onClick}>
      {children}
      {slide && (
        <div
          ref={dialogRef}
          className="pf-lightbox"
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          onClick={event => { if (event.target === event.currentTarget || (event.target as Element).classList.contains('pf-lightbox-stage')) close() }}
          onTouchStart={event => { touchStart.current = event.touches[0].clientX }}
          onTouchEnd={event => {
            if (touchStart.current === null) return
            const delta = event.changedTouches[0].clientX - touchStart.current
            touchStart.current = null
            if (Math.abs(delta) > 50) step(delta < 0 ? 1 : -1)
          }}
        >
          <div className="pf-lightbox-bar">
            <span aria-live="polite">{(index ?? 0) + 1} / {count}</span>
            <button type="button" data-close onClick={close} aria-label="Close image viewer">CLOSE ✕</button>
          </div>
          <div className="pf-lightbox-stage">
            {slide.video ? <video key={slide.src} src={slide.src} controls preload="none" poster={videoPoster(slide.src)} playsInline /> : <img key={slide.src} src={slide.src} alt={slide.alt} />}
          </div>
          {slide.caption && <p className="pf-lightbox-caption">{slide.caption}</p>}
          {count > 1 && (
            <>
              <button type="button" className="pf-lightbox-nav is-prev" onClick={() => step(-1)} aria-label="Previous image">←</button>
              <button type="button" className="pf-lightbox-nav is-next" onClick={() => step(1)} aria-label="Next image">→</button>
            </>
          )}
        </div>
      )}
    </div>
  )
}
