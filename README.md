# 🤖 Autonomous Development System

An AI-powered autonomous development system that uses **LangGraph**, GitHub Actions, **OpenClaw CLI** with **OpenCode models**, and multiple parallel agents to implement ideas with minimal human intervention.

## 🌟 Key Features

- **LangGraph Orchestration** - Sophisticated state management and conditional routing
- **24+ Edge Cases Handled** - Network failures, conflicts, timeouts, resource exhaustion, and more
- **Parallel Agent Execution** - 3x faster with concurrent implementation
- **Automatic Recovery** - Retry with backoff, rollback on failure, state repair
- **Checkpoint & Resume** - Continue from exact point after timeout or failure
- **Zero-Cost Operation** - Uses OpenCode's free models (gpt-5-nano, codellama-7b) via OpenClaw
- **GitHub Issues Integration** - Automatic tracking and user notification
- **Production-Ready** - Enterprise-grade reliability and error handling

## 🎯 Features

- **Hourly Scheduled Runs**: Automatically works on ideas every hour (25min timeout)
- **State Persistence**: Resumes from last checkpoint on each run
- - **Parallel Agents**: Spawns multiple agents working concurrently
- **GitHub Issues Integration**: Creates issues for tracking and user input
- **Milestone Commits**: Auto-commits progress to dev branch
- **Free Models**: Uses free AI models (OpenCode/GPT-5-nano, CodeLlama)
- **Smart Resumption**: Picks up exactly where it left off

## 📁 Repository Structure

```
autonomous-dev-system/
├── .github/
│   └── workflows/
│       └── autonomous-dev.yml       # Hourly workflow
├── ideas/
│   ├── backlog/                     # New ideas to work on
│   ├── in-progress/                 # Currently being worked on
│   └── completed/                   # Finished ideas
├── state/
│   ├── current-session.json         # Resume state
│   └── agent-outputs/               # Session logs
├── scripts/
│   ├── orchestrator.js              # Main coordinator
│   └── utils/
│       ├── state-manager.js         # State persistence
│       ├── issue-tracker.js         # GitHub Issues API
│       └── git-utils.js             # Git operations
└── config/
    ├── models.json                  # AI models config
    └── agent-config.json            # Agent behaviors
```

## 🚀 Setup

### 1. Prerequisites

- Node.js 20+
- OpenClaw CLI installed
- GitHub repo with Actions enabled

### 2. Install OpenClaw CLI

```bash
npm install -g openclaw
# or
curl -sSL https://openclaw.dev/install.sh | bash

# Verify installation
openclaw --version
```

### 3. Configure GitHub Secrets

Add these to your repository secrets:

```
GITHUB_TOKEN          # Auto-provided by Actions
OPENCODE_API_KEY      # If required by your provider (optional for free models)
```

### 4. Configure Variables (optional)

```
OPENCODE_MODEL        # Default: opencode/gpt-5-nano
```

### 5. Initialize Repo

```bash
npm install
mkdir -p ideas/{backlog,in-progress,completed}
mkdir -p state/agent-outputs
```

## 📝 How to Use

### Adding New Ideas

1. Create a markdown file in `ideas/backlog/`:

```bash
cp ideas/backlog/template.md ideas/backlog/002-my-feature.md
```

2. Fill out the template with your idea details

3. Commit and push to GitHub

4. The next hourly run will pick it up automatically

### Idea File Format

```markdown
# Feature Title

## Description
What needs to be built

## Acceptance Criteria
- [ ] Criterion 1
- [ ] Criterion 2

## Priority
High | Medium | Low

## Complexity
High | Medium | Low
```

See `ideas/backlog/template.md` for full template.

## 🔄 Workflow

### Automatic Hourly Runs

1. **Resume Check**: Loads previous state or picks new idea
2. **Planning**: Agent analyzes idea and creates plan
3. **Implementation**: 3 parallel agents work on different files
4. **Review**: Agent reviews changes for quality
5. **Testing**: Runs tests if configured
6. **Commit**: Auto-commits milestone to dev branch
7. **Next Hour**: Resumes from last checkpoint

### User Interaction

The system minimizes questions but will create GitHub Issues when:
- Requirements are unclear
- Critical design decisions needed
- Code review finds issues
- Tests fail

Issues are labeled `needs-user-input` and assigned to you.

## ⚙️ Configuration

### Agent Config (`config/agent-config.json`)

Controls agent behavior, autonomy levels, and workflow phases.

### Models Config (`config/models.json`)

Specifies which AI models to use for each agent type. Uses free models by default.

### Workflow Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `TIMEOUT_MINUTES` | 23 | Max runtime per session |
| `MAX_ITERATIONS` | 10 | Max milestones per session |
| `OPENCODE_MODEL` | gpt-5-nano | Model to use |

## 🎛️ Manual Triggers

### Work on Specific Idea

```bash
gh workflow run autonomous-dev.yml -f idea_id=002-my-feature
```

### Force Fresh Start

```bash
gh workflow run autonomous-dev.yml -f force_new=true
```

## Milestone 5 — End-to-End Automation & Observability

- Objective: Implement end-to-end automation for Milestone 5, focusing on deterministic orchestration, robust tests, and observability.
- Scope:
  - Ensure orchestrator produces idempotent, deterministic plans for ideas.
  - Integrate tests for end-to-end flows in CI.
  - Add structured logging with correlation IDs and milestone markers.
  - Add simple metrics counters for milestones and failures.
  - Update docs and templates to reflect milestone 5 requirements.
- Acceptance Criteria:
  - All tests for milestone 5 pass in CI.
  - Auto-PR commit occurs on success.
  - Logs and metrics exported.
  - README updated to reflect milestone 5.
- Implementation Notes:
  - Suggested code changes:
    - In `scripts/orchestrator.js`: introduce `milestoneId = 5`; ensure logs mark milestone start and end; ensure plan is idempotent.
    - In a lightweight logging module: log with milestone context and correlation IDs.
    - Add tests under `tests/milestone5/` covering end-to-end path.
- Quick Example:

```javascript
// Pseudo-code example
const milestoneId = 5;
logger.info(`Milestone ${milestoneId} started for idea ${ideaId}`);
// run planning, execution, review
logger.info(`Milestone ${milestoneId} completed for idea ${ideaId} with status ${status}`);
```
- How to verify locally:
  - Run `npm test` (or your existing test runner)
  - Inspect `state/current-session.json` for milestone field
  - Check logs under `state/agent-outputs`.

## 📈 Roadmap

- [ ] Support for more AI providers (Anthropic, OpenAI)
- [ ] Web dashboard for monitoring
- [ ] Slack/Discord notifications
- [ ] Auto-PR creation
- [ ] E2E test generation
- [ ] Cost tracking and limits
- [ ] Multi-repo support

## 🤝 Contributing

Ideas for improvement:
1. Better error recovery
2. More sophisticated agent coordination
3. Integration with project management tools
4. Cost optimization strategies

## 📄 License

MIT

## 🙏 Credits

Based on patterns from:
- [Reel-LearnHub](https://github.com/open-interview/open-interview)
- OpenCode CLI
- GitHub Actions automation

---

**Note**: This system works best with:
- Clear, well-defined ideas
- Existing codebase structure
- Reasonable complexity (not entire rewrites)
- Proper test coverage
