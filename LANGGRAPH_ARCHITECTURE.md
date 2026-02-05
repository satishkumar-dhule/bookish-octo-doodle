# 🔷 LangGraph Architecture

## Overview

The autonomous development system uses **LangGraph** for sophisticated multi-agent orchestration with state management, conditional routing, and comprehensive error handling.

## State Graph Visualization

```mermaid
graph TD
    START([START]) --> load_state[Load State]

    load_state --> route_load{Route}
    route_load -->|New Session| analyze_idea[Analyze Idea]
    route_load -->|Resume Planning| plan[Create Plan]
    route_load -->|Resume Implementation| parallel_impl[Parallel Implementation]
    route_load -->|Resume Review| review[Review Code]
    route_load -->|Resume Test| test[Run Tests]
    route_load -->|Blocked| human[Human Clarification]
    route_load -->|Completed| END([END])

    analyze_idea --> route_analyze{Route}
    route_analyze -->|Retry| analyze_idea
    route_analyze -->|Needs Input| human
    route_analyze -->|Go to Planning| plan
    route_analyze -->|Skip to Implementation| parallel_impl

    plan --> route_plan{Route}
    route_plan -->|Retry| plan
    route_plan -->|Low Confidence| human
    route_plan -->|Approved| parallel_impl

    parallel_impl --> route_impl{Route}
    route_impl -->|Next Milestone| parallel_impl
    route_impl -->|Conflicts| human
    route_impl -->|Error| handle_error[Handle Error]
    route_impl -->|All Done| review

    review --> route_review{Route}
    route_review -->|Issues Found| human
    route_review -->|Approved| test

    test --> route_test{Route}
    route_test -->|Failed| human
    route_test -->|Passed| END

    handle_error --> route_error{Route}
    route_error -->|Retryable| parallel_impl
    route_error -->|Fatal| human

    human --> END

    style START fill:#90EE90
    style END fill:#FFB6C1
    style parallel_impl fill:#87CEEB
    style handle_error fill:#FFD700
    style human fill:#FFA500
```

## State Schema

```javascript
{
  // Session metadata
  sessionId: "session-1707140400000",
  ideaId: "001-feature",
  ideaContent: "Add health check endpoint...",
  startedAt: "2024-02-05T10:00:00Z",

  // Current phase
  phase: "implementing", // initializing | planning | implementing | reviewing | testing | completed | failed | blocked

  // Planning state
  plan: {
    milestones: [
      {
        name: "Create health endpoint",
        description: "...",
        files: {
          create: ["server/routes/health.js"],
          modify: ["server/index.js"],
          delete: []
        },
        dependencies: [],
        tests: ["server/routes/health.test.js"],
        rollback: "rm server/routes/health.js"
      }
    ],
    risks: ["No existing router structure"],
    success_criteria: ["Endpoint returns 200", "Response time < 50ms"],
    estimated_time_minutes: 15,
    confidence: 0.9
  },

  // Implementation state
  currentMilestone: 1,
  totalMilestones: 3,
  milestones: [
    {
      name: "Milestone 1",
      completed_at: "2024-02-05T10:15:00Z",
      commit: "abc123def"
    }
  ],

  // Agent results
  agentOutputs: {
    analysis: { ... },
    plan: { ... }
  },
  parallelResults: [
    { agentId: 0, success: true, result: { ... } },
    { agentId: 1, success: true, result: { ... } }
  ],

  // Code state
  modifiedFiles: ["server/routes/health.js", "server/index.js"],
  conflicts: [],

  // Testing state
  testResults: { passed: true, output: "..." },
  testPassed: true,

  // Review state
  reviewIssues: [],
  codeQuality: 85,

  // Error handling
  errors: [],
  retryCount: 0,
  maxRetries: 3,
  lastError: null,

  // Human interaction
  needsUserInput: false,
  userQuestion: null,
  blockingIssue: null,

  // Progress tracking
  progress: 65,
  status: "success", // pending | success | error | waiting_user

  // Checkpointing
  lastCheckpoint: "2024-02-05T10:15:00Z",
  rollbackPoint: {
    commit: "abc123",
    branch: "dev"
  },

  // Resource management
  executionTime: 900000, // ms
  timeoutAt: 1707141600000,
  resourceUsage: {
    memory: 256, // MB
    cpu: 1200 // ms
  }
}
```

