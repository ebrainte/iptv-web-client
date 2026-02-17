import { create } from 'zustand'

const saved = JSON.parse(localStorage.getItem('iptv_favorites') || '[]')

const useFavoritesStore = create((set, get) => ({
  favorites: saved,

  addFavorite: (item) => {
    const favs = [...get().favorites, item]
    localStorage.setItem('iptv_favorites', JSON.stringify(favs))
    set({ favorites: favs })
  },

  removeFavorite: (streamId) => {
    const favs = get().favorites.filter((f) => f.stream_id !== streamId)
    localStorage.setItem('iptv_favorites', JSON.stringify(favs))
    set({ favorites: favs })
  },

  isFavorite: (streamId) => {
    return get().favorites.some((f) => f.stream_id === streamId)
  },
}))

export default useFavoritesStore
