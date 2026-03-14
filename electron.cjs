const { app, BrowserWindow } = require('electron')
const net = require('net')

let mainWindow = null
let server = null

function findFreePort() {
  return new Promise((resolve, reject) => {
    const srv = net.createServer()
    srv.listen(0, () => {
      const port = srv.address().port
      srv.close(() => resolve(port))
    })
    srv.on('error', reject)
  })
}

async function createWindow(port) {
  mainWindow = new BrowserWindow({
    width: 1280,
    height: 800,
    title: 'IPTV Client',
    webPreferences: {
      webSecurity: false,
      nodeIntegration: false,
      contextIsolation: true,
    },
  })

  mainWindow.loadURL(`http://127.0.0.1:${port}`)
  mainWindow.on('closed', () => { mainWindow = null })
}

app.whenReady().then(async () => {
  const port = await findFreePort()

  // Dynamic import of the ESM server module
  const { startServer } = await import('./server.js')
  server = await startServer(port)

  await createWindow(port)
})

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', () => {
  if (mainWindow === null && server) {
    const addr = server.address()
    if (addr) createWindow(addr.port)
  }
})

app.on('before-quit', () => {
  if (server) {
    server.close()
    server = null
  }
})
