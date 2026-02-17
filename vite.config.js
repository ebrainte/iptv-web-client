import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

// Dev-mode proxy bandwidth stats
let bytesProxied = 0
let requestsProxied = 0

function formatBytes(bytes) {
  if (bytes === 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB', 'TB']
  const i = Math.floor(Math.log(bytes) / Math.log(1024))
  return (bytes / Math.pow(1024, i)).toFixed(2) + ' ' + units[i]
}

function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
      // Proxy stats
      server.middlewares.use('/api/proxy-stats', (req, res) => {
        res.writeHead(200, {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        })
        res.end(JSON.stringify({
          bytesProxied,
          requestsProxied,
          humanReadable: formatBytes(bytesProxied),
        }))
      })

      // Stream proxy for HLS manifests + CORS-blocked segments
      server.middlewares.use('/api/stream', async (req, res) => {
        const parsed = new URL(req.url, 'http://localhost')
        const targetUrl = parsed.searchParams.get('url')

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing url parameter' }))
          return
        }

        try {
          const response = await fetch(targetUrl, { redirect: 'follow' })
          const contentType = response.headers.get('content-type') || ''

          if (contentType.includes('mpegurl') || targetUrl.endsWith('.m3u8')) {
            const text = await response.text()
            const base = new URL(response.url)
            const origin = base.origin
            const dir = base.pathname.substring(0, base.pathname.lastIndexOf('/') + 1)

            let hasProxiedSegments = false

            const rewritten = text.replace(
              /^(?!#)((?:https?:\/\/)?[^\s]+)$/gm,
              (match) => {
                let segmentUrl
                if (match.startsWith('http://') || match.startsWith('https://')) {
                  segmentUrl = match
                } else if (match.startsWith('/')) {
                  segmentUrl = origin + match
                } else {
                  segmentUrl = origin + dir + match
                }

                const segmentOrigin = new URL(segmentUrl).origin
                if (segmentOrigin !== origin) {
                  hasProxiedSegments = true
                  return `/api/stream?url=${encodeURIComponent(segmentUrl)}`
                }
                return segmentUrl
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

          // Proxied segment — track bandwidth
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
      })

      // API metadata proxy
      server.middlewares.use('/api/proxy', async (req, res) => {
        const parsed = new URL(req.url, 'http://localhost')
        const targetUrl = parsed.searchParams.get('url')

        if (!targetUrl) {
          res.writeHead(400, { 'Content-Type': 'application/json' })
          res.end(JSON.stringify({ error: 'Missing url parameter' }))
          return
        }

        try {
          const response = await fetch(targetUrl)
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
      })
    },
  }
}

export default defineConfig({
  plugins: [react(), tailwindcss(), apiProxyPlugin()],
})
