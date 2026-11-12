'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import FullscreenButton from './FullscreenButton'

// One player for every YouTube film on the site. YouTube's own interface (title bar, share and like
// buttons, "More videos", the Shorts chrome) cannot be switched off with embed parameters, so the
// player runs without controls behind a shield. What is left is deliberately small:
//   click / tap            pause and play
//   Space or K             pause and play
//   ← →  /  J L            back and forward 5 s / 10 s
type YTPlayer = {
  playVideo(): void
  pauseVideo(): void
  seekTo(seconds: number, allowSeekAhead: boolean): void
  mute(): void
  unMute(): void
  getCurrentTime(): number
  getDuration(): number
  getPlayerState(): number
  destroy(): void
}
type YTNamespace = { Player: new (element: HTMLElement, options: object) => YTPlayer }
type YTWindow = Window & { YT?: YTNamespace; onYouTubeIframeAPIReady?: () => void }

let apiPromise: Promise<YTNamespace> | null = null

function loadYouTubeApi(): Promise<YTNamespace> {
  const win = window as YTWindow
  if (win.YT?.Player) return Promise.resolve(win.YT)
  if (!apiPromise) {
    apiPromise = new Promise(resolve => {
      const previous = win.onYouTubeIframeAPIReady
      win.onYouTubeIframeAPIReady = () => { previous?.(); resolve(win.YT as YTNamespace) }
      const script = document.createElement('script')
      script.src = 'https://www.youtube.com/iframe_api'
      document.head.appendChild(script)
    })
  }
  return apiPromise
}

const ENDED = 0
const PLAYING = 1
const PAUSED = 2
const interactions = ['pointerdown', 'keydown', 'touchstart'] as const

type Status = 'idle' | 'loading' | 'playing' | 'paused'

type Props = {
  videoId: string
  title: string
  /** Shape of the frame, e.g. "16 / 9". Ignored with `fill`. */
  aspect?: string
  /** Vertical film: the picture is cropped out of a 9:16 frame so the player's top and bottom chrome stays outside it. */
  portrait?: boolean
  startAt?: number
  /** Inside a slider only the front card plays. */
  active?: boolean
  /** Fill the parent (which must be positioned) instead of sizing itself. */
  fill?: boolean
  loop?: boolean
}

