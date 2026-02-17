import { useNavigate } from 'react-router-dom'
import useFavoritesStore from '../store/useFavoritesStore'

export default function VodCard({ item, type = 'vod' }) {
  const navigate = useNavigate()
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore()

  const streamId = item.stream_id || item.series_id
  const fav = isFavorite(streamId)

  const handleClick = () => {
    if (type === 'series') {
      navigate(`/series/${item.series_id}`)
    } else {
      navigate(`/player/vod/${item.stream_id}`, { state: { ext: item.container_extension } })
    }
  }

  const toggleFav = (e) => {
    e.stopPropagation()
    if (fav) {
      removeFavorite(streamId)
    } else {
      addFavorite({ ...item, stream_id: streamId, type })
    }
  }

  const cover = item.stream_icon || item.cover || ''
  const title = item.name || item.title || ''
  const rating = item.rating || item.rating_5based
  const year = item.year || item.releaseDate

  return (
    <div
      onClick={handleClick}
      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition group"
    >
      <div className="aspect-[2/3] bg-gray-800 overflow-hidden">
        {cover ? (
          <img
            src={cover}
            alt={title}
            className="w-full h-full object-cover group-hover:scale-105 transition duration-300"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium line-clamp-2">{title}</h3>
          <button onClick={toggleFav} className="shrink-0 mt-0.5">
            <svg
              className={`w-4 h-4 ${fav ? 'text-red-500 fill-red-500' : 'text-gray-600 hover:text-red-400'}`}
              fill={fav ? 'currentColor' : 'none'}
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
        </div>
        <div className="flex items-center gap-2 mt-1">
          {rating && <span className="text-xs text-yellow-500">{rating}</span>}
          {year && <span className="text-xs text-gray-500">{year}</span>}
        </div>
      </div>
    </div>
  )
}
