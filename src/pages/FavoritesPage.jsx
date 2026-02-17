import { useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import useFavoritesStore from '../store/useFavoritesStore'
import ChannelCard from '../components/ChannelCard'
import VodCard from '../components/VodCard'

export default function FavoritesPage() {
  const { search } = useOutletContext()
  const favorites = useFavoritesStore((s) => s.favorites)

  const filtered = useMemo(() => {
    if (!search) return favorites
    const q = search.toLowerCase()
    return favorites.filter((f) => (f.name || f.title || '').toLowerCase().includes(q))
  }, [favorites, search])

  const liveChannels = filtered.filter((f) => f.type === 'live')
  const vodItems = filtered.filter((f) => f.type === 'vod')
  const seriesItems = filtered.filter((f) => f.type === 'series')

  if (filtered.length === 0) {
    return (
      <div className="text-center py-20">
        <svg className="w-16 h-16 text-gray-700 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
        <h2 className="text-xl font-bold mb-2">{search ? 'No Favorites Match' : 'No Favorites Yet'}</h2>
        <p className="text-gray-500">
          {search ? 'Try a different search term.' : 'Click the heart icon on any channel or movie to add it here.'}
        </p>
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-6">Favorites</h2>

      {liveChannels.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Live Channels</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {liveChannels.map((ch) => (
              <ChannelCard key={ch.stream_id} channel={ch} />
            ))}
          </div>
        </div>
      )}

      {vodItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Movies</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {vodItems.map((m) => (
              <VodCard key={m.stream_id} item={m} type="vod" />
            ))}
          </div>
        </div>
      )}

      {seriesItems.length > 0 && (
        <div className="mb-8">
          <h3 className="text-lg font-semibold mb-3 text-gray-300">Series</h3>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {seriesItems.map((s) => (
              <VodCard key={s.stream_id} item={s} type="series" />
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
