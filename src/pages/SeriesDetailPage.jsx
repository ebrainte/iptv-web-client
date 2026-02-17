import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { getSeriesInfo } from '../api/xtreamApi'

export default function SeriesDetailPage() {
  const { id } = useParams()
  const navigate = useNavigate()
  const [info, setInfo] = useState(null)
  const [selectedSeason, setSelectedSeason] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setLoading(true)
    getSeriesInfo(id)
      .then((data) => {
        setInfo(data)
        const seasons = Object.keys(data.episodes || {})
        if (seasons.length > 0) setSelectedSeason(seasons[0])
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [id])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (!info) {
    return <p className="text-center text-gray-500 py-20">Series not found</p>
  }

  const seriesInfo = info.info || {}
  const episodes = info.episodes || {}
  const seasons = Object.keys(episodes)

  return (
    <div>
      {/* Header */}
      <div className="flex gap-6 mb-8">
        {seriesInfo.cover && (
          <img
            src={seriesInfo.cover}
            alt={seriesInfo.name}
            className="w-48 rounded-xl object-cover shrink-0"
          />
        )}
        <div>
          <h2 className="text-3xl font-bold mb-2">{seriesInfo.name}</h2>
          <div className="flex items-center gap-3 text-sm text-gray-400 mb-3">
            {seriesInfo.rating && <span className="text-yellow-500">{seriesInfo.rating}</span>}
            {seriesInfo.genre && <span>{seriesInfo.genre}</span>}
            {seriesInfo.releaseDate && <span>{seriesInfo.releaseDate}</span>}
          </div>
          {seriesInfo.plot && (
            <p className="text-sm text-gray-400 max-w-2xl line-clamp-4">{seriesInfo.plot}</p>
          )}
          {seriesInfo.cast && (
            <p className="text-xs text-gray-500 mt-2">Cast: {seriesInfo.cast}</p>
          )}
        </div>
      </div>

      {/* Season tabs */}
      <div className="flex gap-2 mb-4 flex-wrap">
        {seasons.map((s) => (
          <button
            key={s}
            onClick={() => setSelectedSeason(s)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
              selectedSeason === s
                ? 'bg-purple-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Season {s}
          </button>
        ))}
      </div>

      {/* Episodes */}
      {selectedSeason && episodes[selectedSeason] && (
        <div className="space-y-2">
          {episodes[selectedSeason].map((ep) => (
            <div
              key={ep.id}
              onClick={() => navigate(`/player/series/${ep.id}`, { state: { ext: ep.container_extension } })}
              className="flex items-center gap-4 bg-gray-900 border border-gray-800 rounded-lg p-4 cursor-pointer hover:border-purple-500/50 transition"
            >
              {ep.info?.movie_image && (
                <img
                  src={ep.info.movie_image}
                  alt={ep.title}
                  className="w-32 h-20 object-cover rounded"
                />
              )}
              <div className="flex-1 min-w-0">
                <h4 className="font-medium text-sm">
                  E{ep.episode_num}. {ep.title}
                </h4>
                {ep.info?.plot && (
                  <p className="text-xs text-gray-500 mt-1 line-clamp-2">{ep.info.plot}</p>
                )}
                {ep.info?.duration && (
                  <span className="text-xs text-gray-600 mt-1 inline-block">{ep.info.duration}</span>
                )}
              </div>
              <svg className="w-5 h-5 text-gray-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
              </svg>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
