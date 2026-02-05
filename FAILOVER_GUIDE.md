# 🛡️ Failover & Graceful Error Handling Guide

Complete guide to the failover and graceful error handling system.

---

## 📋 Table of Contents

1. [Overview](#overview)
2. [Multi-Model Failover](#multi-model-failover)
3. [Circuit Breaker Pattern](#circuit-breaker-pattern)
4. [Graceful Degradation](#graceful-degradation)
5. [Partial Success Handling](#partial-success-handling)
6. [Emergency Shutdown](#emergency-shutdown)
7. [Configuration](#configuration)
8. [Monitoring](#monitoring)

---

## 🎯 Overview

The system now includes **comprehensive failover and graceful error handling**:

### Key Features

✅ **Multi-Model Failover** - Try alternative models if primary fails
✅ **Circuit Breaker** - Stop trying failed models temporarily
✅ **Graceful Degradation** - Fall back to simpler approaches
✅ **Partial Success** - Continue even if some agents fail
✅ **Emergency Shutdown** - Save state and exit cleanly
✅ **State Preservation** - Never lose progress

### Architecture

```
┌─────────────────────────────────────────────┐
│         Primary Model Attempt               │
│                   ↓                         │
│              Success? ───────────────→ ✅    │
│                   ↓ No                      │
│         Circuit Breaker Check               │
│                   ↓ Pass                    │
│         Try Fallback Model #2               │
│                   ↓                         │
│              Success? ───────────────→ ✅    │
│                   ↓ No                      │
│         Try Fallback Model #3               │
│                   ↓                         │
│              Success? ───────────────→ ✅    │
│                   ↓ No                      │
│         Graceful Degradation                │
│                   ↓                         │
│         Template/Manual Mode ───────→ ⚠️     │
└─────────────────────────────────────────────┘
```

---

## 🔄 Multi-Model Failover

### Model Hierarchy

The system tries multiple models in priority order:

#### Planner Agent

| Priority | Model | Speed | Quality | Use Case |
|----------|-------|-------|---------|----------|
| 1 | `opencode/gpt-5-nano` | ⚡⚡⚡ | ⭐⭐⭐ | Primary - fast |
| 2 | `opencode/mixtral-8x7b` | ⚡ | ⭐⭐⭐⭐⭐ | Fallback - better quality |
| 3 | `opencode/gpt-4-turbo` | ⚡⚡ | ⭐⭐⭐⭐ | Last resort |

#### Coder Agent

| Priority | Model | Speed | Quality | Use Case |
|----------|-------|-------|---------|----------|
| 1 | `opencode/codellama-7b` | ⚡⚡ | ⭐⭐⭐⭐ | Primary - specialized |
| 2 | `opencode/codellama-13b` | ⚡ | ⭐⭐⭐⭐⭐ | Fallback - more capable |
| 3 | `opencode/gpt-5-nano` | ⚡⚡⚡ | ⭐⭐⭐ | Last resort - general |

#### Reviewer Agent

| Priority | Model | Speed | Quality | Use Case |
|----------|-------|-------|---------|----------|
| 1 | `opencode/gpt-5-nano` | ⚡⚡⚡ | ⭐⭐⭐ | Primary - fast |
| 2 | `opencode/mixtral-8x7b` | ⚡ | ⭐⭐⭐⭐⭐ | Fallback - thorough |
| 3 | `opencode/gpt-4-turbo` | ⚡⚡ | ⭐⭐⭐⭐ | Last resort |

### How It Works

```javascript
// Automatic failover
const result = await failoverManager.executeWithFailover('coder', prompt);

if (result.success) {
  console.log(`✅ Used model: ${result.model}`);
  if (result.fallback) {
    console.log(`⚠️ Primary model failed, used fallback`);
  }
} else {
  console.error(`❌ All models failed`);
}
```

### Example Flow

```
🔄 Attempting coder with 3 fallback models
   Try #1: opencode/codellama-7b (fast, good)
   ❌ Failed: Timeout after 300000ms

   Try #2: opencode/codellama-13b (medium, very-good)
   ✅ Success with opencode/codellama-13b

Result: { success: true, model: "opencode/codellama-13b", fallback: true }
```

### Exponential Backoff

Between attempts, the system waits with exponential backoff:

```
Attempt 1 → Fail → Wait 1 second
Attempt 2 → Fail → Wait 2 seconds
Attempt 3 → Fail → Wait 4 seconds
```

---

## ⚡ Circuit Breaker Pattern

### What is it?

Circuit breaker prevents the system from repeatedly calling a failing model:

```
States:
  CLOSED ────→ OPEN ────→ HALF-OPEN ────→ CLOSED
   ↑             ↓           ↓              ↑
   │         (5 failures)  (test)       (success)
   │                                        │
   └────────────────────────────────────────┘
```

### States

#### 1. **CLOSED** (Normal Operation)
- All requests go through
- Failures are monitored
- If failures exceed threshold → OPEN

#### 2. **OPEN** (Circuit Tripped)
- All requests blocked immediately
- No calls to the model
- After timeout period → HALF-OPEN

#### 3. **HALF-OPEN** (Testing)
- Next request allowed through
- Success → CLOSED (fully recovered)
- Failure → OPEN (still broken)

### Configuration

```javascript
const circuitBreaker = new CircuitBreaker({
  failureThreshold: 5,      // Open after 5 failures
  resetTimeout: 60000,      // Try again after 1 minute
  monitoringPeriod: 300000  // Track failures in 5-min window
});
```

### Example

```
Time 0:00 - Request 1 → Fail (1/5)
Time 0:05 - Request 2 → Fail (2/5)
Time 0:10 - Request 3 → Fail (3/5)
Time 0:15 - Request 4 → Fail (4/5)
Time 0:20 - Request 5 → Fail (5/5)
Time 0:20 - Circuit breaker OPEN! 🚨

Time 0:20 - Request 6 → Blocked (circuit open)
Time 0:30 - Request 7 → Blocked (circuit open)
Time 1:20 - Request 8 → Allowed (testing) → HALF-OPEN
Time 1:20 - Request 8 → Success ✅ → CLOSED

Time 1:25 - Request 9 → Allowed (circuit closed)
```

### Status Monitoring

```javascript
const status = circuitBreaker.getStatus('opencode/codellama-7b');
console.log(status);
// "CLOSED" | "OPEN" | "MONITORING (3/5)"
```

---

## 🔻 Graceful Degradation

### Concept

When all AI models fail, the system falls back to simpler approaches:

```
AI-Powered → Template-Based → Manual Mode
```

### Degraded Planner

If AI planning fails, use a **template-based plan**:

```json
{
  "milestones": [
    {
      "name": "Analyze requirements",
      "description": "Review and understand requirements",
      "files": { "create": [], "modify": [], "delete": [] }
    },
    {
      "name": "Implement changes",
      "description": "Make necessary code changes",
      "files": { "create": [], "modify": [], "delete": [] }
    }
  ],
  "risks": ["AI planner unavailable - using template"],
  "confidence": 0.5
}
```

**Result**: Simple 2-milestone plan that works for most cases.

### Degraded Coder

If AI code generation fails, create **manual task file**:

```markdown
# Manual Implementation Required

## Task
[Original prompt]

## Reason
AI code generation unavailable. Please implement manually.

## Next Steps
1. Review requirements
2. Implement code
3. Run tests
4. Commit changes
```

**Result**: Human developer takes over, guided by clear instructions.

### Degraded Reviewer

If AI review fails, use **basic static checks**:

```json
{
  "approved": true,
  "code_quality": 70,
  "issues": [{
    "severity": "low",
    "issue": "AI reviewer unavailable - basic checks only",
    "suggestion": "Manual code review recommended"
  }],
  "next_steps": ["Manual review recommended"]
}
```

**Result**: Optimistic approval, with recommendation for manual review.

### Detection

```javascript
if (result.degraded) {
  console.warn(`⚠️ Running in degraded mode`);
  console.warn(`   Model used: ${result.model}`);
  console.warn(`   Quality may be lower than normal`);
}
```

---

## ✂️ Partial Success Handling

### Concept

In parallel agent execution, some agents may succeed while others fail:

```
Agent 1 (Files 1-2) → ✅ Success
Agent 2 (Files 3-4) → ❌ Failed
Agent 3 (Files 5-6) → ✅ Success

Decision: Continue with 2/3 successful results?
```

### Decision Logic

```javascript
const successRate = successCount / totalCount;

if (successRate >= 0.5) {
  // Accept partial results
  console.log(`✅ Accepting 50%+ success rate`);
  return { success: true, partial: true };
} else {
  // Reject - too many failures
  console.log(`❌ Success rate too low: ${successRate * 100}%`);
  return { success: false };
}
```

### Thresholds

| Success Rate | Action |
|--------------|--------|
| 100% | ✅ Perfect - continue normally |
| 67-99% | ⚠️ Good - continue with warning |
| 50-66% | ⚠️ Acceptable - continue with caution |
| < 50% | ❌ Too low - rollback and retry |

### Example Flow

```
Milestone: "Create API endpoints"
Files: [auth.js, users.js, posts.js]

Agent 1 (auth.js) → ✅ Success
Agent 2 (users.js) → ❌ Timeout
Agent 3 (posts.js) → ✅ Success

Success rate: 2/3 = 67%

Decision: ✅ Continue
Actions:
  1. Commit auth.js and posts.js
  2. Create issue for users.js
  3. Mark milestone as "partial success"
  4. Assign issue to user
  5. Continue to next milestone
```

### Configuration

```javascript
const failoverManager = new FailoverManager({
  partialSuccess: true,  // Enable partial success
  minSuccessRate: 0.5    // Minimum 50% success required
});
```

---

## 🚨 Emergency Shutdown

### Triggers

Emergency shutdown is triggered by:

1. **SIGTERM** - Graceful shutdown request
2. **SIGINT** - Ctrl+C pressed
3. **Uncaught Exception** - Unexpected error
4. **Unhandled Rejection** - Promise rejection
5. **Timeout** - Approaching time limit
6. **Resource Exhaustion** - Memory/disk critical

### Shutdown Process

```
1. Log shutdown reason
     ↓
2. Save current state to checkpoint
     ↓
3. Create recovery GitHub Issue
     ↓
4. Log recovery instructions
     ↓
5. Exit cleanly (code 0 or 1)
```

### State Preservation

On shutdown, the system saves:

```json
{
  "sessionId": "session-123",
  "ideaId": "002-feature",
  "phase": "implementing",
  "currentMilestone": 2,
  "emergency_shutdown": true,
  "shutdown_at": "2024-02-05T10:30:00Z",
  "interrupt_reason": "SIGTERM received",
  "can_resume": true
}
```

### Recovery

After shutdown, resume with:

```bash
export RESUME=true
export IDEA_ID=002-feature
node scripts/orchestrator-with-failover.js
```

### Example

```
⚠️ Received SIGTERM, initiating graceful shutdown...

🛑 [GRACEFUL SHUTDOWN] SIGTERM received
   💾 Saving state...
   ✅ State saved successfully
   📝 Resume with: RESUME=true npm start

Process exited with code 0
```

---

## ⚙️ Configuration

### Failover Manager Options

```javascript
const failoverManager = new FailoverManager({
  // Circuit breaker
  failureThreshold: 3,        // Open circuit after N failures
  resetTimeout: 60000,        // Try again after 1 minute
  monitoringPeriod: 300000,   // Track failures in 5-min window

  // Retry
  maxRetries: 3,              // Max retry attempts per model

  // Degradation
  gracefulDegradation: true,  // Enable fallback to templates
  partialSuccess: true        // Allow partial agent success
});
```

### Model Hierarchy Customization

Edit `scripts/utils/failover-manager.js`:

```javascript
const MODEL_HIERARCHY = {
  planner: [
    { model: 'your-primary-model', priority: 1 },
    { model: 'your-fallback-model', priority: 2 }
  ]
};
```

### Circuit Breaker Tuning

```javascript
// Aggressive (fail fast)
{
  failureThreshold: 2,
  resetTimeout: 30000
}

// Conservative (tolerate more)
{
  failureThreshold: 10,
  resetTimeout: 300000
}
```

---

## 📊 Monitoring

### Real-Time Status

```javascript
const status = failoverManager.getStatus();

console.log(status);
// {
//   planner: [
//     { model: "opencode/gpt-5-nano", priority: 1, circuitBreaker: "CLOSED" },
//     { model: "opencode/mixtral-8x7b", priority: 2, circuitBreaker: "OPEN" }
//   ],
//   coder: [...]
// }
```

### Circuit Breaker Dashboard

```
🔄 Failover Status:
   planner:
      1. opencode/gpt-5-nano [CLOSED]
      2. opencode/mixtral-8x7b [MONITORING (2/5)]
      3. opencode/gpt-4-turbo [CLOSED]
   coder:
      1. opencode/codellama-7b [OPEN]
      2. opencode/codellama-13b [CLOSED]
      3. opencode/gpt-5-nano [CLOSED]
```

### Metrics to Track

| Metric | Meaning | Good | Warning | Critical |
|--------|---------|------|---------|----------|
| Primary success rate | % requests using primary model | > 90% | 70-90% | < 70% |
| Fallback rate | % requests using fallback | < 10% | 10-30% | > 30% |
| Degradation rate | % requests degraded | < 5% | 5-15% | > 15% |
| Circuit breaker opens | # times circuit opened | 0 | 1-3 | > 3 |
| Partial success rate | % milestones with partial success | < 10% | 10-25% | > 25% |

### Logging

All failover events are logged:

```
[2024-02-05 10:15:23] 🔄 [FAILOVER] Attempting coder with 3 fallback models
[2024-02-05 10:15:23]    Try #1: opencode/codellama-7b (fast, good)
[2024-02-05 10:15:28]    ❌ Failed: Timeout after 5000ms
[2024-02-05 10:15:30]    Try #2: opencode/codellama-13b (medium, very-good)
[2024-02-05 10:15:35]    ✅ Success with opencode/codellama-13b
[2024-02-05 10:15:35] ⚠️ Circuit breaker MONITORING for opencode/codellama-7b (1/3)
```

---

## 🎯 Best Practices

### 1. **Monitor Circuit Breakers**

Check status regularly:

```bash
# In workflow, add monitoring step
- name: Check Failover Status
  run: |
    node -e "
      import { failoverManager } from './scripts/orchestrator-with-failover.js';
      console.log(failoverManager.getStatus());
    "
```

### 2. **Reset After Issues Resolved**

After fixing model issues:

```javascript
failoverManager.resetCircuitBreakers();
console.log('✅ All circuit breakers reset');
```

### 3. **Alert on Degradation**

```javascript
if (result.degraded) {
  await alertTeam(`System running in degraded mode: ${result.model}`);
}
```

### 4. **Test Failover Paths**

```bash
# Force primary model to fail (testing)
export FAIL_PRIMARY=true
node scripts/orchestrator-with-failover.js
```

### 5. **Tune Based on Metrics**

```javascript
// If fallback rate > 20%, increase primary model timeout
if (fallbackRate > 0.2) {
  primaryModelTimeout += 60000; // Add 1 minute
}
```

---

## 📈 Example Scenarios

### Scenario 1: Single Model Failure

```
Primary model timeout
  ↓
Try fallback model #2
  ↓
Success ✅
  ↓
Continue normally (with fallback flag)
```

**Impact**: Slight delay (2-3 seconds), otherwise transparent.

### Scenario 2: All Models Fail

```
Primary fails
  ↓
Fallback #1 fails
  ↓
Fallback #2 fails
  ↓
Graceful degradation to template
  ↓
Continue with lower quality ⚠️
```

**Impact**: Degraded functionality, user may need to intervene.

### Scenario 3: Partial Agent Success

```
3 parallel agents:
  Agent 1: Success ✅
  Agent 2: Fail ❌
  Agent 3: Success ✅

Success rate: 67%
  ↓
Accept partial results
  ↓
Create issue for failed agent
  ↓
Continue to next milestone
```

**Impact**: Some work done, issue created for remainder.

### Scenario 4: Emergency Shutdown

```
Memory usage > 95%
  ↓
Trigger emergency shutdown
  ↓
Save checkpoint
  ↓
Create recovery issue
  ↓
Exit gracefully
  ↓
Next run: Resume from checkpoint
```

**Impact**: No data loss, clean recovery.

---

## ✅ Summary

The failover system provides:

✅ **Multi-Model Failover** - 3 tiers of fallback models
✅ **Circuit Breaker** - Prevent repeated failures
✅ **Graceful Degradation** - Template-based fallbacks
✅ **Partial Success** - Continue with 50%+ success
✅ **Emergency Shutdown** - Clean exit with state preservation
✅ **Full Observability** - Comprehensive logging
✅ **Zero Data Loss** - Checkpoints everywhere

**Result**: System that never completely fails, always makes progress, and recovers gracefully from any error.

---

**See also:**
- [EDGE_CASES.md](EDGE_CASES.md) - All edge cases
- [LANGGRAPH_ARCHITECTURE.md](LANGGRAPH_ARCHITECTURE.md) - Technical details
- [SYSTEM_OVERVIEW.md](SYSTEM_OVERVIEW.md) - Complete system overview
