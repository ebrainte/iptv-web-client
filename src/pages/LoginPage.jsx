import { useState } from 'react'
import { useNavigate, Navigate } from 'react-router-dom'
import { authenticate } from '../api/xtreamApi'
import useAuthStore from '../store/useAuthStore'
import useProfilesStore from '../store/useProfilesStore'

export default function LoginPage() {
  const [server, setServer] = useState('')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [profileName, setProfileName] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  
  const setAuth = useAuthStore((s) => s.setAuth)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  
  const profiles = useProfilesStore((s) => s.profiles)
  const saveProfile = useProfilesStore((s) => s.saveProfile)
  const deleteProfile = useProfilesStore((s) => s.deleteProfile)
  
  const navigate = useNavigate()

  // Already logged in — skip straight to live TV
  if (isAuthenticated) return <Navigate to="/live" replace />

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    let normalizedServer = server.trim()
    if (!normalizedServer.startsWith('http')) {
      normalizedServer = 'http://' + normalizedServer
    }
    normalizedServer = normalizedServer.replace(/\/+$/, '')

    try {
      const data = await authenticate(normalizedServer, username.trim(), password.trim())
      setAuth(normalizedServer, username.trim(), password.trim(), data.user_info, data.server_info)
      
      // Auto-save profile if profileName is set
      if (profileName.trim()) {
        saveProfile(profileName.trim(), normalizedServer, username.trim(), password.trim())
      }
      
      navigate('/live')
    } catch (err) {
      setError(err.message || 'Connection failed')
    } finally {
      setLoading(false)
    }
  }

  const handleSaveProfileOnly = () => {
    if (!profileName.trim()) return
    let normalizedServer = server.trim()
    if (!normalizedServer.startsWith('http')) {
      normalizedServer = 'http://' + normalizedServer
    }
    normalizedServer = normalizedServer.replace(/\/+$/, '')
    saveProfile(profileName, normalizedServer, username.trim(), password.trim())
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-gray-950 text-gray-100">
      <div className={`w-full transition-all duration-300 ${profiles.length > 0 ? 'max-w-4xl' : 'max-w-sm'}`}>
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-purple-400 mb-2">IPTV Client</h1>
          <p className="text-gray-500 text-sm">Connect to your Xtream Codes server</p>
        </div>

        <div className={`grid gap-8 ${profiles.length > 0 ? 'md:grid-cols-12' : 'grid-cols-1'}`}>
          {/* Saved Profiles Side Panel */}
          {profiles.length > 0 && (
            <div className="md:col-span-5 bg-gray-900/40 border border-gray-800 rounded-2xl p-6 flex flex-col h-[400px]">
              <h2 className="text-lg font-semibold text-gray-200 mb-4 flex items-center justify-between">
                <span>Saved Profiles</span>
                <span className="text-xs bg-purple-500/10 text-purple-400 px-2 py-0.5 rounded-full border border-purple-500/20">
                  {profiles.length} {profiles.length === 1 ? 'profile' : 'profiles'}
                </span>
              </h2>
              <div className="flex-1 overflow-y-auto space-y-3 pr-1">
                {profiles.map((p) => (
                  <div
                    key={p.id}
                    onClick={() => {
                      setServer(p.server)
                      setUsername(p.username)
                      setPassword(p.password)
                      setProfileName(p.name)
                    }}
                    className={`group relative p-4 rounded-xl border transition cursor-pointer text-left ${
                      server === p.server && username === p.username
                        ? 'bg-purple-950/20 border-purple-500/50'
                        : 'bg-gray-900/50 border-gray-800 hover:border-gray-700 hover:bg-gray-900'
                    }`}
                  >
                    <div className="pr-8">
                      <div className="font-semibold text-purple-300 text-sm truncate">{p.name}</div>
                      <div className="text-xs text-gray-400 truncate mt-1">{p.server}</div>
                      <div className="text-xs text-gray-500 mt-0.5">User: {p.username}</div>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation()
                        deleteProfile(p.id)
                      }}
                      className="absolute right-3 top-1/2 -translate-y-1/2 p-2 text-gray-400 hover:text-red-400 rounded-lg hover:bg-gray-800/50 transition opacity-0 group-hover:opacity-100 focus:opacity-100"
                      title="Delete Profile"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-4 h-4">
                        <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Connection Form */}
          <div className={`${profiles.length > 0 ? 'md:col-span-7' : 'w-full'}`}>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-sm text-gray-400 mb-1">Server URL</label>
                <input
                  type="text"
                  value={server}
                  onChange={(e) => setServer(e.target.value)}
                  placeholder="http://example.com:8080"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Username</label>
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="Username"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>
              <div>
                <label className="block text-sm text-gray-400 mb-1">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password"
                  required
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                />
              </div>

              <div>
                <label className="block text-sm text-gray-400 mb-1">Profile Name (Optional)</label>
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={profileName}
                    onChange={(e) => setProfileName(e.target.value)}
                    placeholder="Save as: e.g. Home Server"
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-4 py-2.5 text-sm focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                  />
                  {profileName && server && username && password && (
                    <button
                      type="button"
                      onClick={handleSaveProfileOnly}
                      className="bg-gray-900 hover:bg-gray-800 text-purple-400 hover:text-purple-300 font-medium px-4 rounded-lg border border-gray-700 transition text-sm whitespace-nowrap"
                    >
                      Save Profile
                    </button>
                  )}
                </div>
              </div>

              {error && (
                <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2 text-sm text-red-400">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-purple-600 hover:bg-purple-700 disabled:bg-purple-600/50 text-white font-medium rounded-lg py-2.5 text-sm transition"
              >
                {loading ? 'Connecting...' : 'Connect'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