export default function YouTubePlayer({ videoId, title, aspect = '16 / 9', portrait = false, startAt = 0, active = true, fill = false, loop = false }: Props) {
  const root = useRef<HTMLDivElement>(null)
  const mount = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const userPaused = useRef(false)
  const ended = useRef(false)
  const soundPending = useRef(false)
  const releaseSound = useRef<() => void>(() => {})
  const activeNow = useRef(active)
  const [armed, setArmed] = useState(false)
  const [status, setStatus] = useState<Status>('idle')
  // Counts every start of playback; YouTube shows its buttons for a few seconds each time.
  const [plays, setPlays] = useState(0)
  const [settled, setSettled] = useState(false)
  const [poster, setPoster] = useState(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`)

  useEffect(() => { activeNow.current = active }, [active])
  useEffect(() => { setPoster(`https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`) }, [videoId])

  useEffect(() => {
    if (!armed) return
    let cancelled = false
    let fallback: number | undefined
    // Sound is on by default. Browsers refuse unmuted autoplay until the visitor has interacted with
    // the page, so when that happens start muted and switch the sound on at the first interaction.
    const unmuteOnInteraction = (event: Event) => {
      if (root.current?.contains(event.target as Node)) return // the player's own click or key does it
      releaseSound.current()
      player.current?.unMute()
    }
    releaseSound.current = () => {
      soundPending.current = false
      for (const name of interactions) document.removeEventListener(name, unmuteOnInteraction)
    }
    const fallBackToMuted = () => {
      const current = player.current
      if (!current || userPaused.current || typeof current.getPlayerState !== 'function' || current.getPlayerState() === PLAYING) return
      current.mute()
      current.playVideo()
      soundPending.current = true
      for (const name of interactions) document.addEventListener(name, unmuteOnInteraction)
    }
    void loadYouTubeApi().then(YT => {
      if (cancelled || !mount.current) return
      const target = document.createElement('div')
      mount.current.replaceChildren(target)
      setStatus(current => current === 'idle' ? 'loading' : current)
      player.current = new YT.Player(target, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, mute: 0, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, rel: 0, modestbranding: 1, playsinline: 1, start: Math.floor(startAt) },
        events: {
          onReady: () => { fallback = window.setTimeout(fallBackToMuted, 1500) },
          onAutoplayBlocked: fallBackToMuted,
          onStateChange: (event: { data: number }) => {
            const instance = player.current
            if (event.data === PLAYING) {
              if (!activeNow.current || ended.current) { instance?.pauseVideo(); return }
              setStatus('playing')
              setPlays(count => count + 1)
            } else if (event.data === PAUSED) {
              if (ended.current) setStatus('idle')
              else setStatus(current => current === 'idle' || current === 'loading' ? current : 'paused')
            } else if (event.data === ENDED && instance) {
              // The end screen of an embed lists other videos, so never leave it showing.
              instance.seekTo(0, true)
              if (loop) instance.playVideo()
              else { ended.current = true; instance.pauseVideo(); setStatus('idle') }
            }
          },
        },
      })
    })
    return () => {
      cancelled = true
      window.clearTimeout(fallback)
      releaseSound.current()
      player.current?.destroy()
      player.current = null
      ended.current = false
      setStatus('idle')
    }
  }, [armed, videoId, startAt, loop])

  useEffect(() => {
    setSettled(false)
    if (status !== 'playing') return
    const timer = window.setTimeout(() => setSettled(true), 5000)
    return () => window.clearTimeout(timer)
  }, [status, plays])

  // Inside a slider only the front card plays.
  useEffect(() => {
    const current = player.current
    if (!current || typeof current.playVideo !== 'function') return
    if (active) { if (!userPaused.current) current.playVideo() } else current.pauseVideo()
  }, [active])

  const ready = () => {
    const current = player.current
    return current && typeof current.getPlayerState === 'function' ? current : null
  }

  // A player that was started muted because the browser refused sound gets its sound back first.
  const restoreSound = () => {
    if (!soundPending.current) return false
    releaseSound.current()
    player.current?.unMute()
    return true
  }

  const toggle = useCallback(() => {
    if (!armed) { userPaused.current = false; setArmed(true); return }
    const current = ready()
    if (!current || restoreSound()) return
    ended.current = false
    if (current.getPlayerState() === PLAYING) { userPaused.current = true; current.pauseVideo() }
    else { userPaused.current = false; current.playVideo() }
  }, [armed])

  const skip = (seconds: number) => {
    const current = ready()
    if (!current) return
    restoreSound()
    const length = current.getDuration() || Number.POSITIVE_INFINITY
    current.seekTo(Math.min(Math.max(0, current.getCurrentTime() + seconds), Math.max(0, length - 0.5)), true)
  }

  const onKeyDown = (event: React.KeyboardEvent) => {
    if (event.altKey || event.ctrlKey || event.metaKey) return
    const key = event.key.length === 1 ? event.key.toLowerCase() : event.key
    if (key === ' ' || key === 'k') toggle()
    else if (key === 'ArrowRight') skip(5)
    else if (key === 'ArrowLeft') skip(-5)
    else if (key === 'l') skip(10)
    else if (key === 'j') skip(-10)
    else return
    event.preventDefault()
    event.stopPropagation() // inside a slider the arrows seek the film, they do not move the cards
  }

  const [w, h] = aspect.split('/').map(Number)
  const covered = status === 'idle' || status === 'loading' || !active
  const classes = ['pf-yt', fill && 'is-fill', portrait && 'is-portrait', `is-${status}`, settled && 'is-settled'].filter(Boolean).join(' ')
  return (
    <div
      ref={root}
      className={classes}
      style={fill ? undefined : { aspectRatio: aspect, '--ar': w / h } as React.CSSProperties}
      role="button"
      tabIndex={0}
      aria-label={`${status === 'playing' ? 'Pause' : 'Play'} ${title}`}
      onKeyDown={onKeyDown}
    >
      <div className="pf-yt-stage">
      <div className="pf-yt-frame" ref={mount} />
      {covered && (
        <div className="pf-yt-cover" aria-hidden="true">
          <img src={poster} alt="" loading="lazy" decoding="async" draggable={false} onError={() => setPoster(`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`)} />
        </div>
      )}
      <div className="pf-yt-edge is-top" aria-hidden="true" />
      <div className="pf-yt-edge is-bottom" aria-hidden="true" />
      {active && (status === 'idle' || status === 'paused') && (
        <span className="pf-yt-play" aria-hidden="true"><svg viewBox="0 0 24 24" width="28" height="28"><polygon points="8 5 19 12 8 19" fill="currentColor" /></svg></span>
      )}
      <div className="pf-yt-shield" onClick={() => { root.current?.focus({ preventScroll: true }); toggle() }} />
      </div>
      {active && <FullscreenButton target={root} />}
    </div>
  )
}
