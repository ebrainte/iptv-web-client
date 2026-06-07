import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

function formatBitrate(bps) {
  if (!bps || bps <= 0) return '—'
  if (bps >= 1_000_000) return (bps / 1_000_000).toFixed(2) + ' Mbps'
  if (bps >= 1_000) return (bps / 1_000).toFixed(0) + ' Kbps'
  return bps + ' bps'
}

function formatDuration(seconds) {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0) return `${h}h ${m}m ${s}s`
  if (m > 0) return `${m}m ${s}s`
  return `${s}s`
}

// Detect Electron environment — no CORS restrictions, so proxy is never needed
const isElectron = typeof navigator !== 'undefined' && /Electron/i.test(navigator.userAgent)

// Check if Chromecast API is available (only in Electron with our preload)
const isCastAvailable = typeof window !== 'undefined' && window.cast?.isAvailable === true

// Pre-check a manifest to see if it needs proxying.
// If the direct fetch fails (e.g. CORS blocked redirect), we assume proxy is needed.
async function checkNeedsProxy(m3u8Url) {
  // Electron disables webSecurity — always use direct
  if (isElectron) return false

  try {
    const res = await fetch(m3u8Url)
    if (!res.ok) {
      console.log(`[IPTV] Direct manifest fetch failed (${res.status}), assuming proxy needed`)
      return true
    }
    const text = await res.text()
    const finalOrigin = new URL(res.url).origin

    const lines = text.split('\n')
    for (const line of lines) {
      const trimmed = line.trim()
      if (!trimmed || trimmed.startsWith('#')) continue
      // It's a segment URL — check if it points to a different origin
      if (trimmed.startsWith('http://') || trimmed.startsWith('https://')) {
        const segOrigin = new URL(trimmed).origin
        if (segOrigin !== finalOrigin) {
          console.log(`[IPTV] External segment detected: ${trimmed} (origin: ${segOrigin} != ${finalOrigin})`)
          return true
        }
      }
    }
    return false
  } catch (err) {
    // Fetch failure (CORS, network error, etc.) — proxy is needed
    console.log(`[IPTV] Direct manifest fetch error: ${err.message}, assuming proxy needed`)
    return true
  }
}

