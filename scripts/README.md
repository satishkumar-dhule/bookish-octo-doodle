# Scripts Directory

Quick reference for all scripts in the autonomous development system.

---

## 🚀 Quick Start Scripts

### `bootstrap.js`

**One-command setup for first-time users**

```bash
node scripts/bootstrap.js "your first idea"
```

**What it does:**
- Initializes git repository (if needed)
- Creates all required directories
- Installs npm dependencies
- Installs OpenClaw CLI
- Creates your first idea (AI-expanded)
- Makes initial commit
- Triggers first workflow run

**Use when:**
- Setting up a new project
- First-time installation
- Starting fresh

---

### `create-idea.js`

**Quickly create ideas from simple descriptions**

```bash
# Quick mode (AI expansion)
node scripts/create-idea.js "add user authentication"

# Vibe mode (casual description)
node scripts/create-idea.js --vibe "make it faster"

# Interactive mode (full control)
node scripts/create-idea.js --interactive

# See help
node scripts/create-idea.js --help
```

**What it does:**
- Takes your simple description
- Expands it with AI into full specification
- Creates detailed markdown file
- Saves to `ideas/backlog/XXX-title.md`
- Ready for autonomous system to pick up

**AI expansion includes:**
- Clear, descriptive title
- Detailed description
- Context and reasoning
- 3-5 specific acceptance criteria
- Technical notes and approach
- Priority and complexity estimates
- Appropriate labels

**Use when:**
- Adding new ideas to backlog
- Quick brainstorming
- Planning next features

---

## 🤖 Orchestration Scripts

### `orchestrator-with-failover.js`

**Main orchestrator with full failover and error handling**

```bash
node scripts/orchestrator-with-failover.js
```

**Environment variables:**
- `IDEA_ID` - Specific idea to work on
- `RESUME` - Resume from checkpoint (true/false)
- `MODEL` - Primary model to use
- `TIMEOUT_MINUTES` - Max execution time
- `GITHUB_TOKEN` - For GitHub API access

**Features:**
- OpenClaw state machine
- Multi-model failover (3 tiers)
- Circuit breaker pattern
- Graceful degradation
- Partial success handling
- Emergency shutdown
- State preservation

**Used by:**
- GitHub Actions workflow (automatically)
- Manual local testing

---

### `orchestrator-langgraph.js`

**OpenClaw orchestrator without failover**

```bash
node scripts/orchestrator-langgraph.js
```

**Simpler version without:**
- Multi-model failover
- Circuit breaker
- Graceful degradation

**Use when:**
- Testing OpenClaw logic
- Debugging state flow
- Learning the architecture

---

### `orchestrator.js`

**Original simple orchestrator**

```bash
node scripts/orchestrator.js
```

**Basic sequential orchestrator:**
- No OpenClaw
- Simple state machine
- Basic error handling

**Use when:**
- Understanding basic flow
- Minimal setup testing
- Reference implementation

---

## 🛠️ Utility Scripts

### `utils/state-manager.js`

State management utilities:
- Save/load session state
- Create checkpoints
- Restore from checkpoints
- Clean old state

```javascript
import { StateManager } from './utils/state-manager.js';

const state = new StateManager();
await state.save({ ideaId: '001', phase: 'planning' });
const loaded = await state.load();
```

---

### `utils/issue-tracker.js`

GitHub Issues integration:
- Create tracking issues
- Update issue status
- Sync with state
- Assign to users

```javascript
import { IssueTracker } from './utils/issue-tracker.js';

const issues = new IssueTracker();
await issues.create({
  title: 'Work on idea: 001',
  labels: ['autonomous', 'in-progress']
});
```

---

### `utils/git-utils.js`

Git operations:
- Create commits
- Create branches
- Tag commits
- Create PRs
- Rollback changes

```javascript
import { GitUtils } from './utils/git-utils.js';

await GitUtils.commit('feat: add health endpoint');
await GitUtils.createPR('Add health check', 'dev', 'main');
```

---

### `utils/edge-case-handler.js`

