'use client'

import { useEffect, useState } from 'react'

// A full-screen toggle for a player. `target` is the element that goes full screen.
export default function FullscreenButton({ target }: { target: React.RefObject<HTMLElement | null> }) {
  const [full, setFull] = useState(false)

  useEffect(() => {
    const update = () => setFull(!!target.current && document.fullscreenElement === target.current)
    document.addEventListener('fullscreenchange', update)
    return () => document.removeEventListener('fullscreenchange', update)
  }, [target])

  // Browsers without the Fullscreen API (iPhone Safari) simply get no button.
  if (typeof document !== 'undefined' && !document.fullscreenEnabled && !full) return null

  const toggle = () => {
    const element = target.current
    if (!element) return
    if (document.fullscreenElement) void document.exitFullscreen()
    else void element.requestFullscreen?.().catch(() => {})
  }

  return (
    <button type="button" className="pf-yt-fs" onClick={event => { event.stopPropagation(); toggle() }} aria-label={full ? 'Exit full screen' : 'Full screen'}>
      <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        {full ? <path d="M9 4v5H4M15 4v5h5M9 20v-5H4M15 20v-5h5" /> : <path d="M4 9V4h5M20 9V4h-5M4 15v5h5M20 15v5h-5" />}
      </svg>
    </button>
  )
}
