import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

function apiProxyPlugin() {
  return {
    name: 'api-proxy',
    configureServer(server) {
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
