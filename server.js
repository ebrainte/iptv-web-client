import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = process.env.PORT || 80

const MIME = {
  '.html': 'text/html',
  '.js': 'application/javascript',
  '.css': 'text/css',
  '.json': 'application/json',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
  '.ttf': 'font/ttf',
  '.webp': 'image/webp',
  '.webm': 'video/webm',
  '.mp4': 'video/mp4',
  '.m3u8': 'application/vnd.apple.mpegurl',
  '.ts': 'video/mp2t',
}

async function handleProxy(req, res) {
  const url = new URL(req.url, 'http://localhost').searchParams.get('url')

  if (!url) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  try {
    const response = await fetch(url)
    const data = await response.text()
    res.writeHead(response.status, {
      'Content-Type': response.headers.get('content-type') || 'application/json',
      'Access-Control-Allow-Origin': '*',
    })
    res.end(data)
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}

async function serveStatic(req, res) {
  const pathname = new URL(req.url, 'http://localhost').pathname
  const filePath = join(DIST, pathname === '/' ? 'index.html' : pathname)

  try {
    const stats = await stat(filePath)
    if (!stats.isFile()) throw new Error('Not a file')

    const data = await readFile(filePath)
    const ext = extname(filePath)
    res.writeHead(200, {
      'Content-Type': MIME[ext] || 'application/octet-stream',
      'Cache-Control': ext === '.html' ? 'no-cache' : 'public, max-age=31536000, immutable',
    })
    res.end(data)
  } catch {
    // SPA fallback — serve index.html for client-side routing
    const index = await readFile(join(DIST, 'index.html'))
    res.writeHead(200, { 'Content-Type': 'text/html', 'Cache-Control': 'no-cache' })
    res.end(index)
  }
}

const server = createServer((req, res) => {
  if (req.url.startsWith('/api/proxy')) {
    handleProxy(req, res)
  } else {
    serveStatic(req, res)
  }
})

server.listen(PORT, () => {
  console.log(`IPTV Web Client running on port ${PORT}`)
})
