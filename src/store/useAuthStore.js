import { create } from 'zustand'
import useContentStore from './useContentStore'

// Use Electron's file-based storage when available, fall back to localStorage for web
const storage = {
  getItem(key) {
    if (window.electronStorage) return window.electronStorage.getItem(key)
    return localStorage.getItem(key)
  },
  setItem(key, value) {
    if (window.electronStorage) return window.electronStorage.setItem(key, value)
    localStorage.setItem(key, value)
  },
  removeItem(key) {
    if (window.electronStorage) return window.electronStorage.removeItem(key)
    localStorage.removeItem(key)
  },
}

const saved = JSON.parse(storage.getItem('iptv_auth') || 'null')

const useAuthStore = create((set) => ({
  server: saved?.server || '',
  username: saved?.username || '',
  password: saved?.password || '',
  userInfo: saved?.userInfo || null,
  serverInfo: saved?.serverInfo || null,
  isAuthenticated: !!saved?.userInfo,

  setAuth: (server, username, password, userInfo, serverInfo) => {
    const data = { server, username, password, userInfo, serverInfo }
    storage.setItem('iptv_auth', JSON.stringify(data))
    useContentStore.getState().clear()
    set({ ...data, isAuthenticated: true })
  },

  logout: () => {
    storage.removeItem('iptv_auth')
    useContentStore.getState().clear()
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
