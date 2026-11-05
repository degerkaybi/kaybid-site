'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'

type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  mute(): void
  unMute(): void
  isMuted(): boolean
  getCurrentTime(): number
  getDuration(): number
  seekTo(seconds: number, allowSeekAhead: boolean): void
  getPlayerState(): number
  destroy(): void
}

type YTNamespace = {
  Player: new (element: HTMLElement, options: Record<string, unknown>) => YTPlayer
  PlayerState: { PLAYING: number; ENDED: number }
}

declare global {
  interface Window {
    YT?: YTNamespace
    onYouTubeIframeAPIReady?: () => void
  }
}

let apiReady: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  if (window.YT?.Player) return Promise.resolve(window.YT)
  if (!apiReady) {
    apiReady = new Promise(resolve => {
      const previous = window.onYouTubeIframeAPIReady
      window.onYouTubeIframeAPIReady = () => {
        previous?.()
        resolve(window.YT as YTNamespace)
      }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    })
  }
  return apiReady
}

const icons = {
  play: <polygon points="7 4 20 12 7 20" fill="currentColor" stroke="none" />,
  pause: <><rect x="6" y="4" width="4" height="16" fill="currentColor" stroke="none" /><rect x="14" y="4" width="4" height="16" fill="currentColor" stroke="none" /></>,
  soundOn: <><polygon points="3 9 8 9 13 4 13 20 8 15 3 15" fill="currentColor" stroke="none" /><path d="M16.5 8.5a5 5 0 0 1 0 7" /><path d="M19.5 5.5a9 9 0 0 1 0 13" /></>,
  soundOff: <><polygon points="3 9 8 9 13 4 13 20 8 15 3 15" fill="currentColor" stroke="none" /><line x1="17" y1="9" x2="22" y2="15" /><line x1="22" y1="9" x2="17" y2="15" /></>,
  expand: <><polyline points="4 9 4 4 9 4" /><polyline points="20 9 20 4 15 4" /><polyline points="4 15 4 20 9 20" /><polyline points="20 15 20 20 15 20" /></>,
}

function Glyph({ name }: { name: keyof typeof icons }) {
  return <svg viewBox="0 0 24 24" width="20" height="20" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{icons[name]}</svg>
}

const clock = (seconds: number) => `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, '0')}`

// Short-form vertical video. The frame is cropped to the picture (the uploads carry black bars)
// and YouTube's own chrome is replaced by a small control bar: play/pause, seek, sound.
type Props = { id: string; title: string; aspect: string; inLightbox?: boolean; startAt?: number; active?: boolean }

