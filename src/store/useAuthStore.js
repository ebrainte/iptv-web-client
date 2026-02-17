import { create } from 'zustand'

const saved = JSON.parse(localStorage.getItem('iptv_auth') || 'null')

const useAuthStore = create((set) => ({
  server: saved?.server || '',
  username: saved?.username || '',
  password: saved?.password || '',
  userInfo: saved?.userInfo || null,
  serverInfo: saved?.serverInfo || null,
  isAuthenticated: !!saved?.userInfo,

  setAuth: (server, username, password, userInfo, serverInfo) => {
    const data = { server, username, password, userInfo, serverInfo }
    localStorage.setItem('iptv_auth', JSON.stringify(data))
    set({ ...data, isAuthenticated: true })
  },

  logout: () => {
    localStorage.removeItem('iptv_auth')
    set({
      server: '',
      username: '',
      password: '',
      userInfo: null,
      serverInfo: null,
      isAuthenticated: false,
    })
  },
}))

export default useAuthStore
