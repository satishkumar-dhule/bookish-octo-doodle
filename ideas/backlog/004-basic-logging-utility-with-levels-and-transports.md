# Basic Logging Utility with Levels and Transports

## Description
Build a lightweight logging utility that supports multiple log levels (debug, info, warn, error), structured formatting, and pluggable transports. The logger should provide a simple API (debug/info/warn/error and a generic log call) and default to console output with timestamps. It should be easy to extend with additional transports (e.g., file, remote sink) without changing call sites.

## Context
Applications rely on consistent, observable logs for debugging, monitoring, and auditing. A centralized, configurable logger reduces boilerplate and ensures uniform message formats across modules. This utility should be framework-agnostic and easily testable.

## Acceptance Criteria
- [ ] Supports log levels (debug, info, warn, error) with threshold-based filtering.
- [ ] Formats messages with ISO8601 timestamp, level label, and message; supports optional metadata (e.g., module, request id).
- [ ] Implements a Transport abstraction with a ConsoleTransport by default; supports adding additional transports (e.g., FileTransport) via a simple API.
- [ ] Provides ergonomic API: logger.debug(...), logger.info(...), logger.warn(...), logger.error(...), and logger.log(level, ...).
- [ ] Includes basic tests or demonstration coverage verifying level gating and formatting.

## Technical Notes
Design a small Logger module/class. Define a Level enum {DEBUG, INFO, WARN, ERROR} and a Transport interface with a write(formattedMessage) method. Implement ConsoleTransport that writes to stdout/stderr with color/formatting optional. Allow configuring minimum level and toggling timestamps. Expose a function to add transports, or a singleton instance for global use. Ensure messages can carry optional metadata as a plain object that gets serialized into the log line. Keep dependencies minimal; avoid blocking I/O on the hot path.

## Priority
High

## Estimated Complexity
Medium

## Labels
feature, documentation, testing

---

**Created:** 2026-02-06
**ID:** 004
