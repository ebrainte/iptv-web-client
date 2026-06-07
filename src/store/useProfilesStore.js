import { create } from 'zustand'

const storage = {
  getItem(key) {
    if (typeof window !== 'undefined' && window.electronStorage) {
      return window.electronStorage.getItem(key)
    }
    return typeof window !== 'undefined' ? localStorage.getItem(key) : null
  },
  setItem(key, value) {
    if (typeof window !== 'undefined' && window.electronStorage) {
      return window.electronStorage.setItem(key, value)
    }
    if (typeof window !== 'undefined') {
      localStorage.setItem(key, value)
    }
  },
  removeItem(key) {
    if (typeof window !== 'undefined' && window.electronStorage) {
      return window.electronStorage.removeItem(key)
    }
    if (typeof window !== 'undefined') {
      localStorage.removeItem(key)
    }
  },
}

const useProfilesStore = create((set, get) => ({
  profiles: (() => {
    try {
      return JSON.parse(storage.getItem('iptv_profiles') || '[]')
    } catch {
      return []
    }
  })(),

  saveProfile: (name, server, username, password) => {
    const trimmedName = name.trim()
    const trimmedServer = server.trim()
    const trimmedUsername = username.trim()
    const trimmedPassword = password.trim()

    if (!trimmedName || !trimmedServer || !trimmedUsername || !trimmedPassword) {
      return
    }

    const profiles = get().profiles
    const existingIndex = profiles.findIndex(
      (p) => p.name.toLowerCase() === trimmedName.toLowerCase()
    )

    const newProfile = {
      id: existingIndex >= 0 ? profiles[existingIndex].id : Date.now().toString(),
      name: trimmedName,
      server: trimmedServer,
      username: trimmedUsername,
      password: trimmedPassword,
    }

    let updated
    if (existingIndex >= 0) {
      // Overwrite/update existing profile by name
      updated = [...profiles]
      updated[existingIndex] = newProfile
    } else {
      updated = [...profiles, newProfile]
    }

    storage.setItem('iptv_profiles', JSON.stringify(updated))
    set({ profiles: updated })
  },

  deleteProfile: (id) => {
    const updated = get().profiles.filter((p) => p.id !== id)
    storage.setItem('iptv_profiles', JSON.stringify(updated))
    set({ profiles: updated })
  },
}))

export default useProfilesStore