export default function Player({ src, proxiedSrc, type, poster, onBack }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [audioTracks, setAudioTracks] = useState([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0)
  const [subtitleTracks, setSubtitleTracks] = useState([])
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1)
  const [showPanel, setShowPanel] = useState(false)
  const [proxyMode, setProxyMode] = useState(null)
  const [proxyStats, setProxyStats] = useState(null)
  const [resolvedSrc, setResolvedSrc] = useState(null)
  const [resolutionLabel, setResolutionLabel] = useState('')
  const statsInterval = useRef(null)

  // ── Stream stats state ─────────────────────────────────────────────
  const [showStats, setShowStats] = useState(false)
  const [streamStats, setStreamStats] = useState(null)
  const bytesLoadedRef = useRef(0)
  const playStartTimeRef = useRef(null)
  const streamStatsTimer = useRef(null)

  // ── Chromecast state ───────────────────────────────────────────────
  const [castState, setCastState] = useState('idle') // idle | discovering | connecting | casting
  const [castDevices, setCastDevices] = useState([])
  const [showCastPicker, setShowCastPicker] = useState(false)
  const [castDeviceName, setCastDeviceName] = useState('')
  const castPickerRef = useRef(null)

  const isHls = resolvedSrc?.endsWith('.m3u8') || (resolvedSrc?.includes('/api/stream') && resolvedSrc?.includes('.m3u8'))

  // ── Chromecast event listeners ─────────────────────────────────────
  useEffect(() => {
    if (!isCastAvailable) return

    window.cast.onDeviceFound((device) => {
      setCastDevices((prev) => {
        if (prev.find((d) => d.host === device.host)) return prev
        return [...prev, device]
      })
    })

    window.cast.onError((error) => {
      console.error('[Cast] Error:', error)
      setCastState('idle')
      setCastDeviceName('')
    })

    window.cast.onStatus((status) => {
      if (status.playerState === 'IDLE' && status.idleReason === 'ERROR') {
        console.error('[Cast] Playback error on device')
        setCastState('idle')
        setCastDeviceName('')
      }
    })

    return () => {
      window.cast.removeAllListeners()
      window.cast.stopDiscovery()
      if (castState === 'casting') {
        window.cast.stop()
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Close cast picker when clicking outside
  useEffect(() => {
    if (!showCastPicker) return
    const handleClick = (e) => {
      if (castPickerRef.current && !castPickerRef.current.contains(e.target)) {
        setShowCastPicker(false)
        if (castState === 'discovering') {
          window.cast.stopDiscovery()
          setCastState('idle')
        }
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [showCastPicker, castState])

  // ── Chromecast handlers ────────────────────────────────────────────
  const handleCastClick = () => {
    if (castState === 'casting') {
      handleStopCasting()
      return
    }

    if (showCastPicker) {
      setShowCastPicker(false)
      window.cast.stopDiscovery()
      setCastState('idle')
      return
    }

    setShowCastPicker(true)
    setCastState('discovering')
    setCastDevices([])
    window.cast.startDiscovery()
  }

  const handleCastToDevice = async (device) => {
    try {
      setCastState('connecting')
      setShowCastPicker(false)

      await window.cast.connect(device.host, device.port)

      // Always use the direct stream URL (src prop) — the Chromecast fetches it directly
      const contentType = src?.endsWith('.m3u8')
        ? 'application/x-mpegurl'
        : src?.endsWith('.mp4')
          ? 'video/mp4'
          : 'video/mp4'
      const streamType = type === 'live' ? 'LIVE' : 'BUFFERED'

      await window.cast.loadMedia(src, contentType, streamType)

      setCastState('casting')
      setCastDeviceName(device.name)

      // Pause local video
      if (videoRef.current) {
        videoRef.current.pause()
      }

      window.cast.stopDiscovery()
    } catch (err) {
      console.error('[Cast] Failed:', err)
      setCastState('idle')
      setCastDeviceName('')
    }
  }

  const handleStopCasting = () => {
    window.cast.stop()
    setCastState('idle')
    setCastDeviceName('')

    // Resume local video
    if (videoRef.current) {
      videoRef.current.play().catch(() => {})
    }
  }

  // Poll proxy stats when in proxied mode
  useEffect(() => {
    if (proxyMode === 'proxied') {
      const poll = () => {
        fetch('/api/proxy-stats')
          .then((r) => r.json())
          .then(setProxyStats)
          .catch(() => {})
      }
      poll()
      statsInterval.current = setInterval(poll, 5000)
      return () => clearInterval(statsInterval.current)
    } else {
      setProxyStats(null)
      if (statsInterval.current) clearInterval(statsInterval.current)
    }
  }, [proxyMode])

  // Pre-check manifest and decide direct vs proxied
  useEffect(() => {
    setResolvedSrc(null)
    setProxyMode(null)

    if (!src) return

    // Only pre-check HLS streams that have a proxy fallback
    if (proxiedSrc && (src.endsWith('.m3u8') || src.includes('.m3u8'))) {
      let cancelled = false
      checkNeedsProxy(src).then((needsProxy) => {
        if (cancelled) return
        if (needsProxy) {
          console.log('[IPTV] Using proxied stream (external segments detected)')
          setResolvedSrc(proxiedSrc)
          setProxyMode('proxied')
        } else {
          console.log('[IPTV] Using direct stream')
          setResolvedSrc(src)
          setProxyMode('direct')
        }
      })
      return () => { cancelled = true }
    } else {
      setResolvedSrc(src)
      setProxyMode(src.includes('/api/stream') ? 'proxied' : 'direct')
    }
  }, [src, proxiedSrc])

  // Detect native audio/subtitle tracks from <video> element (for MKV/MP4)
  const detectNativeTracks = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    if (video.audioTracks?.length > 1) {
      const tracks = []
      for (let i = 0; i < video.audioTracks.length; i++) {
        tracks.push({
          id: i,
          name: video.audioTracks[i].label || video.audioTracks[i].language || `Track ${i + 1}`,
          lang: video.audioTracks[i].language,
        })
      }
      setAudioTracks(tracks)
    }

    if (video.textTracks?.length > 0) {
      const tracks = []
      for (let i = 0; i < video.textTracks.length; i++) {
        tracks.push({
          id: i,
          name: video.textTracks[i].label || video.textTracks[i].language || `Subtitle ${i + 1}`,
          lang: video.textTracks[i].language,
        })
      }
      setSubtitleTracks(tracks)
    }
  }, [])

  // Track video resolution changes (loadedmetadata & resize events)
  useEffect(() => {
    const video = videoRef.current
    if (!video) return

    const handleResize = () => {
      const width = video.videoWidth
      const height = video.videoHeight
      if (width && height) {
        let label = ''
        if (height >= 2160) {
          label = '4K'
        } else if (height >= 1440) {
          label = '1440p'
        } else if (height >= 1080) {
          label = '1080p'
        } else if (height >= 720) {
          label = '720p'
        } else if (height >= 480) {
          label = '480p'
        } else if (height >= 360) {
          label = '360p'
        } else {
          label = `${height}p`
        }
        setResolutionLabel(label)
      } else {
        setResolutionLabel('')
      }
    }

    video.addEventListener('resize', handleResize)
    video.addEventListener('loadedmetadata', handleResize)
    
    // Initial check
    handleResize()

    return () => {
      video.removeEventListener('resize', handleResize)
      video.removeEventListener('loadedmetadata', handleResize)
    }
  }, [resolvedSrc])

  // Main playback effect
  useEffect(() => {
    const video = videoRef.current
    if (!video || !resolvedSrc) return

    setAudioTracks([])
    setSubtitleTracks([])
    setCurrentAudioTrack(0)
    setCurrentSubtitleTrack(-1)
    setShowPanel(false)

    if (isHls && Hls.isSupported()) {
      const hls = new Hls({
        enableWorker: true,
        lowLatencyMode: true,
        xhrSetup: (xhr) => {
          xhr.withCredentials = false
        },
      })
      hlsRef.current = hls
      hls.loadSource(resolvedSrc)
      hls.attachMedia(video)

      // Track bandwidth consumed via fragment loads
      hls.on(Hls.Events.FRAG_LOADED, (_, data) => {
        if (data?.frag?.stats?.total) {
          bytesLoadedRef.current += data.frag.stats.total
        }
      })

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})
        playStartTimeRef.current = Date.now()

        if (hls.audioTracks.length > 1) {
          setAudioTracks(hls.audioTracks.map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Track ${i + 1}`,
            lang: t.lang,
          })))
          setCurrentAudioTrack(hls.audioTrack)
        }

        if (hls.subtitleTracks.length > 0) {
          setSubtitleTracks(hls.subtitleTracks.map((t, i) => ({
            id: i,
            name: t.name || t.lang || `Subtitle ${i + 1}`,
            lang: t.lang,
          })))
          setCurrentSubtitleTrack(hls.subtitleTrack)
        }
      })

      hls.on(Hls.Events.ERROR, (_, data) => {
        if (data.fatal) {
          if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
            hls.recoverMediaError()
          } else {
            hls.startLoad()
          }
        }
      })

      return () => {
        hls.destroy()
        hlsRef.current = null
      }
    } else if (isHls && video.canPlayType('application/vnd.apple.mpegurl')) {
      video.src = resolvedSrc
      video.addEventListener('loadedmetadata', detectNativeTracks)
      video.play().catch(() => {})
      return () => video.removeEventListener('loadedmetadata', detectNativeTracks)
    } else {
      video.src = resolvedSrc
      video.addEventListener('loadedmetadata', detectNativeTracks)
      video.play().catch(() => {})
      return () => video.removeEventListener('loadedmetadata', detectNativeTracks)
    }
  }, [resolvedSrc, isHls, detectNativeTracks])

  const switchAudio = (index) => {
    if (isHls && hlsRef.current) {
      hlsRef.current.audioTrack = index
    } else if (videoRef.current?.audioTracks) {
      for (let i = 0; i < videoRef.current.audioTracks.length; i++) {
        videoRef.current.audioTracks[i].enabled = (i === index)
      }
    }
    setCurrentAudioTrack(index)
  }

  // ── Stats collection ───────────────────────────────────────────────
  const collectStats = useCallback(() => {
    const video = videoRef.current
    const hls = hlsRef.current
    if (!video) return null

    const stats = {}

    // Stream URL (mask password in display)
    const displayUrl = src || resolvedSrc || '—'
    try {
      const u = new URL(displayUrl)
      stats.streamUrl = u.origin + u.pathname
      stats.streamHost = u.hostname + (u.port ? ':' + u.port : '')
    } catch {
      stats.streamUrl = displayUrl
      stats.streamHost = '—'
    }

    // Resolution
    stats.resolution = video.videoWidth && video.videoHeight
      ? `${video.videoWidth} × ${video.videoHeight}`
      : 'Loading…'

    // Connection type
    stats.connectionType = proxyMode === 'proxied' ? 'Proxied' : 'Direct'

    // FPS & dropped frames
    const quality = video.getVideoPlaybackQuality?.()
    if (quality) {
      stats.totalFrames = quality.totalVideoFrames
      stats.droppedFrames = quality.droppedVideoFrames
      stats.fps = quality.totalVideoFrames > 0 && playStartTimeRef.current
        ? Math.round(quality.totalVideoFrames / ((Date.now() - playStartTimeRef.current) / 1000))
        : 0
    }

    // Buffer health
    if (video.buffered?.length > 0) {
      const bufferedEnd = video.buffered.end(video.buffered.length - 1)
      stats.bufferHealth = (bufferedEnd - video.currentTime).toFixed(1) + 's'
    } else {
      stats.bufferHealth = '0s'
    }

    // Session uptime
    stats.uptime = playStartTimeRef.current
      ? formatDuration((Date.now() - playStartTimeRef.current) / 1000)
      : '—'

    // HLS-specific stats
    if (hls) {
      // Current level info
      const currentLevel = hls.levels?.[hls.currentLevel]
      if (currentLevel) {
        stats.bitrate = formatBitrate(currentLevel.bitrate)
        stats.codec = [
          currentLevel.videoCodec,
          currentLevel.audioCodec,
        ].filter(Boolean).join(' / ') || '—'
      } else {
        stats.bitrate = '—'
        stats.codec = '—'
      }

      // Estimated bandwidth
      stats.estimatedBandwidth = hls.bandwidthEstimate
        ? formatBitrate(hls.bandwidthEstimate)
        : '—'

      // Available quality levels
      stats.levels = (hls.levels || []).map((l, i) => ({
        index: i,
        resolution: l.width && l.height ? `${l.width}×${l.height}` : '?',
        bitrate: formatBitrate(l.bitrate),
        active: i === hls.currentLevel,
      }))

      // Bandwidth consumed (from FRAG_LOADED tracking)
      stats.bandwidthConsumed = formatBytes(bytesLoadedRef.current)
    } else {
      stats.bitrate = '—'
      stats.codec = '—'
      stats.estimatedBandwidth = '—'
      stats.levels = []
      stats.bandwidthConsumed = '—'
    }

    return stats
  }, [src, resolvedSrc, proxyMode])

  // Poll stats every second when visible
  useEffect(() => {
    if (!showStats) {
      setStreamStats(null)
      if (streamStatsTimer.current) clearInterval(streamStatsTimer.current)
      return
    }

    const poll = () => setStreamStats(collectStats())
    poll()
    streamStatsTimer.current = setInterval(poll, 1000)
    return () => clearInterval(streamStatsTimer.current)
  }, [showStats, collectStats])

  const switchSubtitle = (index) => {
    if (isHls && hlsRef.current) {
      hlsRef.current.subtitleTrack = index
    } else if (videoRef.current?.textTracks) {
      for (let i = 0; i < videoRef.current.textTracks.length; i++) {
        videoRef.current.textTracks[i].mode = (i === index) ? 'showing' : 'hidden'
      }
    }
    setCurrentSubtitleTrack(index)
  }

  const hasTrackOptions = audioTracks.length > 1 || subtitleTracks.length > 0

  return (
    <div className="relative w-full h-full bg-black flex items-center justify-center group">
      {/* Top bar */}
      <div className="absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-start justify-between opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className="flex items-center gap-3">
          {onBack && (
            <button
              onClick={onBack}
              className="bg-black/60 hover:bg-black/80 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
          )}

          {proxyMode && (
            <div
              className={`px-2.5 py-1 rounded text-xs font-bold uppercase tracking-wide ${
                proxyMode === 'proxied'
                  ? 'bg-orange-500/80 text-white'
                  : 'bg-green-500/80 text-white'
              }`}
              title={
                proxyMode === 'proxied'
                  ? `Segments proxied through server${proxyStats ? ` | Total proxied: ${proxyStats.humanReadable} (${proxyStats.requestsProxied} requests)` : ''}`
                  : 'Segments loaded directly from source'
              }
            >
              {proxyMode === 'proxied' ? (
                <>PROXIED{proxyStats ? ` | ${proxyStats.humanReadable}` : ''}</>
              ) : (
                'DIRECT'
              )}
            </div>
          )}

          {resolutionLabel && (
            <div className="bg-black/60 border border-gray-700/50 px-2.5 py-1 rounded text-xs font-bold text-gray-200 uppercase tracking-wide">
              {resolutionLabel}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {/* Chromecast button — only visible in Electron */}
          {isCastAvailable && (
            <div className="relative" ref={castPickerRef}>
              <button
                onClick={handleCastClick}
                className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
                  castState === 'casting'
                    ? 'bg-purple-600 text-white'
                    : castState === 'connecting'
                      ? 'bg-yellow-600/80 text-white'
                      : 'bg-black/60 hover:bg-black/80 text-white'
                }`}
                title={castState === 'casting' ? `Casting to ${castDeviceName}` : 'Cast to device'}
              >
                <svg viewBox="0 0 24 24" className="w-4 h-4" fill="currentColor">
                  {castState === 'casting' ? (
                    // Connected cast icon (filled waves)
                    <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5v1.63c3.96 1.28 7.09 4.41 8.37 8.37H19V7zM1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  ) : (
                    // Disconnected cast icon
                    <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
                  )}
                </svg>
                {castState === 'casting' ? 'Casting' : castState === 'connecting' ? 'Connecting…' : 'Cast'}
              </button>

              {/* Device picker dropdown */}
              {showCastPicker && (
                <div className="absolute right-0 top-full mt-2 bg-gray-900/95 backdrop-blur-sm border border-gray-700 rounded-xl p-3 min-w-[260px] shadow-2xl">
                  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">
                    Available Devices
                  </h4>

                  {castDevices.length === 0 && (
                    <div className="text-sm text-gray-500 py-3 px-2 flex items-center gap-3">
                      <div className="w-4 h-4 border-2 border-gray-600 border-t-purple-400 rounded-full animate-spin flex-shrink-0" />
                      Scanning for devices…
                    </div>
                  )}

                  <div className="space-y-1">
                    {castDevices.map((device) => (
                      <button
                        key={device.id}
                        onClick={() => handleCastToDevice(device)}
                        disabled={castState === 'connecting'}
                        className="w-full text-left px-3 py-2.5 rounded-lg text-sm text-gray-200 hover:bg-gray-800 transition flex items-center gap-3 disabled:opacity-50"
                      >
                        <svg viewBox="0 0 24 24" className="w-5 h-5 text-purple-400 flex-shrink-0" fill="currentColor">
                          <path d="M21 3H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zM1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm0-4v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11z" />
                        </svg>
                        <div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-xs text-gray-500">{device.model}</div>
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Stats button */}
          <button
            onClick={() => setShowStats((p) => !p)}
            className={`px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition ${
              showStats ? 'bg-purple-600 text-white' : 'bg-black/60 hover:bg-black/80 text-white'
            }`}
            title="Stream Stats"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            Stats
          </button>

          {hasTrackOptions && (
            <button
              onClick={() => setShowPanel((p) => !p)}
              className="bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
              Tracks
            </button>
          )}
        </div>
      </div>

      {showPanel && hasTrackOptions && (
        <div className="absolute top-16 right-4 z-20 bg-gray-900/95 border border-gray-700 rounded-xl p-4 min-w-[220px] max-h-[70vh] overflow-y-auto">
          {audioTracks.length > 1 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Audio</h4>
              <div className="space-y-1">
                {audioTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => switchAudio(track.id)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      currentAudioTrack === track.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {track.name}
                    {track.lang && track.name !== track.lang ? ` (${track.lang})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}

          {subtitleTracks.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Subtitles</h4>
              <div className="space-y-1">
                <button
                  onClick={() => switchSubtitle(-1)}
                  className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                    currentSubtitleTrack === -1
                      ? 'bg-purple-600 text-white'
                      : 'text-gray-300 hover:bg-gray-800'
                  }`}
                >
                  Off
                </button>
                {subtitleTracks.map((track) => (
                  <button
                    key={track.id}
                    onClick={() => switchSubtitle(track.id)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      currentSubtitleTrack === track.id
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {track.name}
                    {track.lang && track.name !== track.lang ? ` (${track.lang})` : ''}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Stats overlay — always visible, bottom-left */}
      {showStats && streamStats && (
        <div className="absolute bottom-16 left-4 z-20 bg-black/85 backdrop-blur-sm border border-gray-700/50 rounded-xl p-4 min-w-[340px] max-w-[420px] font-mono text-xs select-text">
          <div className="flex items-center justify-between mb-3">
            <h4 className="text-[11px] font-bold text-gray-300 uppercase tracking-widest">Stats for Nerds</h4>
            <button
              onClick={() => setShowStats(false)}
              className="text-gray-500 hover:text-gray-300 transition"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
          <div className="space-y-2">
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Stream URL</span>
              <span className="text-gray-200 text-right truncate max-w-[250px]" title={streamStats.streamUrl}>{streamStats.streamUrl}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Host / IP</span>
              <span className="text-gray-200">{streamStats.streamHost}</span>
            </div>
            <div className="border-t border-gray-700/50 my-1" />
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Resolution</span>
              <span className="text-gray-200">{streamStats.resolution}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Bitrate</span>
              <span className="text-gray-200">{streamStats.bitrate}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Est. Bandwidth</span>
              <span className="text-gray-200">{streamStats.estimatedBandwidth}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Codec</span>
              <span className="text-gray-200">{streamStats.codec}</span>
            </div>
            <div className="border-t border-gray-700/50 my-1" />
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Data Consumed</span>
              <span className="text-gray-200">{streamStats.bandwidthConsumed}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Buffer Health</span>
              <span className="text-gray-200">{streamStats.bufferHealth}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">FPS</span>
              <span className="text-gray-200">{streamStats.fps ?? '—'}</span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Dropped Frames</span>
              <span className={`${(streamStats.droppedFrames || 0) > 10 ? 'text-red-400' : 'text-gray-200'}`}>
                {streamStats.droppedFrames ?? '—'}{streamStats.totalFrames ? ` / ${streamStats.totalFrames}` : ''}
              </span>
            </div>
            <div className="border-t border-gray-700/50 my-1" />
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Connection</span>
              <span className={`font-semibold ${streamStats.connectionType === 'Direct' ? 'text-green-400' : 'text-orange-400'}`}>
                {streamStats.connectionType}
              </span>
            </div>
            <div className="flex justify-between gap-4">
              <span className="text-gray-500">Session Uptime</span>
              <span className="text-gray-200">{streamStats.uptime}</span>
            </div>
            {streamStats.levels?.length > 1 && (
              <>
                <div className="border-t border-gray-700/50 my-1" />
                <div>
                  <span className="text-gray-500">Quality Levels</span>
                  <div className="mt-1.5 flex flex-wrap gap-1">
                    {streamStats.levels.map((l) => (
                      <span
                        key={l.index}
                        className={`px-2 py-0.5 rounded text-[10px] border ${
                          l.active
                            ? 'bg-purple-600/30 border-purple-500/50 text-purple-300'
                            : 'bg-gray-800/50 border-gray-700/50 text-gray-500'
                        }`}
                      >
                        {l.resolution} @ {l.bitrate}
                      </span>
                    ))}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Casting overlay — shown when actively casting to a Chromecast */}
      {castState === 'casting' && (
        <div className="absolute inset-0 z-30 bg-gray-950/90 flex flex-col items-center justify-center gap-6">
          <div className="w-20 h-20 rounded-full bg-purple-500/10 border border-purple-500/30 flex items-center justify-center">
            <svg viewBox="0 0 24 24" className="w-10 h-10 text-purple-400" fill="currentColor">
              <path d="M1 18v3h3c0-1.66-1.34-3-3-3zm0-4v2c2.76 0 5 2.24 5 5h2c0-3.87-3.13-7-7-7zm18-7H5v1.63c3.96 1.28 7.09 4.41 8.37 8.37H19V7zM1 10v2c4.97 0 9 4.03 9 9h2c0-6.08-4.93-11-11-11zm20-7H3c-1.1 0-2 .9-2 2v3h2V5h18v14h-7v2h7c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2z" />
            </svg>
          </div>
          <div className="text-center">
            <div className="text-xl font-semibold text-gray-100">Casting to {castDeviceName}</div>
            <div className="text-sm text-gray-400 mt-1">Playing on your TV</div>
          </div>
          <button
            onClick={handleStopCasting}
            className="bg-gray-800 hover:bg-gray-700 text-white px-6 py-2.5 rounded-lg text-sm font-medium transition border border-gray-700"
          >
            Stop Casting
          </button>
        </div>
      )}

      {/* Connecting overlay */}
      {castState === 'connecting' && (
        <div className="absolute inset-0 z-30 bg-gray-950/80 flex flex-col items-center justify-center gap-4">
          <div className="w-10 h-10 border-3 border-gray-600 border-t-purple-400 rounded-full animate-spin" />
          <div className="text-sm text-gray-400">Connecting to Chromecast…</div>
        </div>
      )}

      <video
        ref={videoRef}
        className="w-full h-full"
        controls
        autoPlay
        poster={poster}
      />
    </div>
  )
}
