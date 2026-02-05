# 🛠️ Implementation Guide

## Quick Start (5 Minutes)

### 1. Copy to Your Repo

```bash
# Copy these files to your existing Reel-LearnHub repo
cp -r autonomous-dev-proposal/* /path/to/Reel-LearnHub/
cd /path/to/Reel-LearnHub
```

### 2. Update Existing Files

Since you already have `script/ai/providers/opencode.js`, you can reuse it!

Just update the orchestrator imports:

```javascript
// In scripts/orchestrator.js, add at top:
import opencode from './ai/providers/opencode.js';

// Then use it instead of spawn:
const result = await opencode.call(prompt);
const parsed = opencode.parseResponse(result);
```

### 3. Enable GitHub Actions

Commit and push:

```bash
git checkout -b feature/autonomous-dev
git add .github/workflows/autonomous-dev.yml
git add scripts/ config/ ideas/
git commit -m "Add autonomous dev system"
git push origin feature/autonomous-dev
```

Merge to main and the hourly workflow starts automatically!

## Integration with Existing Reel-LearnHub

### Option A: Separate Autonomous System

Keep it as a separate workflow that doesn't interfere with existing content generation:

```yaml
# .github/workflows/autonomous-dev.yml
# Runs independently from content-generation.yml
```

### Option B: Integrated Approach

Merge autonomous development into existing workflows:

```yaml
# Add to content-generation.yml
  autonomous-dev:
    name: 🤖 Autonomous Dev
    runs-on: ubuntu-latest
    timeout-minutes: 25
    steps:
      - uses: actions/checkout@v4
      - uses: ./.github/actions/setup-bot
      - name: Run Autonomous Dev
        run: node scripts/orchestrator.js
```

## Free Models Configuration

Your existing `script/ai/config.js` already uses:

```javascript
defaultModel: process.env.OPENCODE_MODEL || 'opencode/gpt-5-nano'
```

This is perfect! The system will use free models by default.

### Available Free Models

Based on your setup, you can use:

1. **opencode/gpt-5-nano** - Fast, general purpose
2. **opencode/codellama-7b** - Code specialist
3. **opencode/mixtral-8x7b** - High quality, slower
4. **Your OLLAMA_URL** - Self-hosted models

Update `config/models.json` to match your preferences.

## Recommended Schedule

```yaml
schedule:
  - cron: '0 * * * *'    # Every hour: Autonomous dev
  - cron: '0 2 * * *'    # 2 AM: Full content pipeline
  - cron: '0 */6 * * *'  # Every 6 hours: Maintenance
```

This prevents resource conflicts.

## Testing Before Production

### 1. Manual Test Run

```bash
# Locally
export GITHUB_TOKEN=your_token
export OPENCODE_MODEL=opencode/gpt-5-nano
node scripts/orchestrator.js
```

### 2. Workflow Dispatch Test

```bash
gh workflow run autonomous-dev.yml -f idea_id=001-example-feature -f force_new=true
```

### 3. Monitor First Run

Watch the Actions tab closely during the first run:
- Check agent outputs
- Verify commits to dev branch
- Ensure state persistence works

## Cost Management

Since you're using free models, costs are minimal. But to be safe:

### Rate Limiting

Already configured in your `config.js`:

```javascript
rateLimit: {
  requestsPerMinute: 30,
  delayBetweenRequestsMs: 2000
}
```

### Timeout Safety

The 25-minute timeout prevents runaway workflows:

```yaml
timeout-minutes: 25  # Workflow level
```

```javascript
const TIMEOUT_MS = 23 * 60 * 1000;  // Code level (2min buffer)
```

## State Management

### Current Session State

The system saves state to `state/current-session.json`:

```json
{
  "idea_id": "002-auth-feature",
  "status": "implementing",
  "progress": 45,
  "iterations": 2,
  "milestones": [
    {
      "name": "Database schema created",
      "completed_at": "2024-02-05T10:30:00Z",
      "commit": "abc123"
    }
  ],
  "main_issue": 42,
  "next_step": "Implement auth endpoints"
}
```

This allows perfect resumption on the next run.

### Clearing State

To start fresh:

