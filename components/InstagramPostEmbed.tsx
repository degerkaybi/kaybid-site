'use client'

import { useEffect } from 'react'

declare global {
  interface Window {
    instgrm?: { Embeds: { process: () => void } }
  }
}

export default function InstagramPostEmbed({ permalink, showLink = true }: { permalink: string; showLink?: boolean }) {
  useEffect(() => {
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
  }, [permalink])

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
