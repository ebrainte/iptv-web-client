import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { join, extname } from 'node:path'
import { fileURLToPath } from 'node:url'

const __dirname = fileURLToPath(new URL('.', import.meta.url))
const DIST = join(__dirname, 'dist')
const PORT = process.env.PORT || 80

// Proxy bandwidth stats
let bytesProxied = 0
let requestsProxied = 0

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

async function handleStream(req, res) {
  const url = new URL(req.url, 'http://localhost').searchParams.get('url')

  if (!url) {
    res.writeHead(400, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: 'Missing url parameter' }))
    return
  }

  try {
    const response = await fetch(url, { redirect: 'follow' })
    const contentType = response.headers.get('content-type') || ''

    // For HLS manifests, inspect and selectively rewrite segment URLs
    if (contentType.includes('mpegurl') || url.endsWith('.m3u8')) {
      const text = await response.text()
      const requestedOrigin = new URL(url).origin // original IPTV server (e.g. cf.cheaplytv.com)
      const resolvedBase = new URL(response.url)  // after redirects (e.g. 185.245.1.104)
      const resolvedOrigin = resolvedBase.origin
      const resolvedDir = resolvedBase.pathname.substring(0, resolvedBase.pathname.lastIndexOf('/') + 1)

      let hasProxiedSegments = false

      const rewritten = text.replace(
        /^(?!#)((?:https?:\/\/)?[^\s]+)$/gm,
        (match) => {
          let segmentUrl
          if (match.startsWith('http://') || match.startsWith('https://')) {
            segmentUrl = match
          } else if (match.startsWith('/')) {
            segmentUrl = resolvedOrigin + match
          } else {
            segmentUrl = resolvedOrigin + resolvedDir + match
          }

          // Check if segment is on the same origin as the redirect target (main IPTV backend)
          const segmentOrigin = new URL(segmentUrl).origin
          if (segmentOrigin === resolvedOrigin) {
            // Same backend — rewrite path to go through the original Cloudflare origin
            // so the browser fetches via cf domain (redirect is transparent, no CORS issue)
            const path = new URL(segmentUrl).pathname
            return requestedOrigin + path
          }

          // Different origin entirely (external CDN) — must proxy
          hasProxiedSegments = true
          return `/api/stream?url=${encodeURIComponent(segmentUrl)}`
        }
      )

      res.writeHead(200, {
        'Content-Type': 'application/vnd.apple.mpegurl',
        'Access-Control-Allow-Origin': '*',
        'X-Proxy-Mode': hasProxiedSegments ? 'proxied' : 'direct',
      })
      res.end(rewritten)
      return
    }

    // For segments being proxied through — track bandwidth and stream
    requestsProxied++
    const headers = {
      'Content-Type': contentType || 'application/octet-stream',
      'Access-Control-Allow-Origin': '*',
      'X-Proxy-Mode': 'proxied',
    }
    const contentLength = response.headers.get('content-length')
    if (contentLength) {
      headers['Content-Length'] = contentLength
      bytesProxied += parseInt(contentLength, 10)
    }

    res.writeHead(response.status, headers)

    if (response.body) {
      const reader = response.body.getReader()
      let bytesIfNoContentLength = 0
      const pump = async () => {
        while (true) {
          const { done, value } = await reader.read()
          if (done) {
            if (!contentLength) bytesProxied += bytesIfNoContentLength
            res.end()
            return
          }
          bytesIfNoContentLength += value.byteLength
          res.write(Buffer.from(value))
        }
      }
      pump().catch(() => res.end())
    } else {
      const buffer = await response.arrayBuffer()
      bytesProxied += buffer.byteLength
      res.end(Buffer.from(buffer))
    }
  } catch (err) {
    res.writeHead(500, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ error: err.message }))
  }
}

function handleProxyStats(req, res) {
  res.writeHead(200, {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
  })
  res.end(JSON.stringify({
    bytesProxied,
    requestsProxied,
    humanReadable: formatBytes(bytesProxied),
  }))
}

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
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
  if (req.url.startsWith('/api/proxy-stats')) {
    handleProxyStats(req, res)
  } else if (req.url.startsWith('/api/stream')) {
    handleStream(req, res)
  } else if (req.url.startsWith('/api/proxy')) {
    handleProxy(req, res)
  } else {
    serveStatic(req, res)
  }
})

server.listen(PORT, () => {
  console.log(`IPTV Web Client running on port ${PORT}`)
})
