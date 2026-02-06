const express = require('express');
const router = express.Router();

/**
 * Health route: lightweight, deterministic, no I/O.
 * Response payload:
 *  - status: 'ok'
 *  - timestamp: ISO 8601 string
 *  - version: derived from HEALTH_VERSION env var or package.json
 *  - uptime: integer seconds since process start
 */

// Resolve version with priority: HEALTH_VERSION env var, then package.json, then '1.0'
function resolveVersion() {
  const envVer = process.env.HEALTH_VERSION;
  if (envVer && envVer.toString().trim()) {
    return envVer.toString().trim();
  }
  try {
    // package.json is at project root; this file is at server/routes/health.js
    const pkg = require('../../package.json');
    if (pkg && typeof pkg.version === 'string' && pkg.version.trim()) {
      return pkg.version.trim();
    }
  } catch (e) {
    // fall through to default
  }
  return '1.0';
}

// GET / - health check endpoint
router.get('/', (req, res) => {
  try {
    // Fast path: few computations, no I/O
    const version = resolveVersion();
    const uptime = Math.floor(process.uptime()); // seconds as integer
    const timestamp = new Date().toISOString();

    const payload = {
      status: 'ok',
      timestamp,
      version,
      uptime
    };

    res.set('Content-Type', 'application/json; charset=utf-8');
    res.status(200).json(payload);
  } catch (err) {
    // Unexpected error: report minimal health signal
    res.status(500).json({ status: 'error', timestamp: new Date().toISOString(), error: 'Health check failed' });
  }
});

module.exports = router;
