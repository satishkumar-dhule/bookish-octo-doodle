// Health check endpoint for scaffolding milestone
export const healthHandler = (req, res) => {
  const uptime = Math.floor(process.uptime())
  const payload = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    uptime
  }
  res.writeHead(200, { 'Content-Type': 'application/json' })
  res.end(JSON.stringify(payload))
}

