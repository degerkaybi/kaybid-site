'use client'

import { useState } from 'react'
import { canPlayGif } from './gif-playback'
import { cloudinaryStill, imgurStill } from '@/lib/gif-still'

// Browsers cannot pause a GIF, so a still frame is shown and the GIF itself is only requested while a mouse hovers
// it or it is keyboard-focused. Touch screens and reduced-motion visitors keep the still frame. Imgur and Cloudinary
// can serve the first frame as a small picture; for any other host there is no still, so the GIF itself is shown.
function stillFrom(src: string): string | null {
  const imgur = imgurStill(src)
  if (imgur) return imgur
  if (src.startsWith('https://res.cloudinary.com/') && src.includes('/upload/') && /\.gif$/i.test(src)) return cloudinaryStill(src)
  return null
}

type Props = { src: string; name: string; caption: string }

export default function FrozenGif({ src, name, caption }: Props) {
  const [still, setStill] = useState(() => stillFrom(src))
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  const play = () => { if (canPlayGif()) setPlaying(true) }
  const stop = () => { setPlaying(false); setReady(false) }

  return (
    <button
      type="button"
      className="pf-lightbox-trigger"
      data-lightbox={src}
      data-alt={name}
      data-caption={caption}
      aria-label={`Open ${name}`}
      onPointerEnter={event => { if (event.pointerType === 'mouse') play() }}
      onPointerLeave={stop}
      onFocus={event => { if (event.currentTarget.matches(':focus-visible')) play() }}
      onBlur={stop}
    >
      <img src={still || src} alt={name} loading="lazy" decoding="async" onError={() => { if (canPlayGif()) setStill(null) }} />
      {still && playing && (
        <img className="pf-frozen-gif" src={src} alt="" aria-hidden="true" data-ready={ready} onLoad={() => setReady(true)} />
      )}
    </button>
  )
}
