# 🤖 Autonomous Development System

An AI-powered autonomous development system that uses **OpenClaw**, GitHub Actions, **OpenClaw CLI** with **OpenCode models**, and multiple parallel agents to implement ideas with minimal human intervention.

## 🌟 Key Features

- **OpenClaw Orchestration** - Sophisticated state management and conditional routing
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
- **Parallel Agents**: Spawns multiple agents working concurrently
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

## 📊 Monitoring

### Check Progress

View progress in:
- GitHub Actions run logs
- Tracking issue comments (auto-updated each run)
- `state/current-session.json`

### Session Summary

Each run generates a summary showing:
- Current status and progress %
- Completed milestones
- Next steps
- Any blocking issues

## 🔧 Advanced Usage

### Custom Agent Prompts

Edit agent prompts in `scripts/orchestrator.js`:

```javascript
const prompt = `
Your custom instructions...
`;
```

### Parallel Agent Configuration

Adjust in `config/agent-config.json`:

```json
{
  "parallel_instances": 5,  // More parallel agents
  "parallel_limit": 5
}
```

### Integration with Existing Workflow

The system works on the `dev` branch by default. To integrate:

1. Ideas are implemented on `dev`
2. Create manual PR from `dev` to `main` when ready
3. Or add auto-PR creation in the workflow

## 🐛 Troubleshooting

### Workflow Not Running

- Check cron schedule in `.github/workflows/autonomous-dev.yml`
- Verify Actions are enabled in repo settings
- Check workflow permissions (needs write access)

### State Not Persisting

- Ensure `state/` directory is committed
- Check if commits are being pushed (not blocked by branch protection)

### Agents Timing Out

- Reduce `MAX_ITERATIONS` in workflow
- Simplify ideas or break into smaller pieces
- Check OpenCode CLI is responding

### OpenCode Installation Issues

```bash
# Verify installation
opencode --version

# Check available models
opencode models list

# Test a simple prompt
opencode run "Hello world"
```

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
