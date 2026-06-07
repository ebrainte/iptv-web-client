const { contextBridge, ipcRenderer } = require('electron')
const path = require('path')
const fs = require('fs')

// File-based storage in Electron's userData directory.
// Completely independent of Chromium's localStorage — guaranteed to persist.
const storePath = path.join(
  process.env.APPDATA ||
    (process.platform === 'darwin'
      ? path.join(require('os').homedir(), 'Library', 'Application Support')
      : path.join(require('os').homedir(), '.config')),
  'IPTV Client',
  'app-storage.json'
)

function readStore() {
  try {
    return JSON.parse(fs.readFileSync(storePath, 'utf-8'))
  } catch {
    return {}
  }
}

function writeStore(data) {
  const dir = path.dirname(storePath)
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  fs.writeFileSync(storePath, JSON.stringify(data, null, 2), 'utf-8')
}

contextBridge.exposeInMainWorld('electronStorage', {
  getItem(key) {
    const store = readStore()
    return store[key] !== undefined ? store[key] : null
  },
  setItem(key, value) {
    const store = readStore()
    store[key] = value
    writeStore(store)
  },
  removeItem(key) {
    const store = readStore()
    delete store[key]
    writeStore(store)
  },
})

// ── Chromecast API ───────────────────────────────────────────────────
contextBridge.exposeInMainWorld('cast', {
  isAvailable: true,
  startDiscovery: () => ipcRenderer.invoke('cast:discover-start'),
  stopDiscovery: () => ipcRenderer.invoke('cast:discover-stop'),
  getDevices: () => ipcRenderer.invoke('cast:get-devices'),
  connect: (host, port) => ipcRenderer.invoke('cast:connect', host, port),
  loadMedia: (url, contentType, streamType) =>
    ipcRenderer.invoke('cast:load-media', url, contentType, streamType),
  stop: () => ipcRenderer.invoke('cast:stop'),
  onDeviceFound: (callback) => {
    ipcRenderer.on('cast:device-found', (_event, device) => callback(device))
  },
  onStatus: (callback) => {
    ipcRenderer.on('cast:status', (_event, status) => callback(status))
  },
  onError: (callback) => {
    ipcRenderer.on('cast:error', (_event, error) => callback(error))
  },
  removeAllListeners: () => {
    ipcRenderer.removeAllListeners('cast:device-found')
    ipcRenderer.removeAllListeners('cast:status')
    ipcRenderer.removeAllListeners('cast:error')
  },
})