## Node Descriptions

### 1. **load_state**
- **Purpose**: Initialize or resume session
- **Inputs**: `sessionId`, `RESUME` env var
- **Outputs**: Full state (new or loaded from checkpoint)
- **Edge Cases**: Corrupted state file → repair or start fresh

### 2. **analyze_idea**
- **Purpose**: Understand requirements and estimate complexity
- **Agent**: Planner (GPT-5-nano)
- **Outputs**: Complexity, confidence, questions, approach
- **Timeout**: 60 seconds
- **Retries**: Up to 3 with exponential backoff
- **Edge Cases**: Low confidence → ask user clarification

### 3. **plan**
- **Purpose**: Create detailed implementation plan
- **Agent**: Planner (GPT-5-nano)
- **Outputs**: Milestones, files, dependencies, success criteria
- **Timeout**: 120 seconds
- **Retries**: Up to 3
- **Edge Cases**:
  - No milestones → retry
  - Confidence < 0.8 → human review
  - Risky operations → flag in plan

### 4. **parallel_implementation**
- **Purpose**: Execute one milestone with parallel agents
- **Agents**: 3x Coder (CodeLlama-7b)
- **Parallel**: Yes, splits files across agents
- **Timeout**: 300 seconds per agent
- **Rollback**: Creates rollback point before changes
- **Edge Cases**:
  - Agent failures → rollback and retry
  - Merge conflicts → detect and escalate
  - Circular dependencies → block commit
  - Invalid code → reject and regenerate

### 5. **review_code**
- **Purpose**: Check code quality and security
- **Agent**: Reviewer (GPT-5-nano)
- **Outputs**: Approval, quality score, issues list
- **Timeout**: 180 seconds
- **Edge Cases**:
  - Critical issues (high severity) → block and escalate
  - Medium issues → warn but proceed
  - Review failure → proceed to testing anyway

### 6. **test**
- **Purpose**: Run automated tests
- **Method**: `npm test`
- **Timeout**: 120 seconds
- **Edge Cases**:
  - No tests → skip with warning
  - Tests fail → analyze failure type
    - Code error → rollback
    - Test needs update → escalate
  - Test timeout → fail gracefully

### 7. **handle_error**
- **Purpose**: Classify error and determine recovery strategy
- **Classification**: Network, timeout, rate limit, memory, disk, permission, conflict, dependency, syntax, validation, git, agent
- **Strategies**:
  - `retry_with_backoff`
  - `retry_with_increased_timeout`
  - `retry_with_delay`
  - `reduce_concurrency`
  - `cleanup_temp_files`
  - `request_user_action`
  - `rollback_and_retry`
  - `install_dependencies`
  - `regenerate_code`
  - `reset_git_state`
  - `escalate_to_user`

### 8. **human_clarification**
- **Purpose**: Create GitHub Issue and wait for user
- **Triggers**:
  - Low plan confidence
  - Unclear requirements
  - Code review failures
  - Test failures
  - Merge conflicts
  - Max retries reached
- **Action**: Creates issue, assigns to user, marks session as blocked

## Conditional Routing Logic

### After Load
```javascript
function routeAfterLoad(state) {
  if (state.phase === 'completed') return 'end';
  if (state.phase === 'blocked') return 'human_clarification';
  if (!state.ideaId) return 'analyze_idea';
  return state.phase; // Resume from checkpoint
}
```

### After Analysis
```javascript
function routeAfterAnalysis(state) {
  if (state.errors.length > 0 && state.retryCount < state.maxRetries) {
    return 'analyze_idea'; // Retry
  }
  if (state.needsUserInput) {
    return 'human_clarification';
  }
  return state.phase; // 'planning' or 'implementing'
}
```

