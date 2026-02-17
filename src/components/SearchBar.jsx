import { useLocation } from 'react-router-dom'

const placeholders = {
  '/live': 'Search live channels...',
  '/movies': 'Search movies...',
  '/series': 'Search series...',
  '/favorites': 'Search favorites...',
  '/epg': 'Search EPG channels...',
}

export default function SearchBar({ value, onChange }) {
  const location = useLocation()
  const placeholder = placeholders[location.pathname] || 'Search...'

  return (
    <div className="max-w-md">
      <div className="relative">
        <svg
          className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500"
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
        </svg>
        <input
          type="text"
          value={value}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className="w-full bg-gray-800 border border-gray-700 rounded-lg pl-10 pr-4 py-2 text-sm text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
        />
      </div>
    </div>
  )
}
