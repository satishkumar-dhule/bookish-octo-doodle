# Error Handling Utilities: Centralized Helpers

## Description
Build a centralized error handling library that standardizes error creation, wrapping, normalization, and responses across the app stack. It should provide a reusable ApiError structure, helper utilities to wrap and normalize errors, a mapping to HTTP status codes, a sanitized error response formatter, and a logging adapter with redaction.

## Context
Currently errors are scattered across modules with inconsistent shapes, which makes debugging harder, reduces observability, and risks leaking sensitive data. Centralizing error handling improves consistency, testability, and security, and lowers duplication when adding new services or APIs.

## Acceptance Criteria
- [ ] A central ApiError type with fields code, message, details optional, and cause optional is defined and used by new utilities
- [ ] wrapError and normalizeError utilities preserve original stack traces and produce a standard error shape
- [ ] HTTP status mapping and client safe error response formatter produce consistent JSON error bodies without leaking sensitive data
- [ ] A logging adapter standardizes error logs and redacts sensitive fields, with integration hooks for common frameworks
- [ ] Unit tests cover core utilities and error response formatting, achieving acceptable coverage

## Technical Notes
Organize under errors/ with an ApiError type. Implement: interface ApiError { code: string; message: string; details?: any; cause?: Error | string; stack?: string } ; class ExtendedError extends Error { code; details; cause } ; functions: wrapError(err, code, message, details?), normalizeError(err): ApiError, toHttpStatus(err): number, formatErrorResponse(err, options?): ApiErrorResponse; logger: logError(err, context) that redacts sensitive fields; middleware: errorHandler for Express and Koa; provide tests and CI coverage. Ensure no stack traces leaked in production; enable verbose traces in dev. Consider integration with Express, NestJS, GraphQL, and serverless runtimes.

## Priority
High

## Estimated Complexity
Medium

## Labels
feature, backend, error-handling

---

**Created:** 2026-02-06
**ID:** 005
