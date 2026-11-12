'use client'

import { useEffect, useRef, useState } from 'react'
import FullscreenButton from './FullscreenButton'
import { videoPoster } from '@/lib/video-poster'

type Props = {
  src: string
  title: string
  aspect?: string
  loop?: boolean
  /** Inside a slider only the front card plays. */
  active?: boolean
}

// A film hosted as a file, in the same portrait frame and with the same few controls as the YouTube player:
// click, tap or Space pauses and plays; the arrow keys skip 5 s.
export default function FilePlayer({ src, title, aspect = '1360 / 1920', loop = false, active = true }: Props) {
  const video = useRef<HTMLVideoElement>(null)
  const root = useRef<HTMLDivElement>(null)
  const [paused, setPaused] = useState(true)

  // Nothing loads or plays until the visitor presses play (preload="none", a still poster in the meantime).
  const start = () => { video.current?.play().catch(() => {}) }

  // Inside a slider only the front card may play.
  useEffect(() => {
    if (!active) video.current?.pause()
  }, [active])

  const toggle = () => {
    const element = video.current
    if (!element) return
    if (element.paused) start()
    else element.pause()
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
        loop={loop}
        playsInline
        preload="none"
        poster={videoPoster(src)}
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
