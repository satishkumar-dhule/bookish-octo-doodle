import http from 'http'
import { healthHandler } from './routes/health.js'

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const HOST = process.env.HOST || '0.0.0.0'

const requestListener = (req, res) => {
  // Simple health endpoint
  if (req.url === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    return healthHandler(req, res)
  }

  // Fallback for unknown routes
  res.writeHead(404, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify({ status: 'not_found', path: req.url }))
}

const server = http.createServer(requestListener)

server.listen(PORT, HOST, () => {
  console.log(`Server listening on ${HOST}:${PORT}`)
})

export default server
