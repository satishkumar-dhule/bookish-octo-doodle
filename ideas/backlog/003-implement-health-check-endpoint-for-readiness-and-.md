# Implement Health Check Endpoint for Readiness and Liveness

## Description
Add a lightweight health check suite that exposes three endpoints: GET /healthz, GET /healthz/live, and GET /healthz/ready. Each endpoint returns a small JSON payload describing the service health. The readiness endpoint should perform minimal dependency checks (e.g., database connectivity, cache or message broker availability) with short timeouts and return 200 when ready or 503 when not. The liveness endpoint should confirm the process is running without performing heavy checks. The endpoints should be wired for deployment tooling (e.g., Kubernetes) and include tests and documentation updates.

## Context
This endpoint provides visibility into the service health for orchestrators and monitoring systems. It supports Kubernetes readiness and liveness probes, allows quick detection of outages, and helps with safe rolling deployments by preventing traffic to unhealthy instances.

## Acceptance Criteria
- [ ] Exposed endpoints: /healthz, /healthz/live, and /healthz/ready with appropriate HTTP status codes.
- [ ] Readiness endpoint returns 200 when dependencies are reachable and 503 when one or more are unavailable.
- [ ] Payload includes at least: status, timestamp, version, and a dependencies map (e.g., database, cache).
- [ ] Liveness endpoint remains responsive with minimal overhead, returning 200 when the app process is up.
- [ ] Automated tests cover healthy and unhealthy scenarios for readiness and ensure responses are fast (sub-second) and deterministic.

## Technical Notes
Implement a HealthChecker service that aggregates lightweight checks. Prefer framework-agnostic design but wire into the existing app via dependency injection or a simple module. Use short timeouts (e.g., 200-500ms) for readiness checks to avoid delays during deployments. Return a compact JSON payload and avoid exposing sensitive internal details. Document the endpoints in the project README and align Kubernetes probes to /healthz/ready (for readiness) and /healthz/live (for liveness). Add unit tests that mock dependencies to simulate healthy and failing states.

## Priority
High

## Estimated Complexity
Medium

## Labels
feature, testing

---

**Created:** 2026-02-05
**ID:** 003
