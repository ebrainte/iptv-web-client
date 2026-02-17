import { useNavigate } from 'react-router-dom'
import useFavoritesStore from '../store/useFavoritesStore'

export default function ChannelCard({ channel }) {
  const navigate = useNavigate()
  const { isFavorite, addFavorite, removeFavorite } = useFavoritesStore()
  const fav = isFavorite(channel.stream_id)

  const toggleFav = (e) => {
    e.stopPropagation()
    if (fav) {
      removeFavorite(channel.stream_id)
    } else {
      addFavorite({ ...channel, type: 'live' })
    }
  }

  return (
    <div
      onClick={() => navigate(`/player/live/${channel.stream_id}`, { state: { ext: channel.container_extension } })}
      className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden cursor-pointer hover:border-purple-500/50 hover:shadow-lg hover:shadow-purple-500/5 transition group"
    >
      <div className="aspect-video bg-gray-800 flex items-center justify-center overflow-hidden">
        {channel.stream_icon ? (
          <img
            src={channel.stream_icon}
            alt={channel.name}
            className="w-full h-full object-contain p-4"
            onError={(e) => { e.target.style.display = 'none' }}
          />
        ) : (
          <svg className="w-10 h-10 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        )}
      </div>
      <div className="p-3">
        <div className="flex items-start justify-between gap-2">
          <h3 className="text-sm font-medium truncate">{channel.name}</h3>
          <button onClick={toggleFav} className="shrink-0">
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
        {channel.epg_channel_id && (
          <p className="text-xs text-gray-500 mt-1 truncate">{channel.epg_channel_id}</p>
        )}
      </div>
    </div>
  )
}