```bash
rm state/current-session.json
git add state/current-session.json
git commit -m "Reset autonomous dev state"
git push
```

Or use workflow dispatch with `force_new=true`.

## Parallel Agents Deep Dive

The system spawns 3 parallel coder agents by default:

```javascript
const agents = await this.spawnParallelAgents([
  { name: 'coder-1', task: task1 },  // Files 1-3
  { name: 'coder-2', task: task2 },  // Files 4-6
  { name: 'coder-3', task: task3 }   // Files 7-9
]);
```

### Adjusting Parallelism

Edit `config/agent-config.json`:

```json
{
  "agents": {
    "coder": {
      "parallel_instances": 5  // More agents
    }
  }
}
```

Or in `orchestrator.js`:

```javascript
const agentCount = Math.min(files.length, 5);
```

## GitHub Issues Integration

### Auto-Created Issues

The system creates issues for:

1. **Tracking Issue** - Main progress tracker
2. **Blocking Issues** - When user input needed
3. **Review Issues** - When code review finds problems

### Issue Labels

```
autonomous          - All bot-created issues
in-progress        - Currently being worked on
needs-user-input   - Waiting for your response
completed          - Done
```

### Responding to Bot Questions

When the bot creates a `needs-user-input` issue:

1. Review the question and context
2. Answer in a comment
3. Close the issue when resolved
4. Next run will pick up your answer (if you update state file)

## Security Considerations

### Branch Protection

Recommended settings for `dev` branch:

- ❌ Require PR reviews (bot commits directly)
- ✅ Require status checks (keep quality high)
- ✅ Include administrators
- ❌ Require linear history (bot may create merge commits)

### Secrets

The bot only needs:

```
GITHUB_TOKEN  # Auto-provided, has write access
```

No API keys needed for free models!

### Review Process

Even though the bot is autonomous:

1. All work happens on `dev` branch
2. Manual PR from `dev` → `main` for production
3. You review consolidated changes before deployment

## Monitoring & Alerts

### GitHub Actions Notifications

Enable notifications for:
- Failed workflow runs
- New issues created by bot
- Commits to dev branch

### Dashboard (Future)

Consider building a simple dashboard:

```javascript
// scripts/dashboard.js
import fs from 'fs';

const state = JSON.parse(fs.readFileSync('state/current-session.json'));
const sessions = fs.readdirSync('state/agent-outputs');

console.log(`
📊 Autonomous Dev Dashboard
━━━━━━━━━━━━━━━━━━━━━━━━━━

Current Work:    ${state.idea_id}
Status:          ${state.status}
Progress:        ${state.progress}%
Sessions Today:  ${sessions.length}
Last Update:     ${state.last_updated}
`);
```

## Troubleshooting

### Common Issues

#### 1. "opencode: command not found"

Add installation step to workflow:

```yaml
- name: Install OpenCode CLI
  run: npm install -g opencode-cli
```

#### 2. State not persisting

Check if commits are being pushed:

```yaml
- name: Debug Git Status
  run: |
    git status
    git log -1
    git remote -v
```

#### 3. Agents timing out

Reduce complexity:

```javascript
const TIMEOUT_MS = 20 * 60 * 1000;  // 20min instead of 23
const MAX_ITERATIONS = 5;            // Fewer iterations
```

#### 4. Out of memory

Use smaller models:

```javascript
defaultModel: 'opencode/gpt-5-nano'  // Not gpt-5-pro
```

## Next Steps

1. **Week 1**: Test with simple ideas (health check endpoints, etc.)
2. **Week 2**: Gradually increase complexity
3. **Week 3**: Fine-tune agent prompts based on results
4. **Week 4**: Enable for production use

## Success Metrics

Track these to measure effectiveness:

- **Ideas completed autonomously**: Target 70%+
- **Questions asked per idea**: Target < 3
- **Code quality**: Same as manual (measured by reviews)
- **Time to implementation**: Should be faster than manual

## Contributing Back

If this works well for Reel-LearnHub, consider:

1. Extracting to separate repo
2. Making it a reusable GitHub Action
3. Sharing on GitHub Marketplace
4. Writing a blog post about autonomous development

---

**Ready to launch?** Start with one simple idea and see how it goes!
