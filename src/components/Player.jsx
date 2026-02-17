import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

export default function Player({ src, fallbackSrc, poster, onBack }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [audioTracks, setAudioTracks] = useState([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState(-1)
  const [subtitleTracks, setSubtitleTracks] = useState([])
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1)
  const [showControls, setShowControls] = useState(false)
  const [usingFallback, setUsingFallback] = useState(false)
  const fallbackAttempted = useRef(false)

  const loadFallback = useCallback(() => {
    if (fallbackAttempted.current || !fallbackSrc) return
    fallbackAttempted.current = true
    setUsingFallback(true)
    setAudioTracks([])
    setSubtitleTracks([])

    if (hlsRef.current) {
      hlsRef.current.destroy()
      hlsRef.current = null
    }

    const video = videoRef.current
    if (!video) return
    video.src = fallbackSrc
    video.play().catch(() => {})
  }, [fallbackSrc])

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return
    fallbackAttempted.current = false
    setUsingFallback(false)
    setAudioTracks([])
    setSubtitleTracks([])
    setCurrentAudioTrack(-1)
    setCurrentSubtitleTrack(-1)

    if (!Hls.isSupported()) {
      // Safari native HLS or direct fallback
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = src
        video.play().catch(() => {})
      } else {
        loadFallback()
      }
      return
    }

    const hls = new Hls({
      enableWorker: true,
      lowLatencyMode: true,
    })
    hlsRef.current = hls
    hls.loadSource(src)
    hls.attachMedia(video)

    hls.on(Hls.Events.MANIFEST_PARSED, () => {
      video.play().catch(() => {})

      // Populate audio tracks
      if (hls.audioTracks.length > 1) {
        setAudioTracks(hls.audioTracks)
        setCurrentAudioTrack(hls.audioTrack)
      }

      // Populate subtitle tracks
      if (hls.subtitleTracks.length > 0) {
        setSubtitleTracks(hls.subtitleTracks)
        setCurrentSubtitleTrack(hls.subtitleTrack)
      }
    })

    hls.on(Hls.Events.AUDIO_TRACKS_UPDATED, () => {
      if (hls.audioTracks.length > 1) {
        setAudioTracks([...hls.audioTracks])
      }
    })

    hls.on(Hls.Events.SUBTITLE_TRACKS_UPDATED, () => {
      if (hls.subtitleTracks.length > 0) {
        setSubtitleTracks([...hls.subtitleTracks])
      }
    })

    hls.on(Hls.Events.AUDIO_TRACK_SWITCHED, () => {
      setCurrentAudioTrack(hls.audioTrack)
    })

    hls.on(Hls.Events.SUBTITLE_TRACK_SWITCH, () => {
      setCurrentSubtitleTrack(hls.subtitleTrack)
    })

    hls.on(Hls.Events.ERROR, (_, data) => {
      if (data.fatal) {
        if (data.type === Hls.ErrorTypes.MEDIA_ERROR) {
          hls.recoverMediaError()
        } else {
          // HLS failed — fall back to original container
          console.warn('HLS failed, falling back to direct playback:', data.type, data.details)
          hls.destroy()
          hlsRef.current = null
          loadFallback()
        }
      }
    })

    return () => {
      if (hlsRef.current) {
        hlsRef.current.destroy()
        hlsRef.current = null
      }
    }
  }, [src, loadFallback])

  const switchAudio = (index) => {
    if (hlsRef.current) {
      hlsRef.current.audioTrack = index
    }
  }

  const switchSubtitle = (index) => {
    if (hlsRef.current) {
      hlsRef.current.subtitleTrack = index
      setCurrentSubtitleTrack(index)
    }
  }

  const hasTrackOptions = audioTracks.length > 1 || subtitleTracks.length > 0

  return (
    <div
      className="relative w-full h-full bg-black flex items-center justify-center group"
      onMouseMove={() => setShowControls(true)}
      onMouseLeave={() => setShowControls(false)}
    >
      {/* Top bar: Back + Track controls */}
      <div className={`absolute top-0 left-0 right-0 z-10 bg-gradient-to-b from-black/80 to-transparent p-4 flex items-start justify-between transition-opacity duration-300 ${showControls ? 'opacity-100' : 'opacity-0'}`}>
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

        <div className="flex items-center gap-2">
          {usingFallback && (
            <span className="bg-yellow-600/80 text-white text-xs px-2 py-1 rounded">
              Direct playback
            </span>
          )}

          {hasTrackOptions && (
            <div className="relative">
              <button
                onClick={() => setShowControls((p) => !p)}
                className="bg-black/60 hover:bg-black/80 text-white px-3 py-2 rounded-lg flex items-center gap-2 text-sm transition"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                Tracks
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Track selection panel */}
      {hasTrackOptions && showControls && (
        <div className="absolute top-16 right-4 z-20 bg-gray-900/95 border border-gray-700 rounded-xl p-4 min-w-[220px] max-h-[70vh] overflow-y-auto">
          {audioTracks.length > 1 && (
            <div className="mb-4">
              <h4 className="text-xs font-semibold text-gray-400 uppercase mb-2">Audio</h4>
              <div className="space-y-1">
                {audioTracks.map((track, i) => (
                  <button
                    key={track.id}
                    onClick={() => switchAudio(i)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      currentAudioTrack === i
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {track.name || track.lang || `Track ${i + 1}`}
                    {track.lang && track.name && ` (${track.lang})`}
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
                {subtitleTracks.map((track, i) => (
                  <button
                    key={track.id}
                    onClick={() => switchSubtitle(i)}
                    className={`w-full text-left px-3 py-1.5 rounded text-sm transition ${
                      currentSubtitleTrack === i
                        ? 'bg-purple-600 text-white'
                        : 'text-gray-300 hover:bg-gray-800'
                    }`}
                  >
                    {track.name || track.lang || `Subtitle ${i + 1}`}
                    {track.lang && track.name && ` (${track.lang})`}
                  </button>
                ))}
              </div>
            </div>
          )}
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
