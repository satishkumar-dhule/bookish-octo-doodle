export const healthHandler = (req, res) => {
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime: Math.floor(process.uptime())
  }

  // For HEAD requests, respond with headers only
  if (req.method === 'HEAD') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    return res.end()
  }

  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}