Comprehensive edge case handling:
- Error classification
- Conflict resolution
- Dependency management
- State recovery
- Resource monitoring
- Rollback management

```javascript
import { EdgeCaseHandler } from './utils/edge-case-handler.js';

const handler = new EdgeCaseHandler();
const strategy = await handler.handle(error, state);
```

---

### `utils/failover-manager.js`

Multi-model failover system:
- Model hierarchy (3 tiers per agent)
- Circuit breaker pattern
- Graceful degradation
- Partial success handling
- Emergency shutdown

```javascript
import { FailoverManager } from './utils/failover-manager.js';

const failover = new FailoverManager({
  failureThreshold: 3,
  resetTimeout: 60000
});

const result = await failover.executeWithFailover('coder', prompt);
```

---

## 📊 Script Comparison

| Script | Complexity | Features | Use Case |
|--------|-----------|----------|----------|
| `bootstrap.js` | Low | Setup automation | First-time setup |
| `create-idea.js` | Low | AI idea expansion | Adding ideas |
| `orchestrator.js` | Low | Basic flow | Learning/reference |
| `orchestrator-openclaw.js` | Medium | OpenClaw + edge cases | Testing OpenClaw |
| `orchestrator-with-failover.js` | High | Full production features | Production use |

---

## 🔧 Configuration Files

### `config/models.json`

Model configuration:
```json
{
  "cli": "openclaw",
  "models": {
    "planner": {
      "provider": "openclaw",
      "model": "opencode/gpt-5-nano"
    },
    "coder": {
      "provider": "openclaw",
      "model": "opencode/codellama-7b"
    }
  }
}
```

### `config/agent-config.json`

Agent behavior:
```json
{
  "agents": {
    "coder": {
      "parallel_instances": 3,
      "timeout": 300000,
      "max_retries": 3
    }
  }
}
```

---

## 🚀 Common Workflows

### First-Time Setup

```bash
# 1. Bootstrap everything
node scripts/bootstrap.js "Add user login"

# 2. Monitor progress
gh run view --log --follow

# 3. Check results
cat state/current-session.json
```

### Add New Idea

```bash
# 1. Create idea
node scripts/create-idea.js "Optimize database"

# 2. Trigger workflow
gh workflow run autonomous-dev.yml --ref dev

# Or wait for next hourly run
```

### Local Testing

```bash
# 1. Set environment
export IDEA_ID=001-my-idea
export MODEL=opencode/gpt-5-nano
export GITHUB_TOKEN=your_token

# 2. Run orchestrator
node scripts/orchestrator-with-failover.js

# 3. Check output
ls ideas/in-progress/
cat state/current-session.json
```

### Debug Failover

```bash
# Test circuit breaker
FORCE_PRIMARY_FAIL=true node scripts/orchestrator-with-failover.js

# Test graceful degradation
FORCE_ALL_MODELS_FAIL=true node scripts/orchestrator-with-failover.js

# Verbose logging
DEBUG=true node scripts/orchestrator-with-failover.js
```

---

## 📚 Documentation

- **Bootstrap**: See output of `node scripts/bootstrap.js --help`
- **Create Idea**: See output of `node scripts/create-idea.js --help`
- **Orchestrator**: See [LANGGRAPH_ARCHITECTURE.md](../LANGGRAPH_ARCHITECTURE.md)
- **Failover**: See [FAILOVER_GUIDE.md](../FAILOVER_GUIDE.md)
- **Edge Cases**: See [EDGE_CASES.md](../EDGE_CASES.md)

---

## 🐛 Troubleshooting

### Script won't run

```bash
# Make executable
chmod +x scripts/*.js
chmod +x scripts/utils/*.js

# Or use node directly
node scripts/bootstrap.js
```

### Module not found

```bash
# Install dependencies
npm install

# Check node version (need 20+)
node --version
```

### OpenClaw not found

```bash
# Install globally
npm install -g openclaw

# Or via bootstrap
node scripts/bootstrap.js "test"
```

---

**For full documentation, see the main README.md in the project root.**
