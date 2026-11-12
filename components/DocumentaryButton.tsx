'use client'

import { useEffect, useRef, useState } from 'react'
import { X } from 'lucide-react'
import YouTubePlayer from '@/components/YouTubePlayer'

const videoId = 'lyU31zPyY6I'
const startTime = 28

// "Watch full documentary" button for the home hero: opens the film in a modal and starts playing right away
// (the click that opens it is the gesture browsers need to allow sound).
export default function DocumentaryButton() {
  const [isOpen, setIsOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const closer = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!isOpen) return
    closer.current?.focus({ preventScroll: true })
    const button = opener.current
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setIsOpen(false)
    }
    window.addEventListener('keydown', onKeyDown)
    return () => {
      window.removeEventListener('keydown', onKeyDown)
      button?.focus({ preventScroll: true })
    }
  }, [isOpen])

  return (
    <>
      <button type="button" ref={opener} className="pf-home-hero-documentary" onClick={() => setIsOpen(true)}>
        Watch documentary about Kaybid <span aria-hidden="true">▶</span>
      </button>

      {isOpen && (
        <div className="pf-video-modal" role="dialog" aria-modal="true" aria-label="Kaybid documentary" onClick={() => setIsOpen(false)}>
          <div className="pf-video-modal-content" onClick={event => event.stopPropagation()}>
            <button type="button" ref={closer} className="pf-video-modal-close" onClick={() => setIsOpen(false)} aria-label="Close video"><X size={28} aria-hidden="true" /></button>
            <YouTubePlayer videoId={videoId} startAt={startTime} title="Kaybid documentary" fill autoStart />
          </div>
        </div>
      )}
    </>
  )
}
