const { contextBridge } = require('electron')
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
