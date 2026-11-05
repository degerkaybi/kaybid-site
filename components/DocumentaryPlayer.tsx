'use client'

import { useEffect, useRef, useState } from 'react'
import { Maximize, Pause, Play, Volume2, VolumeX } from 'lucide-react'

// YouTube's own player UI (title bar, copy-link button, "More videos") cannot be switched off with
// embed parameters, so the player runs without controls behind a shield and these controls replace it.
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

function clock(seconds: number) {
  const total = Math.max(0, Math.floor(seconds))
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`
}

export default function DocumentaryPlayer({ videoId, startTime, title }: { videoId: string; startTime: number; title: string }) {
  const frame = useRef<HTMLDivElement>(null)
  const stage = useRef<HTMLDivElement>(null)
  const player = useRef<YTPlayer | null>(null)
  const [playing, setPlaying] = useState(true)
  const [muted, setMuted] = useState(false)
  const [time, setTime] = useState({ current: startTime, total: 0 })

  useEffect(() => {
    let cancelled = false
    let timer = 0
    void loadYouTubeApi().then(YT => {
      if (cancelled || !frame.current) return
      const mount = document.createElement('div')
      frame.current.replaceChildren(mount)
      player.current = new YT.Player(mount, {
        videoId,
        host: 'https://www.youtube-nocookie.com',
        playerVars: { autoplay: 1, controls: 0, disablekb: 1, fs: 0, iv_load_policy: 3, rel: 0, modestbranding: 1, playsinline: 1, start: startTime },
        events: { onReady: () => { timer = window.setInterval(tick, 250) } },
      })
    })
    const tick = () => {
      const instance = player.current
      if (!instance || typeof instance.getCurrentTime !== 'function') return
      setTime({ current: instance.getCurrentTime(), total: instance.getDuration() })
      setPlaying(instance.getPlayerState() !== 2)
    }
    return () => {
      cancelled = true
      window.clearInterval(timer)
      player.current?.destroy()
      player.current = null
    }
  }, [videoId, startTime])

  const toggle = () => {
    const instance = player.current
    if (!instance) return
    if (instance.getPlayerState() === 1) { instance.pauseVideo(); setPlaying(false) } else { instance.playVideo(); setPlaying(true) }
  }
  const toggleMute = () => {
    const instance = player.current
    if (!instance) return
    if (muted) instance.unMute(); else instance.mute()
    setMuted(!muted)
  }
  const fullscreen = () => {
    if (document.fullscreenElement) void document.exitFullscreen()
    else void stage.current?.requestFullscreen?.()
  }

  return (
    <div className="pf-doc-player" ref={stage} role="group" aria-label={title}>
      <div className="pf-doc-player-frame" ref={frame} />
      <button type="button" className="pf-doc-player-shield" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'} />
      <div className="pf-doc-player-edge is-top" aria-hidden="true" />
      <div className="pf-doc-player-edge is-bottom" aria-hidden="true" />
      <div className="pf-doc-player-controls">
        <button type="button" onClick={toggle} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? <Pause size={20} aria-hidden="true" /> : <Play size={20} aria-hidden="true" />}
        </button>
        <span className="pf-doc-player-time">{clock(time.current)}</span>
        <input
          type="range"
          min={0}
          max={Math.max(1, Math.floor(time.total))}
          value={Math.min(Math.floor(time.current), Math.max(1, Math.floor(time.total)))}
          onChange={event => { const next = Number(event.target.value); player.current?.seekTo(next, true); setTime(value => ({ ...value, current: next })) }}
          aria-label="Seek"
        />
        <span className="pf-doc-player-time">{clock(time.total)}</span>
        <button type="button" onClick={toggleMute} aria-label={muted ? 'Unmute' : 'Mute'}>
          {muted ? <VolumeX size={20} aria-hidden="true" /> : <Volume2 size={20} aria-hidden="true" />}
        </button>
        <button type="button" onClick={fullscreen} aria-label="Fullscreen"><Maximize size={20} aria-hidden="true" /></button>
      </div>
    </div>
  )
}
