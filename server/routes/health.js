// Health route: publicly accessible health check
// Returns status, timestamp, version, uptime without any DB calls.

import express from 'express';
import { readFile } from 'fs/promises';

let version = 'unknown';

// Load version from the root package.json at startup. If unavailable, fall back to 'unknown'.
try {
  const pkgPath = new URL('../../package.json', import.meta.url);
  const data = await readFile(pkgPath, 'utf8');
  const pkg = JSON.parse(data);
  version = pkg.version ?? version;
} catch (err) {
  // Ignore errors; version will remain 'unknown'
}

const router = express.Router();

// GET /health
router.get('/', async (req, res) => {
  try {
    const timestamp = new Date().toISOString();
    const uptime = Math.floor(process.uptime()); // integer seconds
    res.status(200).json({
      status: 'ok',
      timestamp,
      version,
      uptime
    });
  } catch (e) {
    // Fallback error response to keep health endpoint resilient
    res.status(500).json({ status: 'error', timestamp: new Date().toISOString() });
  }
});

export default router;