### After Plan
```javascript
function routeAfterPlan(state) {
  if (state.retryCount < state.maxRetries && !state.plan) {
    return 'plan'; // Retry planning
  }
  if (state.needsUserInput || !state.planApproved) {
    return 'human_clarification'; // Low confidence
  }
  return 'parallel_implementation'; // Start implementing
}
```

### After Implementation
```javascript
function routeAfterImplementation(state) {
  if (state.conflicts.length > 0) {
    return 'human_clarification'; // Can't auto-resolve
  }
  if (state.errors.length > 0) {
    return 'handle_error'; // Attempt recovery
  }
  if (state.phase === 'implementing') {
    return 'parallel_implementation'; // Next milestone
  }
  return 'review_code'; // All milestones done
}
```

## Checkpointing & Resume

### Checkpoint Saves

Checkpoints are saved after:
1. **Every node execution** (automatic)
2. **Before risky operations** (manual)
3. **On timeout** (graceful exit)
4. **On error** (for recovery)

### Checkpoint Storage

```
state/
├── checkpoints/
│   ├── session-123.json          # Latest checkpoint
│   └── session-123-backup.json   # Previous checkpoint
├── backups/
│   ├── auto-2024-02-05T10-00.json
│   └── recovered-2024-02-05T10-15.json
└── rollbacks/
    ├── milestone-1-123456.json
    └── milestone-2-123457.json
```

### Resume Logic

```javascript
// Load checkpoint
const checkpoint = await loadCheckpoint(sessionId);

if (checkpoint && process.env.RESUME === 'true') {
  // Resume from checkpoint
  return {
    ...checkpoint,
    retryCount: 0, // Reset retry count
    timeoutAt: Date.now() + TIMEOUT_MS // Extend timeout
  };
}
```

## Parallel Agent Execution

### Implementation

```javascript
// Split files across agents
const agentCount = Math.min(3, Math.ceil(allFiles.length / 2));
const filesPerAgent = Math.ceil(allFiles.length / agentCount);

const agentPromises = [];

for (let i = 0; i < agentCount; i++) {
  const agentFiles = allFiles.slice(i * filesPerAgent, (i + 1) * filesPerAgent);

  agentPromises.push(
    runOpenCodeAgent(agentPrompt, { timeout: 300000 })
      .then(result => ({ agentId: i, success: true, result }))
      .catch(error => ({ agentId: i, success: false, error: error.message }))
  );
}

const results = await Promise.all(agentPromises);
```

### Failure Handling

```javascript
const failures = results.filter(r => !r.success);

if (failures.length > 0) {
  console.error(`❌ ${failures.length} agents failed`);

  // Rollback all changes
  await git.rollback(rollbackPoint);

  // Retry entire milestone
  return {
    retryCount: state.retryCount + 1,
    lastError: failures.map(f => f.error).join('; ')
  };
}
```

## Resource Monitoring

### Periodic Checks

```javascript
// Check after each node
finalState.resourceUsage = await checkResourceUsage();

// Resource check function
async function checkResourceUsage() {
  const used = process.memoryUsage();
  return {
    memory: Math.round(used.heapUsed / 1024 / 1024),
    cpu: process.cpuUsage().user / 1000000
  };
}
```

### Automatic Cleanup

```javascript
// If memory > 90%
if (resourceUsage.memory > 90) {
  await ResourceMonitor.cleanupTempFiles();

  // Reduce parallel agents
  const agentCount = 1; // Instead of 3
}
```

## Error Recovery Flow

```mermaid
graph TD
    A[Error Detected] --> B[Classify Error]
    B --> C{Error Type}

    C -->|Network/Timeout| D[Exponential Backoff]
    D --> E{Retry < Max?}
    E -->|Yes| F[Retry Operation]
    E -->|No| G[Escalate to User]

    C -->|Conflict| H[Rollback to Last Good]
    H --> I[Attempt Auto-Resolve]
    I --> J{Resolved?}
    J -->|Yes| K[Continue]
    J -->|No| G

    C -->|Resource| L[Cleanup & Reduce Load]
    L --> M[Retry with Lower Concurrency]

    C -->|Dependency| N[Install Missing Deps]
    N --> O{Success?}
    O -->|Yes| K
    O -->|No| G

    C -->|Critical| G

    F --> P{Success?}
    P -->|Yes| K
    P -->|No| E

    K --> Q[Save Checkpoint]
    G --> R[Create GitHub Issue]
    R --> S[Mark as Blocked]
```

