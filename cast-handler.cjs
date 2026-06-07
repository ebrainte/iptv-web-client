const { Client, DefaultMediaReceiver } = require('castv2-client')

let bonjour = null
let browser = null
let castClient = null
let castPlayer = null
let discoveredDevices = []
let mainWindowRef = null

function init(mainWindow) {
  mainWindowRef = mainWindow
}

function startDiscovery() {
  const { Bonjour } = require('bonjour-service')

  if (browser) {
    stopDiscovery()
  }

  discoveredDevices = []
  bonjour = new Bonjour()

  browser = bonjour.find({ type: 'googlecast' }, (service) => {
    // Prefer IPv4 addresses over IPv6
    const ipv4 = service.addresses?.find((a) => /^\d+\.\d+\.\d+\.\d+$/.test(a))
    const host = ipv4 || service.addresses?.[0] || service.host

    const device = {
      name: (service.txt?.fn || service.name || host).replace(/\._googlecast.*/, ''),
      host,
      port: service.port || 8009,
      id: service.txt?.id || service.name || host,
      model: service.txt?.md || 'Chromecast',
    }

    if (!discoveredDevices.find((d) => d.host === device.host)) {
      discoveredDevices.push(device)
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('cast:device-found', device)
      }
    }
  })

  return { success: true }
}

function stopDiscovery() {
  if (browser) {
    try { browser.stop() } catch {}
    browser = null
  }
  if (bonjour) {
    try { bonjour.destroy() } catch {}
    bonjour = null
  }
  discoveredDevices = []
}

function connectToDevice(host, port) {
  return new Promise((resolve, reject) => {
    if (castClient) {
      try { castClient.close() } catch {}
      castClient = null
      castPlayer = null
    }

    const client = new Client()
    let settled = false

    const timeout = setTimeout(() => {
      if (!settled) {
        settled = true
        try { client.close() } catch {}
        reject(new Error('Connection timed out'))
      }
    }, 10000)

    client.on('error', (err) => {
      console.error('[Cast] Client error:', err.message)
      clearTimeout(timeout)
      if (mainWindowRef && !mainWindowRef.isDestroyed()) {
        mainWindowRef.webContents.send('cast:error', err.message)
      }
      try { client.close() } catch {}
      castClient = null
      castPlayer = null
      if (!settled) {
        settled = true
        reject(err)
      }
    })

    client.connect(host, () => {
      client.launch(DefaultMediaReceiver, (err, player) => {
        clearTimeout(timeout)
        if (settled) return

        if (err) {
          settled = true
          try { client.close() } catch {}
          reject(err)
          return
        }

        castClient = client
        castPlayer = player

        player.on('status', (status) => {
          if (mainWindowRef && !mainWindowRef.isDestroyed()) {
            mainWindowRef.webContents.send('cast:status', {
              playerState: status.playerState,
              currentTime: status.currentTime,
              idleReason: status.idleReason,
            })
          }
        })

        settled = true
        resolve({ success: true })
      })
    })
  })
}

function loadMedia(url, contentType, streamType) {
  return new Promise((resolve, reject) => {
    if (!castPlayer) {
      reject(new Error('Not connected to a cast device'))
      return
    }

    const media = {
      contentId: url,
      contentType: contentType || 'application/x-mpegurl',
      streamType: streamType || 'LIVE',
    }

    console.log('[Cast] Loading media:', media.contentId, media.contentType, media.streamType)

    castPlayer.load(media, { autoplay: true }, (err, status) => {
      if (err) {
        reject(err)
        return
      }
      resolve({ success: true, playerState: status?.playerState })
    })
  })
}

function stopCasting() {
  if (castPlayer) {
    try { castPlayer.stop() } catch {}
    castPlayer = null
  }
  if (castClient) {
    try { castClient.close() } catch {}
    castClient = null
  }
  return { success: true }
}

function getDevices() {
  return discoveredDevices
}

function cleanup() {
  stopCasting()
  stopDiscovery()
}

module.exports = {
  init,
  startDiscovery,
  stopDiscovery,
  connectToDevice,
  loadMedia,
  stopCasting,
  getDevices,
  cleanup,
}
