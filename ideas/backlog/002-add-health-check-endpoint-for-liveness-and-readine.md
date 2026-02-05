# Add Health Check Endpoint for Liveness and Readiness

## Description
Implement a lightweight health check endpoint that exposes liveness and readiness information to orchestrators and monitoring systems. The endpoint should be fast, deterministic, and surface the status of core dependencies without performing heavy operations.

## Context
In production, systems rely on health endpoints to determine if a service can receive traffic and to guide automated restarts or rollouts. A well-defined health check improves reliability, observability, and automated recovery, reducing incident duration and improving deployment safety.

## Acceptance Criteria
- [ ] Endpoints exist: GET /health (liveness) and GET /health/readiness (readiness) or a unified /health payload that includes both.
- [ ] Healthy responses return HTTP 200 with a JSON payload containing overall status and per-component statuses; unhealthy responses return HTTP 503 or appropriate 5xx codes.
- [ ] Readiness checks verify essential dependencies (e.g., database, cache) via lightweight probes and do not perform long-running operations.
- [ ] Payload includes: status, timestamp, and component health details; tests validate presence and expected values.
- [ ] Automated tests cover both success and failure scenarios, and CI gates health checks in deployments.

## Technical Notes
Integrate with existing routing/middleware. Return a structured JSON like { status, timestamp, details: { db: 'UP'|'DOWN', cache: 'UP'|'DOWN', externalService: 'UP'|'DOWN' } }. Use 200 for healthy, 503 for unhealthy. Configure orchestrator probes (e.g., Kubernetes) to target /health for liveness and /health/readiness for readiness. Ensure no heavy DB queries or IO during checks; isolate checks to lightweight heartbeats or ping operations. Add unit tests for each component and an integration test simulating a failed dependency. Document API contract in API docs.

## Priority
Critical

## Estimated Complexity
Low

## Labels
feature, observability, documentation, testing

---

**Created:** 2026-02-05
**ID:** 002
