'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronDown, X } from 'lucide-react'
import Link from 'next/link'
import YouTubePlayer from '@/components/YouTubePlayer'

const videoId = 'lyU31zPyY6I'
const startTime = 28

const lensRadius = 175

export default function HomeHeroVideo() {
  const [isOpen, setIsOpen] = useState(false)
  const media = useRef<HTMLDivElement>(null)
  const lens = useRef({ x: 0, y: 0, radius: 0, target: 0, frame: 0 })

  // The film is blurred; a soft circle that follows the pointer shows it a little sharper.
  const draw = () => {
    const state = lens.current
    const element = media.current
    if (!element) return
    state.radius += (state.target - state.radius) * 0.18
    if (Math.abs(state.target - state.radius) < 0.5) state.radius = state.target
    element.style.setProperty('--lens-x', `${state.x}px`)
    element.style.setProperty('--lens-y', `${state.y}px`)
    element.style.setProperty('--lens-r', `${state.radius}px`)
    state.frame = state.radius === state.target ? 0 : requestAnimationFrame(draw)
  }
  const moveLens = (event: React.PointerEvent) => {
    if (event.pointerType !== 'mouse' || !media.current) return
    const box = media.current.getBoundingClientRect()
    const state = lens.current
    state.x = event.clientX - box.left
    state.y = event.clientY - box.top
    const inside = state.x >= 0 && state.x <= box.width && state.y >= 0 && state.y <= box.height
    state.target = inside ? lensRadius : 0
    if (!state.frame) state.frame = requestAnimationFrame(draw)
  }
  const hideLens = () => {
    lens.current.target = 0
    if (!lens.current.frame) lens.current.frame = requestAnimationFrame(draw)
  }
  useEffect(() => { const state = lens.current; return () => cancelAnimationFrame(state.frame) }, [])

  useEffect(() => {
    if (!isOpen) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [isOpen])

  return (
    <section className="pf-home-hero" aria-labelledby="home-hero-title" onPointerMove={moveLens} onPointerLeave={hideLens}>
      <div className="pf-home-hero-media" aria-hidden="true" ref={media}>
        {/* Unmounted while the full documentary is open so the hidden copy is not playing for nothing. */}
        {!isOpen && (
          <iframe
            src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&mute=1&controls=0&loop=1&playlist=${videoId}&start=${startTime}&rel=0&modestbranding=1&playsinline=1`}
            title="Silent Steps documentary background"
            allow="autoplay; encrypted-media"
            tabIndex={-1}
          />
        )}
        <div className="pf-home-hero-blur" />
      </div>

      <div className="pf-home-hero-content">
        <h1 id="home-hero-title">KAYBID</h1>
        <p className="pf-home-hero-subtitle">Street Art | Animation | Traditional Collage</p>
        <p className="pf-home-hero-description">
          Known for the Silent Steps Series, a longterm street art project featuring hand-cut collages of endangered animals, installed across cities worldwide since 2018. Featured: Straat Museum Amsterdam, Paris Olympics 2024, Times Square NYC, WWF partnership.
        </p>
        <div className="pf-home-hero-actions">
          <button type="button" className="pf-home-hero-documentary" onClick={() => setIsOpen(true)}>
            Watch full documentary <span aria-hidden="true">▶</span>
          </button>
          <Link href="/works" className="pf-home-hero-works">Explore All Works <span aria-hidden="true">→</span></Link>
        </div>
      </div>

      <a className="pf-home-hero-scroll" href="#featured-work" aria-label="Scroll down to selected works">
        <ChevronDown size={34} strokeWidth={1.6} aria-hidden="true" />
      </a>

      {isOpen && (
        <div className="pf-video-modal" role="dialog" aria-modal="true" aria-label="Kaybid full documentary" onClick={() => setIsOpen(false)}>
          <div className="pf-video-modal-content" onClick={event => event.stopPropagation()}>
            <button type="button" className="pf-video-modal-close" onClick={() => setIsOpen(false)} aria-label="Close video"><X size={28} aria-hidden="true" /></button>
            <YouTubePlayer videoId={videoId} startAt={startTime} title="Kaybid full documentary" autoplay autoFocus fill />
          </div>
        </div>
      )}
    </section>
  )
}
