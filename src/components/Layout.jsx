import { useState } from 'react'
import { Outlet, useLocation } from 'react-router-dom'
import Sidebar from './Sidebar'
import SearchBar from './SearchBar'

export default function Layout() {
  const [search, setSearch] = useState('')
  const location = useLocation()

  // Reset search when navigating to a different page
  const [prevPath, setPrevPath] = useState(location.pathname)
  if (location.pathname !== prevPath) {
    setPrevPath(location.pathname)
    if (search) setSearch('')
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex-1 ml-56">
        <header className="sticky top-0 z-20 bg-gray-950/80 backdrop-blur border-b border-gray-800 px-6 py-3">
          <SearchBar value={search} onChange={setSearch} />
        </header>
        <main className="p-6">
          <Outlet context={{ search }} />
        </main>
      </div>
    </div>
  )
}
