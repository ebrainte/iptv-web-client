import { NavLink } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'

const navItems = [
  { to: '/live', label: 'Live TV', icon: 'M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z' },
  { to: '/movies', label: 'Movies', icon: 'M7 4v16M17 4v16M3 8h4m10 0h4M3 12h18M3 16h4m10 0h4M4 20h16a1 1 0 001-1V5a1 1 0 00-1-1H4a1 1 0 00-1 1v14a1 1 0 001 1z' },
  { to: '/series', label: 'Series', icon: 'M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10' },
  { to: '/epg', label: 'EPG Guide', icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z' },
  { to: '/favorites', label: 'Favorites', icon: 'M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z' },
]

export default function Sidebar() {
  const logout = useAuthStore((s) => s.logout)
  const userInfo = useAuthStore((s) => s.userInfo)

  return (
    <aside className="w-56 bg-gray-900 border-r border-gray-800 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-4 border-b border-gray-800">
        <h1 className="text-xl font-bold text-purple-400">IPTV Client</h1>
      </div>

      <nav className="flex-1 p-2 space-y-1">
        {navItems.map((item) => (
          <NavLink
            key={item.to}
            to={item.to}
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2.5 rounded-lg transition text-sm ${
                isActive
                  ? 'bg-purple-600/20 text-purple-400'
                  : 'text-gray-400 hover:bg-gray-800 hover:text-gray-200'
              }`
            }
          >
            <svg className="w-5 h-5 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d={item.icon} />
            </svg>
            {item.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-3 border-t border-gray-800">
        {userInfo && (
          <p className="text-xs text-gray-500 mb-2 truncate">
            {userInfo.username} &middot; Exp: {userInfo.exp_date ? new Date(userInfo.exp_date * 1000).toLocaleDateString() : 'N/A'}
          </p>
        )}
        <button
          onClick={logout}
          className="w-full text-sm text-gray-400 hover:text-red-400 hover:bg-gray-800 px-3 py-2 rounded-lg transition text-left"
        >
          Logout
        </button>
      </div>
    </aside>
  )
}