## Performance Optimizations

### 1. **Parallel Agent Execution**
- 3 agents work concurrently
- 3x faster than sequential
- Configurable via `agent-config.json`

### 2. **Checkpointing**
- State saved incrementally
- No need to replay entire history
- Resume in < 1 second

### 3. **Agent Timeouts**
- Prevent hanging agents
- 5-minute max per agent
- 23-minute workflow max

### 4. **Memory Management**
- Monitor heap usage
- Auto-cleanup when high
- Reduce concurrency dynamically

### 5. **Smart Retries**
- Exponential backoff
- Classify before retry
- Max 3 attempts per operation

## Advanced Features

### 1. **Conditional Milestone Skipping**
If a milestone is already done (e.g., files exist, tests pass):
```javascript
if (await milestoneAlreadyComplete(milestone)) {
  return { currentMilestone: state.currentMilestone + 1 };
}
```

### 2. **Dynamic Plan Adjustment**
If implementation reveals issues:
```javascript
if (implementationFailed && failureIsSystemic) {
  return {
    phase: 'planning',
    plan: null, // Force replanning
    agentOutputs: { ...state.agentOutputs, replanReason: error }
  };
}
```

### 3. **Incremental Commits**
Commit after each milestone:
```javascript
await git.commitAll(`🤖 Auto: ${milestone.name}`);

// Allows partial progress even if later milestones fail
```

### 4. **Rollback Points**
Create before risky operations:
```javascript
const rollbackPoint = await RollbackManager.createRollbackPoint('pre-milestone-3');

// On failure
if (failed) {
  await RollbackManager.rollback(rollbackPoint);
}
```

## Testing the Graph

### Unit Test Nodes

```javascript
import { createAutonomousDevGraph } from './orchestrator-langgraph.js';

const graph = createAutonomousDevGraph();

// Test load_state node
const state = await graph.invoke({
  sessionId: 'test-123',
  ideaId: '001-test'
});

console.log('State after load:', state);
```

### Integration Test

```bash
# Full workflow test
export IDEA_ID=001-test
export TIMEOUT_MINUTES=5
node scripts/orchestrator-langgraph.js
```

### Edge Case Testing

```bash
# Test timeout
TIMEOUT_MINUTES=1 node scripts/orchestrator-langgraph.js

# Test resume
export RESUME=true
node scripts/orchestrator-langgraph.js

# Test failure recovery
# (Inject error in agent output)
```

## Comparison: Simple vs LangGraph Orchestrator

| Feature | Simple Orchestrator | LangGraph Orchestrator |
|---------|---------------------|------------------------|
| State Management | Manual JSON | Built-in Annotation |
| Checkpointing | Custom | MemorySaver |
| Conditional Routing | if/else | addConditionalEdges |
| Error Recovery | Try/catch | Node-level handlers |
| Resumption | Load JSON | Thread-based |
| Visualization | None | Mermaid graph |
| Complexity | ~270 lines | ~900 lines |
| Robustness | Good | Excellent |
| Edge Cases | ~10 handled | ~24 handled |
| Parallel Agents | Yes | Yes |
| Code Quality | ⭐⭐⭐ | ⭐⭐⭐⭐⭐ |

## Future Enhancements

1. **Multi-branch parallelism** - Work on multiple ideas simultaneously
2. **Agent specialization** - Different models for different tasks
3. **Learning from history** - Improve plans based on past successes
4. **Cost optimization** - Use cheapest model that works
5. **A/B testing** - Compare different approaches
6. **Distributed execution** - Run agents on different machines
7. **Real-time monitoring** - Dashboard showing graph state
8. **Custom edge handlers** - User-defined recovery strategies

---

**The LangGraph architecture makes the system production-ready with enterprise-grade reliability and comprehensive edge case handling.** 🚀
