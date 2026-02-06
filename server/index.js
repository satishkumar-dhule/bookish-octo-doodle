import http from 'http'
import { healthHandler } from './routes/health.js'
import pkg from '../package.json' assert { type: 'json' }

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000
const HOST = process.env.HOST || '0.0.0.0'

const requestListener = (req, res) => {
  // Simple health endpoint
  if (req.url === '/health' && (req.method === 'GET' || req.method === 'HEAD')) {
    return healthHandler(req, res)
  }

  // Milestone 2: status endpoint
  if (req.url === '/status' && req.method === 'GET') {
    const uptime = Math.floor(process.uptime())
    const payload = {
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptime
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(payload))
  }

  // Milestone 3: root status endpoint
  if (req.url === '/' && req.method === 'GET') {
    const payload = {
      status: 'ok',
      message: 'Autonomous Dev System',
      timestamp: new Date().toISOString(),
      host: HOST,
      port: PORT
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(payload))
  }

  // Milestone 3: version endpoint
  if (req.url === '/version' && req.method === 'GET') {
    const payload = {
      name: pkg?.name || 'autonomous-dev-system',
      version: pkg?.version || '0.0.0',
      timestamp: new Date().toISOString()
    }
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end(JSON.stringify(payload))
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
