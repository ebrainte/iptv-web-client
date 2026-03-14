import { create } from 'zustand'
import {
  getLiveCategories,
  getLiveStreams,
  getVodCategories,
  getVodStreams,
  getSeriesCategories,
  getSeries,
} from '../api/xtreamApi'

const useContentStore = create((set, get) => ({
  // Categories per section
  liveCategories: null,
  vodCategories: null,
  seriesCategories: null,

  // Streams keyed by categoryId
  liveStreams: {},
  vodStreams: {},
  seriesStreams: {},

  // Fetch helpers — return cached data if available, otherwise fetch and cache

  fetchLiveCategories: async () => {
    const { liveCategories } = get()
    if (liveCategories) return liveCategories
    const data = await getLiveCategories()
    set({ liveCategories: data })
    return data
  },

  fetchLiveStreams: async (categoryId) => {
    const { liveStreams } = get()
    if (liveStreams[categoryId]) return liveStreams[categoryId]
    const data = await getLiveStreams(categoryId)
    set({ liveStreams: { ...get().liveStreams, [categoryId]: data } })
    return data
  },

  fetchVodCategories: async () => {
    const { vodCategories } = get()
    if (vodCategories) return vodCategories
    const data = await getVodCategories()
    set({ vodCategories: data })
    return data
  },

  fetchVodStreams: async (categoryId) => {
    const { vodStreams } = get()
    if (vodStreams[categoryId]) return vodStreams[categoryId]
    const data = await getVodStreams(categoryId)
    set({ vodStreams: { ...get().vodStreams, [categoryId]: data } })
    return data
  },

  fetchSeriesCategories: async () => {
    const { seriesCategories } = get()
    if (seriesCategories) return seriesCategories
    const data = await getSeriesCategories()
    set({ seriesCategories: data })
    return data
  },

  fetchSeries: async (categoryId) => {
    const { seriesStreams } = get()
    if (seriesStreams[categoryId]) return seriesStreams[categoryId]
    const data = await getSeries(categoryId)
    set({ seriesStreams: { ...get().seriesStreams, [categoryId]: data } })
    return data
  },

  // Clear everything on logout
  clear: () =>
    set({
      liveCategories: null,
      vodCategories: null,
      seriesCategories: null,
      liveStreams: {},
      vodStreams: {},
      seriesStreams: {},
    }),
}))

export default useContentStore
