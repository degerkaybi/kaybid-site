'use client'

import { useState } from 'react'
import { canPlayGif } from './gif-playback'

// A GIF cannot be paused, so the card shows its first frame and requests the animation only once a mouse pointer
// hovers the picture. Touch screens and reduced-motion visitors never load it: they keep the still frame.
export default function HoverGif({ src, still, label }: { src: string; still: string; label?: string }) {
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)
  const [stillSrc, setStillSrc] = useState(still)

  const stop = () => { setPlaying(false); setReady(false) }

  return (
    <div
      className="pf-work-card-image pf-hover-gif"
      onPointerEnter={event => { if (event.pointerType === 'mouse' && canPlayGif()) setPlaying(true) }}
      onPointerLeave={event => { if (event.pointerType === 'mouse') stop() }}
    >
      <img src={stillSrc} alt="" loading="lazy" decoding="async" onError={() => { if (canPlayGif()) setStillSrc(src) }} />
      {playing && <img className="pf-hover-gif-play" src={src} alt="" aria-hidden="true" data-ready={ready} onLoad={() => setReady(true)} />}
      <span className={`pf-card-arrow${label ? ' is-labelled' : ''}`} aria-hidden="true">{label && <>{label} </>}<span className="pf-arrow-glyph">→</span></span>
    </div>
  )
}
