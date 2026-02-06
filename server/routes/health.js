import express from 'express';
import fs from 'fs';

const router = express.Router();

let cachedVersion = null;

function getVersion() {
  if (cachedVersion) return cachedVersion;

  const envVersion = process.env.HEALTH_VERSION;
  if (envVersion && envVersion.trim()) {
    cachedVersion = envVersion.trim();
    return cachedVersion;
  }

  // Fallback to package.json version, then to a safe default
  try {
    const pkgPath = new URL('../../package.json', import.meta.url).pathname;
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf8'));
    cachedVersion = typeof pkg?.version === 'string' ? pkg.version : '1.0';
  } catch {
    cachedVersion = '1.0';
  }

  return cachedVersion;
}

// Health endpoint: GET / -> returns minimal payload
router.get('/', (req, res) => {
  // No DB I/O here; keep response lightweight and deterministic
  const payload = {
    status: 'OK',
    timestamp: new Date().toISOString(),
    version: getVersion(),
    uptime: Math.floor(process.uptime())
  };

  res.setHeader('Content-Type', 'application/json');
  res.status(200).json(payload);
});

export default router;
