// Simple, self-contained health endpoint tests for Milestone 3.
// Runs with Node (type: module) in this repo and does not require external test runners.
// It validates the health endpoint handler without starting the HTTP server.

import { healthHandler } from '../routes/health.js'

// Create a minimal mock request/response to exercise the handler directly
const makeReq = (method) => ({ method })

const createResMock = () => {
  let status = 0
  let body = ''
  return {
    get statusCode() { return status },
    set statusCode(v) { status = v },
    get body() { return body },
    writeHead: (code /*, headers*/) => { status = code },
    end: (chunk) => { if (chunk) body += chunk }
  }
}

const assert = (cond, msg) => {
  if (!cond) throw new Error(msg || 'Assertion failed')
}

const testGET = () => {
  const req = makeReq('GET')
  const res = createResMock()
  healthHandler(req, res)
  // Expect 200 and JSON body with status ok, timestamp string, uptime number
  assert(res.statusCode === 200, 'GET /health should respond with 200')
  const payload = JSON.parse(res.body)
  assert(payload && payload.status === 'ok', 'payload.status should be ok')
  assert(typeof payload.timestamp === 'string', 'payload.timestamp should be string')
  assert(typeof payload.uptime === 'number', 'payload.uptime should be number')
}

const testHEAD = () => {
  const req = makeReq('HEAD')
  const res = createResMock()
  healthHandler(req, res)
  // For HEAD, there should be headers and no body
  assert(res.statusCode === 200, 'HEAD /health should respond with 200')
  assert(res.body === '', 'HEAD response should have no body')
}

const run = async () => {
  try {
    await Promise.resolve(testGET())
    console.log('[OK] health GET')
    await Promise.resolve(testHEAD())
    console.log('[OK] health HEAD')
    process.exit(0)
  } catch (err) {
    console.error('[FAILED] health test:', err)
    process.exit(1)
  }
}

run()
