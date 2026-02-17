import { useEffect, useRef, useState, useCallback } from 'react'
import Hls from 'hls.js'

export default function Player({ src, type, poster, onBack }) {
  const videoRef = useRef(null)
  const hlsRef = useRef(null)
  const [audioTracks, setAudioTracks] = useState([])
  const [currentAudioTrack, setCurrentAudioTrack] = useState(0)
  const [subtitleTracks, setSubtitleTracks] = useState([])
  const [currentSubtitleTrack, setCurrentSubtitleTrack] = useState(-1)
  const [showPanel, setShowPanel] = useState(false)

  const isHls = src?.endsWith('.m3u8')

  // Detect native audio/subtitle tracks from <video> element (for MKV/MP4)
  const detectNativeTracks = useCallback(() => {
    const video = videoRef.current
    if (!video) return

    // Audio tracks (limited browser support but works in some)
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

    // Text tracks (subtitles)
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

  useEffect(() => {
    const video = videoRef.current
    if (!video || !src) return

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
      hls.loadSource(src)
      hls.attachMedia(video)

      hls.on(Hls.Events.MANIFEST_PARSED, () => {
        video.play().catch(() => {})

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
      // Safari native HLS
      video.src = src
      video.addEventListener('loadedmetadata', detectNativeTracks)
      video.play().catch(() => {})
      return () => video.removeEventListener('loadedmetadata', detectNativeTracks)
    } else {
      // Direct playback (MKV, MP4, etc.)
      video.src = src
      video.addEventListener('loadedmetadata', detectNativeTracks)
      video.play().catch(() => {})
      return () => video.removeEventListener('loadedmetadata', detectNativeTracks)
    }
  }, [src, isHls, detectNativeTracks])

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

      {/* Track selection panel */}
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
