import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getLiveStreams, getShortEpg } from '../api/xtreamApi'

export default function EpgPage() {
  const { search } = useOutletContext()
  const [channels, setChannels] = useState([])
  const [epgData, setEpgData] = useState({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getLiveStreams()
      .then((streams) => {
        // Only load channels that have EPG
        const withEpg = streams.filter((s) => s.epg_channel_id)
        setChannels(withEpg.slice(0, 100)) // Limit to 100 to avoid too many requests
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    channels.forEach((ch) => {
      if (!epgData[ch.stream_id]) {
        getShortEpg(ch.stream_id, 3)
          .then((data) => {
            setEpgData((prev) => ({
              ...prev,
              [ch.stream_id]: data.epg_listings || [],
            }))
          })
          .catch(() => {})
      }
    })
  }, [channels])

  const filtered = useMemo(() => {
    if (!search) return channels
    const q = search.toLowerCase()
    return channels.filter((ch) => ch.name.toLowerCase().includes(q))
  }, [channels, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">EPG Guide</h2>

      <div className="space-y-3">
        {filtered.map((ch) => {
          const listings = epgData[ch.stream_id] || []
          return (
            <div key={ch.stream_id} className="bg-gray-900 border border-gray-800 rounded-lg p-4">
              <div className="flex items-center gap-3 mb-3">
                {ch.stream_icon && (
                  <img src={ch.stream_icon} alt="" className="w-8 h-8 object-contain" />
                )}
                <h3 className="font-medium text-sm">{ch.name}</h3>
              </div>
              {listings.length > 0 ? (
                <div className="space-y-1.5">
                  {listings.map((ep, i) => {
                    const start = ep.start ? new Date(ep.start) : null
                    const end = ep.end ? new Date(ep.end) : null
                    const now = new Date()
                    const isNow = start && end && now >= start && now <= end
                    const title = ep.title ? atob(ep.title) : 'N/A'

                    return (
                      <div
                        key={i}
                        className={`flex items-center gap-3 text-xs px-2 py-1.5 rounded ${
                          isNow ? 'bg-purple-600/20 text-purple-300' : 'text-gray-400'
                        }`}
                      >
                        <span className="shrink-0 w-28">
                          {start ? start.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''} -{' '}
                          {end ? end.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        </span>
                        <span className="truncate">{title}</span>
                        {isNow && (
                          <span className="shrink-0 text-[10px] bg-purple-600 text-white px-1.5 py-0.5 rounded">
                            NOW
                          </span>
                        )}
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-xs text-gray-600">No EPG data available</p>
              )}
            </div>
          )
        })}
      </div>

      {filtered.length === 0 && (
        <p className="text-center text-gray-500 py-20">No channels with EPG data found</p>
      )}
    </div>
  )
}