export default function PortraitVideo({ id, title, aspect, inLightbox = false, startAt = 0, active = true }: Props) {
  const mount = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const scrubbing = useRef(false)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState(0)
  const [duration, setDuration] = useState(0)
  const [full, setFull] = useState(false)
  const [startFrom, setStartFrom] = useState(0)
  const [w, h] = aspect.split('/').map(Number)
  const ratio = w / h

  useEffect(() => {
    let cancelled = false
    let timer: number | undefined
    let fallback: number | undefined
    // Sound is on by default. Browsers refuse unmuted autoplay until the visitor has interacted with
    // the page, so when that happens start muted and switch the sound on at the first interaction.
    const interactions = ['pointerdown', 'keydown', 'touchstart'] as const
    const unmuteOnInteraction = (event: Event) => {
      if (!(event.target as Element | null)?.closest?.('[data-sound]')) {
        player.current?.unMute()
        setMuted(false)
      }
      for (const name of interactions) document.removeEventListener(name, unmuteOnInteraction)
    }
    const fallBackToMuted = () => {
      const current = player.current
      if (!current || current.getPlayerState() === window.YT?.PlayerState.PLAYING) return
      current.mute()
      current.playVideo()
      setMuted(true)
      for (const name of interactions) document.addEventListener(name, unmuteOnInteraction)
    }
    loadYouTubeApi().then(YT => {
      if (cancelled || !mount.current) return
      const target = document.createElement('div')
      mount.current.appendChild(target)
      player.current = new YT.Player(target, {
        videoId: id,
        playerVars: { autoplay: 1, mute: 0, start: Math.floor(startAt), controls: 0, playsinline: 1, rel: 0, modestbranding: 1, iv_load_policy: 3, disablekb: 1, fs: 0 },
        events: {
          onAutoplayBlocked: fallBackToMuted,
          // Looping through a one-item playlist makes YouTube draw previous/next buttons, so loop by hand.
          onStateChange: (event: { data: number }) => {
            if (event.data !== YT.PlayerState.ENDED) return
            player.current?.seekTo(0, true)
            player.current?.playVideo()
          },
          onReady: () => {
            fallback = window.setTimeout(fallBackToMuted, 1500)
            timer = window.setInterval(() => {
              const current = player.current
              if (!current) return
              if (!scrubbing.current) setTime(current.getCurrentTime())
              setDuration(current.getDuration())
              setPlaying(current.getPlayerState() === YT.PlayerState.PLAYING)
              setMuted(current.isMuted())
            }, 250)
          },
        },
      })
    })
    return () => {
      cancelled = true
      window.clearInterval(timer)
      window.clearTimeout(fallback)
      for (const name of interactions) document.removeEventListener(name, unmuteOnInteraction)
      player.current?.destroy()
      player.current = null
    }
  }, [id, inLightbox, startAt])

  // Inside the slider only the front card plays.
  useEffect(() => {
    if (active) player.current?.playVideo()
    else player.current?.pauseVideo()
  }, [active])

  const toggle = useCallback(() => {
    const current = player.current
    if (!current) return
    if (current.getPlayerState() === window.YT?.PlayerState.PLAYING) current.pauseVideo()
    else current.playVideo()
  }, [])

  const toggleSound = useCallback(() => {
    const current = player.current
    if (!current) return
    if (current.isMuted()) current.unMute()
    else current.mute()
    setMuted(current.isMuted())
  }, [])

  const openFull = () => {
    player.current?.pauseVideo()
    setStartFrom(player.current?.getCurrentTime() || 0)
    setFull(true)
  }

  const closeFull = useCallback(() => {
    setFull(false)
    player.current?.playVideo()
  }, [])

  useEffect(() => {
    if (!full) return
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === 'Escape') closeFull() }
    document.addEventListener('keydown', onKeyDown)
    return () => {
      document.removeEventListener('keydown', onKeyDown)
      document.body.style.overflow = previousOverflow
    }
  }, [full, closeFull])

  return (
    <>
    <div className="pf-pvideo" role="group" aria-label={title} style={{ aspectRatio: aspect, '--ar': ratio } as React.CSSProperties}>
      <div className="pf-pvideo-frame" ref={mount} />
      <button type="button" className="pf-pvideo-surface" onClick={toggle} aria-label={playing ? 'Pause video' : 'Play video'} />
      <div className="pf-pvideo-bar">
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}><Glyph name={playing ? 'pause' : 'play'} /></button>
        <input
          type="range"
          min={0}
          max={Math.max(duration, 1)}
          step={0.1}
          value={Math.min(time, Math.max(duration, 1))}
          aria-label="Seek"
          onPointerDown={() => { scrubbing.current = true }}
          onChange={event => setTime(Number(event.target.value))}
          onPointerUp={event => { scrubbing.current = false; player.current?.seekTo(Number((event.target as HTMLInputElement).value), true) }}
          onKeyUp={event => player.current?.seekTo(Number((event.target as HTMLInputElement).value), true)}
        />
        <span>{clock(time)} / {clock(duration)}</span>
        <button type="button" data-sound onClick={toggleSound} aria-label={muted ? 'Turn sound on' : 'Mute'} aria-pressed={!muted}><Glyph name={muted ? 'soundOff' : 'soundOn'} /></button>
        {!inLightbox && <button type="button" onClick={openFull} aria-label="Watch full screen"><Glyph name="expand" /></button>}
      </div>
    </div>
    {full && createPortal(
      <div className="pf-lightbox pf-video-lightbox" role="dialog" aria-modal="true" aria-label={title}>
        <div className="pf-lightbox-bar">
          <span>{title}</span>
          <button type="button" onClick={closeFull} aria-label="Close video">CLOSE ✕</button>
        </div>
        <div className="pf-lightbox-stage" onClick={event => { if (event.target === event.currentTarget) closeFull() }}>
          <PortraitVideo id={id} title={title} aspect={aspect} inLightbox startAt={startFrom} />
        </div>
      </div>,
      document.body
    )}
    </>
  )
}
