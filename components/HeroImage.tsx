'use client'

import { useEffect, useRef, useState } from 'react'
import { heroImages, heroSrc, heroSrcSet } from '@/lib/hero-images'

// Radius of the sharp spot that follows the mouse, in px.
const SPOT_RADIUS = 200
// Smoothing time constants (ms): the spot trails the mouse and opens/closes in roughly 250 ms.
const FOLLOW_MS = 70
const OPEN_MS = 80

// Full-bleed random photo behind the hero copy. The server renders nothing here (the section's #111 background is the
// placeholder); once mounted it picks a photo from the pool and fades it in.
// The same photo is drawn twice: a static blurred layer below and a sharp layer above it, revealed through a radial
// mask around the mouse. Only the mask's CSS variables change while the mouse moves. Both <img> share srcSet and sizes,
// so the browser downloads the file once. Touch devices get the plain sharp photo (see the CSS).
export default function HeroImage() {
  const [index, setIndex] = useState<number | null>(null)
  const [loaded, setLoaded] = useState(false)
  const media = useRef<HTMLDivElement>(null)
  const sharp = useRef<HTMLImageElement>(null)

  useEffect(() => {
    setIndex(Math.floor(Math.random() * heroImages.length))
  }, [])

  // A cached image can finish before React attaches onLoad.
  useEffect(() => {
    if (sharp.current?.complete && sharp.current.naturalWidth > 0) setLoaded(true)
  }, [index])

  useEffect(() => {
    const layer = media.current
    const hero = layer?.closest<HTMLElement>('.pf-home-hero')
    if (!layer || !hero) return

    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)')
    const cur = { x: 0, y: 0, r: 0 }
    const target = { x: 0, y: 0, r: 0 }
    let inside = false
    let frame = 0
    let last = 0

    const apply = () => {
      layer.style.setProperty('--x', `${cur.x.toFixed(1)}px`)
      layer.style.setProperty('--y', `${cur.y.toFixed(1)}px`)
      layer.style.setProperty('--r', `${Math.max(cur.r, 0.01).toFixed(1)}px`)
    }

    const tick = (now: number) => {
      const dt = Math.min(now - last, 50)
      last = now
      const follow = 1 - Math.exp(-dt / FOLLOW_MS)
      const open = 1 - Math.exp(-dt / OPEN_MS)
      cur.x += (target.x - cur.x) * follow
      cur.y += (target.y - cur.y) * follow
      cur.r += (target.r - cur.r) * open
      const settled = Math.abs(target.x - cur.x) < 0.3 && Math.abs(target.y - cur.y) < 0.3 && Math.abs(target.r - cur.r) < 0.3
      if (settled) Object.assign(cur, target)
      apply()
      frame = settled ? 0 : requestAnimationFrame(tick)
    }

    const update = () => {
      if (reduced.matches) {
        Object.assign(cur, target)
        apply()
      } else if (!frame) {
        last = performance.now()
        frame = requestAnimationFrame(tick)
      }
    }

    const aim = (event: PointerEvent) => {
      const box = hero.getBoundingClientRect()
      target.x = event.clientX - box.left
      target.y = event.clientY - box.top
    }

    const onEnter = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      aim(event)
      // The spot opens where the mouse is instead of sliding in from its last position.
      if (!inside) { cur.x = target.x; cur.y = target.y }
      inside = true
      target.r = SPOT_RADIUS
      update()
    }
    const onMove = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      if (!inside) return onEnter(event)
      aim(event)
      update()
    }
    const onLeave = (event: PointerEvent) => {
      if (event.pointerType !== 'mouse') return
      inside = false
      target.r = 0
      update()
    }

    apply()
    hero.addEventListener('pointerenter', onEnter)
    hero.addEventListener('pointermove', onMove)
    hero.addEventListener('pointerleave', onLeave)
    return () => {
      hero.removeEventListener('pointerenter', onEnter)
      hero.removeEventListener('pointermove', onMove)
      hero.removeEventListener('pointerleave', onLeave)
      cancelAnimationFrame(frame)
    }
  }, [index])

  const image = index === null ? null : heroImages[index]
  if (!image) return null

  const shared = { srcSet: heroSrcSet(image), sizes: '100vw', alt: '', decoding: 'async' as const, 'aria-hidden': true as const }

  return (
    <div ref={media} className={`pf-home-hero-media${loaded ? ' is-loaded' : ''}`} data-hero={image.id}>
      <img className="pf-home-hero-image is-blur" src={heroSrc(image)} {...shared} />
      <img ref={sharp} className="pf-home-hero-image is-sharp" src={heroSrc(image)} {...shared} fetchPriority="high" onLoad={() => setLoaded(true)} />
    </div>
  )
}
