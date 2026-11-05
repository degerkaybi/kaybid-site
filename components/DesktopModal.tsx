'use client'

import { useEffect, useRef, useState } from 'react'
import WorkDesktop, { type DesktopWork } from '@/components/WorkDesktop'

// A link-styled button that opens the works desktop in a full-screen modal instead of navigating.
export default function DesktopModal({ works, filters }: { works: DesktopWork[]; filters: string[] }) {
  const [open, setOpen] = useState(false)
  const opener = useRef<HTMLButtonElement>(null)
  const closeRef = useRef<HTMLButtonElement>(null)

  useEffect(() => {
    if (!open) return
    closeRef.current?.focus()
    const trigger = opener.current
    const onKey = (event: KeyboardEvent) => {
      // Escape first closes any open project window; the modal closes once none are left.
      if (event.key === 'Escape' && !document.querySelector('.pf-desk-modal .pf-desk-window')) setOpen(false)
    }
    document.addEventListener('keydown', onKey)
    return () => {
      document.removeEventListener('keydown', onKey)
      trigger?.focus()
    }
  }, [open])

  return (
    <>
      <button ref={opener} type="button" className="pf-text-link pf-hero-desk-link" aria-haspopup="dialog" onClick={() => setOpen(true)}>
        See all works on the desktop <span aria-hidden="true">↗</span>
      </button>
      {open && (
        <div className="pf-desk-modal" role="dialog" aria-modal="true" aria-label="All works on the desktop">
          <WorkDesktop works={works} filters={filters} />
          <button ref={closeRef} type="button" className="pf-desk-modal-close" onClick={() => setOpen(false)} aria-label="Close desktop">CLOSE ✕</button>
        </div>
      )}
    </>
  )
}
