# Add Health Check Endpoint

## Description
Add a `/health` endpoint that returns system status

## Context
For monitoring and load balancer health checks

## Acceptance Criteria
- [ ] GET /health endpoint returns 200 OK
- [ ] Response includes: status, timestamp, version, uptime
- [ ] Endpoint is unauthenticated
- [ ] Response time < 50ms

## Technical Notes
- Return JSON: `{ "status": "ok", "timestamp": "...", "version": "1.0", "uptime": 12345 }`
- Add to main router
- No database calls (fast response)

## Files Involved
- `server/routes/health.js` (new)
- `server/index.js` (update)

## Priority
Medium

## Complexity
Low
