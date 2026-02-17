import { useState, useEffect, useMemo } from 'react'
import { useOutletContext } from 'react-router-dom'
import { getVodCategories, getVodStreams } from '../api/xtreamApi'
import VodCard from '../components/VodCard'

export default function VodPage() {
  const { search } = useOutletContext()
  const [categories, setCategories] = useState([])
  const [movies, setMovies] = useState([])
  const [selectedCategory, setSelectedCategory] = useState(null)
  const [loading, setLoading] = useState(true)
  const [loadingMovies, setLoadingMovies] = useState(false)

  useEffect(() => {
    getVodCategories()
      .then(setCategories)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  const handleSelectCategory = (cat) => {
    setSelectedCategory(cat.category_id)
    setLoadingMovies(true)
    getVodStreams(cat.category_id)
      .then(setMovies)
      .catch(() => setMovies([]))
      .finally(() => setLoadingMovies(false))
  }

  const handleBack = () => {
    setSelectedCategory(null)
    setMovies([])
  }

  const filteredCategories = useMemo(() => {
    if (!search) return categories
    const q = search.toLowerCase()
    return categories.filter((c) => c.category_name.toLowerCase().includes(q))
  }, [categories, search])

  const filteredMovies = useMemo(() => {
    if (!search) return movies
    const q = search.toLowerCase()
    return movies.filter((m) => m.name?.toLowerCase().includes(q))
  }, [movies, search])

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
      </div>
    )
  }

  if (selectedCategory) {
    const catName = categories.find((c) => c.category_id === selectedCategory)?.category_name || ''
    return (
      <div>
        <div className="flex items-center gap-3 mb-4">
          <button onClick={handleBack} className="text-gray-400 hover:text-white transition">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-2xl font-bold">{catName}</h2>
        </div>
        {loadingMovies ? (
          <div className="flex items-center justify-center py-20">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6 gap-4">
            {filteredMovies.map((m) => (
              <VodCard key={m.stream_id} item={m} type="vod" />
            ))}
          </div>
        )}
        {!loadingMovies && filteredMovies.length === 0 && (
          <p className="text-center text-gray-500 py-20">
            {search ? 'No movies match your search' : 'No movies in this category'}
          </p>
        )}
      </div>
    )
  }

  return (
    <div>
      <h2 className="text-2xl font-bold mb-4">Movies</h2>
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
