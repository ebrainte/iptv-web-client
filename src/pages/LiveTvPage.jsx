import { useState, useEffect, useMemo } from 'react'
import { useOutletContext, useSearchParams } from 'react-router-dom'
import useContentStore from '../store/useContentStore'
import ChannelCard from '../components/ChannelCard'

export default function LiveTvPage() {
  const { search } = useOutletContext()
  const [searchParams, setSearchParams] = useSearchParams()
  const [categories, setCategories] = useState([])
  const [channels, setChannels] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadingChannels, setLoadingChannels] = useState(false)

  const selectedCategory = searchParams.get('cat')

  const fetchLiveCategories = useContentStore((s) => s.fetchLiveCategories)
  const fetchLiveStreams = useContentStore((s) => s.fetchLiveStreams)

  // Load categories on mount
  useEffect(() => {
    fetchLiveCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [fetchLiveCategories])

  // Load channels when a category is selected (including from URL on back-nav)
  useEffect(() => {
    if (!selectedCategory) {
      setChannels([])
      return
    }
    setLoadingChannels(true)
    fetchLiveStreams(selectedCategory)
      .then(setChannels)
      .catch(() => setChannels([]))
      .finally(() => setLoadingChannels(false))
  }, [selectedCategory, fetchLiveStreams])

  const handleSelectCategory = (cat) => {
    setSearchParams({ cat: cat.category_id })
  }

  const handleBack = () => {
    setSearchParams({})
  }

  const filteredCategories = useMemo(() => {
    if (!search) return categories
    const q = search.toLowerCase()
    return categories.filter((c) => c.category_name.toLowerCase().includes(q))
  }, [categories, search])

  const filteredChannels = useMemo(() => {
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

  // Show channels for selected category
  if (selectedCategory) {
    const catName = categories.find((c) => String(c.category_id) === selectedCategory)?.category_name || ''
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button
            onClick={handleBack}
            className="text-gray-400 hover:text-white transition"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">{catName}</h2>
        </div>
        {loadingChannels ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredChannels.map((ch) => (
              <ChannelCard key={ch.stream_id} channel={ch} />
            ))}
          </div>
        )}
        {!loadingChannels && filteredChannels.length === 0 && (
          <p className="text-center text-gray-500 py-20">
            {search ? 'No channels match your search' : 'No channels in this category'}
          </p>
        )}
      </div>
    )
  }

  // Show categories grid
  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Live TV</h2>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
        {filteredCategories.map((cat) => (
          <button
            key={cat.category_id}
            onClick={() => handleSelectCategory(cat)}
            className="bg-gray-900 border border-gray-800 rounded-xl p-5 text-left hover:border-purple-500/50 hover:bg-gray-800/50 transition"
          >
            <h3 className="font-medium text-sm">{cat.category_name}</h3>
          </button>
        ))}
      </div>
      {filteredCategories.length === 0 && (
        <p className="text-center text-gray-500 py-20">
          {search ? 'No categories match your search' : 'No categories found'}
        </p>
      )}
    </div>
  )
}
