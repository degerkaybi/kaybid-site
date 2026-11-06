'use client'

import { useEffect, useRef, useState } from 'react'
import FullscreenButton from './FullscreenButton'

const interactions = ['pointerdown', 'keydown', 'touchstart'] as const

type Props = {
  src: string
  title: string
  aspect?: string
  autoplay?: boolean
  loop?: boolean
  /** Inside a slider only the front card plays. */
  active?: boolean
}

// A film hosted as a file, in the same portrait frame and with the same few controls as the YouTube player:
// click, tap or Space pauses and plays; the arrow keys skip 5 s.
export default function FilePlayer({ src, title, aspect = '1360 / 1920', autoplay = false, loop = false, active = true }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const userPaused = useRef(false)
  const soundPending = useRef(false)
  const [paused, setPaused] = useState(!autoplay)

  // Sound is on by default. Browsers refuse unmuted autoplay until the visitor has interacted with the page,
  // so when that happens start muted and switch the sound on at the first interaction.
  const start = () => {
    const element = video.current
    if (!element || userPaused.current) return
    element.play().catch(() => {
      element.muted = true
      soundPending.current = true
      element.play().catch(() => {})
    })
  }

  useEffect(() => {
    const element = video.current
    if (!element) return
    if (active) { if (autoplay || !element.paused) start() } else element.pause()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [active, autoplay])

  useEffect(() => {
    const restore = (event: Event) => {
      if (!soundPending.current || root.current?.contains(event.target as Node)) return
      soundPending.current = false
      if (video.current) video.current.muted = false
    }
    for (const name of interactions) document.addEventListener(name, restore)
    return () => { for (const name of interactions) document.removeEventListener(name, restore) }
  }, [])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (soundPending.current) { soundPending.current = false; element.muted = false; return }
    if (element.paused) { userPaused.current = false; start() } else { userPaused.current = true; element.pause() }
  }

  const skip = (seconds: number) => {
    const element = video.current
    if (!element) return
    element.currentTime = Math.min(Math.max(0, element.currentTime + seconds), Math.max(0, (element.duration || Infinity) - 0.5))
  }

  const [w, h] = aspect.split('/').map(Number)
  return (
    <div
      ref={root}
      className="pf-yt is-portrait pf-yt-file"
      style={{ aspectRatio: aspect, '--ar': w / h } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`${paused ? 'Play' : 'Pause'} ${title}`}
      onKeyDown={event => {
        if (event.altKey || event.ctrlKey || event.metaKey) return
        if (event.key === ' ' || event.key === 'k') toggle()
        else if (event.key === 'ArrowRight') skip(5)
        else if (event.key === 'ArrowLeft') skip(-5)
        else return
        event.preventDefault()
        event.stopPropagation() // inside a slider the arrows seek the film, they do not move the cards
      }}
    >
      <div className="pf-yt-stage">
      <video
        ref={video}
        src={src}
        autoPlay={autoplay && active}
        loop={loop}
        playsInline
        preload="auto"
        onPlay={() => setPaused(false)}
        onPause={() => setPaused(true)}
      />
      {active && paused && (
        <span className="pf-yt-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><polygon points="8 5 19 12 8 19" fill="currentColor" /></svg></span>
      )}
      <div className="pf-yt-shield" onClick={() => { root.current?.focus({ preventScroll: true }); toggle() }} />
      </div>
      {active && <FullscreenButton target={root} />}
    </div>
  )
}
