'use client'

import { useEffect, useRef, useState } from 'react'
import { heroImages, heroSrc, heroSrcSet } from '@/lib/hero-images'

// Full-bleed random photo behind the hero copy. The server renders nothing here (the section's #111 background is the
// placeholder); once mounted it picks a photo from the pool and fades it in.
export default function HeroImage() {
  const [index, setIndex] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const ref = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIndex(Math.floor(Math.random() * heroImages.length))
  }, [])

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (ref.current?.complete && ref.current.naturalWidth > 0) setLoaded(true)
  }, [index])

  const image = index === null ? null : heroImages[index]
  if (!image) return null

  return (
    <img
      ref={ref}
      className={`pf-home-hero-image${loaded ? ' is-loaded' : ''}`}
      src={heroSrc(image)}
      srcSet={heroSrcSet(image)}
      sizes="100vw"
      alt=""
      aria-hidden="true"
      decoding="async"
      fetchPriority="high"
      data-hero={image.id}
      onLoad={() => setLoaded(true)}
    />
  )
}
