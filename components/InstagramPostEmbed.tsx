'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

type Props = { permalink: string; showLink?: boolean; bare?: boolean }

export default function InstagramPostEmbed({ permalink, showLink = true, bare = false }: Props) {
  useEffect(() => {
    if (bare) return
    const processEmbeds = () => window.instgrm?.Embeds.process()
    let script = document.getElementById('instagram-embed-script') as HTMLScriptElement | null

    if (!script) {
      script = document.createElement('script')
      script.id = 'instagram-embed-script'
      script.src = 'https://www.instagram.com/embed.js'
      script.async = true
      document.body.appendChild(script)
    }

    script.addEventListener('load', processEmbeds)
    processEmbeds()
    return () => script?.removeEventListener('load', processEmbeds)
  }, [permalink, bare])

  // Bare: only the picture carousel. Instagram's own embed is cropped in CSS so the profile header and footer fall outside the frame.
  if (bare) {
    return (
      <div className="pf-instagram-frame">
        <iframe src={`${permalink}embed/`} title="Instagram carousel" loading="lazy" scrolling="no" allowFullScreen />
      </div>
    )
  }

  return (
    <div className="pf-embed pf-instagram-embed">
      <blockquote
        className="instagram-media"
        data-instgrm-permalink={permalink}
        data-instgrm-version="14"
      >
        <a href={permalink} target="_blank" rel="noopener noreferrer">View this post on Instagram</a>
      </blockquote>
      {showLink && <a className="pf-instagram-link" href={permalink} target="_blank" rel="noopener noreferrer">Open on Instagram ↗</a>}
    </div>
  )
}
