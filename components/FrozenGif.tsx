'use client'

import { useState } from 'react'

// Browsers cannot pause a GIF, so a still frame is shown and the GIF itself is only
// mounted while it is hovered or keyboard-focused. Imgur serves the first frame of
// any GIF as a small JPEG when "h.jpg" is requested, and Cloudinary does the same with "pg_1";
// other hosts just show the GIF.
function stillFrom(src: string): string | null {
  const imgur = src.match(/^(https:\/\/i\.imgur\.com\/\w+)\.gif$/)
  if (imgur) return `${imgur[1]}h.jpg`
  if (src.startsWith('https://res.cloudinary.com/') && src.includes('/upload/') && /\.gif$/i.test(src)) return src.replace('/upload/', '/upload/pg_1/').replace(/\.gif$/i, '.jpg')
  return null
}

type Props = { src: string; name: string; caption: string }

export default function FrozenGif({ src, name, caption }: Props) {
  const [still, setStill] = useState(() => stillFrom(src))
  const [playing, setPlaying] = useState(false)
  const [ready, setReady] = useState(false)

  const play = () => setPlaying(true)
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
      <img src={still || src} alt={name} loading="lazy" decoding="async" onError={() => setStill(null)} />
      {still && playing && (
        <img className="pf-frozen-gif" src={src} alt="" aria-hidden="true" data-ready={ready} onLoad={() => setReady(true)} />
      )}
    </button>
  )
}
