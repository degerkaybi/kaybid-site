'use client'

import { useEffect, useState } from 'react'

// A GIF cannot be paused, so the card shows its first frame and mounts the animation only while
// the pointer is over the picture. Touch screens have no hover, so they play it straight away.
export default function HoverGif({ src, still, label }: { src: string; still: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [stillSrc, setStillSrc] = useState(still)

  useEffect(() => {
    if (window.matchMedia('(hover: none)').matches) setPlaying(true)
  }, [])

  const stop = () => { setPlaying(false); setReady(false) }

  return (
    <div
      className="pf-work-card-image pf-hover-gif"
      onPointerEnter={event => { if (event.pointerType === 'mouse') setPlaying(true) }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') stop() }}
    >
      <img src={stillSrc} alt="" loading="lazy" decoding="async" onError={() => setStillSrc(src)} />
      {playing && <img className="pf-hover-gif-play" src={src} alt="" aria-hidden="true" data-ready={ready} onLoad={() => setReady(true)} />}
      <span className={`pf-card-arrow${label ? ' is-labelled' : ''}`} aria-hidden="true">{label && <>{label} </>}↗</span>
    </div>
  )
}
