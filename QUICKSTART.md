# 🚀 Quick Start Guide

Get your autonomous development system running in under **5 minutes** with just a single idea or vibe!

---

## 🎯 Three Ways to Start

### Option 1: Bootstrap (⚡ Fastest - Recommended)

**Perfect for**: Brand new setup - everything automated!

```bash
# One command to set up EVERYTHING
node scripts/bootstrap.js "Add user authentication feature"
```

This single command will:
- ✅ Initialize git repository (if needed)
- ✅ Create all required directories
- ✅ Install all dependencies
- ✅ Install OpenClaw CLI
- ✅ Create your first idea (AI-expanded)
- ✅ Make initial commit
- ✅ Trigger first workflow run

**That's it!** Your system is now autonomous and working.

---

### Option 2: Quick Idea Creation

**Perfect for**: Adding ideas to existing system

```bash
# Just describe what you want in plain English
node scripts/create-idea.js "Optimize database queries"

# Or use vibe mode for casual descriptions
node scripts/create-idea.js --vibe "make the app faster"

# Interactive mode for more control
node scripts/create-idea.js --interactive
```

The AI will:
- Expand your vibe into a full development plan
- Add technical details and acceptance criteria
- Save to `ideas/backlog/XXX-title.md`
- System picks it up automatically

---

### Option 3: GitHub Actions UI (No Terminal)

**Perfect for**: Non-technical users or quick triggers

1. Go to your GitHub repository
2. Click **Actions** tab
3. Select **"🤖 Autonomous Development"**
4. Click **"Run workflow"**
5. Enter your idea in the **"vibe"** field:
   ```
   Add dark mode to the application
   ```
6. Click **"Run workflow"**

Done! The system creates the idea and starts working immediately.

---

## Prerequisites

- Node.js 20+
- Git repository (optional - bootstrap creates one)
- GitHub Actions enabled
- OpenClaw CLI (bootstrap installs it)

---

## 💡 Usage Examples

### Example 1: From Scratch (Complete Setup)

```bash
# Clone this repo or copy files to your project
cd /path/to/your/project

# Run bootstrap with your first idea
node scripts/bootstrap.js "Add JWT authentication"

# Output:
# ✅ Repository initialized
# ✅ Dependencies installed
# ✅ OpenClaw installed
# ✅ Idea created: 001-add-jwt-authentication.md
# ✅ Workflow triggered
# 🚀 System is now running!
```

### Example 2: Add Quick Idea

```bash
# Simple description
node scripts/create-idea.js "Fix mobile responsive issues"

# AI expands to:
# - Title: "Fix Mobile Responsive Layout Issues"
# - Description: Detailed analysis
# - 5 acceptance criteria
# - Technical approach
# - Priority: High
# - File created: 002-fix-mobile-responsive-issues.md
```

### Example 3: Casual Vibe

```bash
# Very casual description
node scripts/create-idea.js "the checkout is super slow"

# AI understands and creates:
# - Title: "Optimize Checkout Performance"
# - Analysis of performance bottlenecks
# - Specific optimization strategies
# - Measurable acceptance criteria
```

### Example 4: Interactive Control

```bash
node scripts/create-idea.js --interactive

# Prompts you for:
# - Title
# - Description (one line)
# - Context (why needed)
# - Acceptance criteria (multiple)
# - Technical notes
# - Priority & complexity
# - Labels
```

---

## 📋 Manual Setup (If Not Using Bootstrap)

### Step 1: Install OpenClaw CLI (1 min)

```bash
# Option A: Via npm
npm install -g openclaw

# Option B: Via curl (if available)
curl -sSL https://openclaw.dev/install.sh | bash

# Verify installation
openclaw --version

# Test with OpenCode models
openclaw run --model opencode/gpt-5-nano "Hello, test"
```

**OpenClaw uses OpenCode's free models:**
- `opencode/gpt-5-nano` - Fast general purpose
- `opencode/codellama-7b` - Code specialist
- `opencode/mixtral-8x7b` - High quality

## Step 2: Copy Files to Your Repo (1 min)

```bash
# Navigate to your project
cd /path/to/your/project

# Copy all files
cp -r /Users/sdhule/ai/autonomous-dev-proposal/* .

# Or manually copy:
# - .github/workflows/autonomous-dev.yml
# - scripts/ (entire directory)
# - config/ (entire directory)
# - ideas/ (entire directory)
# - package.json (merge dependencies)
```

## Step 3: Install Dependencies (1 min)

```bash
npm install
```

This installs:
- `@langchain/langgraph` - State orchestration
- `@langchain/core` - OpenClaw core

## Step 4: Create Your First Idea (30 seconds)

**New Way (AI-Powered):**
```bash
# Just describe what you want
node scripts/create-idea.js "Add health check endpoint"

# Output:
# ✅ Idea created successfully!
# 📁 File: 001-add-health-check-endpoint.md
# 🆔 ID: 001
# 💡 AI expanded your idea with full details!
```

**Old Way (Manual):**
```bash
# Copy template
cp ideas/backlog/template.md ideas/backlog/001-my-idea.md

# Edit the file
nano ideas/backlog/001-my-idea.md
```

Both work! The AI way is faster and adds helpful details.

## Step 5: Push and Deploy (1 min)

```bash
# Create branch
git checkout -b feature/autonomous-dev

# Add files
git add .github/workflows/ scripts/ config/ ideas/
git add package.json

# Commit
git commit -m "Add autonomous dev system"

# Push
git push origin feature/autonomous-dev

# Merge to main (via PR or direct)
git checkout main
git merge feature/autonomous-dev
git push origin main
```

## Step 6: Watch It Work! (0 min)

The system will start automatically on the next hour.

**Or trigger with your idea immediately:**

```bash
# Trigger with idea ID
gh workflow run autonomous-dev.yml --ref dev -f idea_id=001

# Or create idea on the fly!
gh workflow run autonomous-dev.yml --ref dev -f vibe="Add dark mode"

# Via GitHub UI
Actions → Autonomous Development → Run workflow
  → Enter vibe: "optimize performance"
  → Click Run
```

---

## 📊 Monitoring & Progress

### Real-Time Monitoring

```bash
# Watch workflow runs
gh run list --workflow=autonomous-dev.yml

# Follow latest run logs
gh run view --log --follow

# Check current session state
cat state/current-session.json

# View created issues
gh issue list --label autonomous
```

### What to Expect

```
Minute 0 → Workflow starts
    ↓
Minute 1 → AI analyzes idea & creates plan
    ↓
Minute 3 → Starts implementing first milestone
    ↓
Minute 10 → Commits first milestone to dev
    ↓
Minute 15 → Implements second milestone
    ↓
Minute 22 → Reviews code & runs tests
    ↓
Minute 25 → Saves checkpoint & exits
    ↓
Next Hour → Resumes from checkpoint
```

### Progress Indicators

The system saves state after every step:

```json
{
  "ideaId": "001-add-health-check-endpoint",
  "phase": "implementing",
  "currentMilestone": 2,
  "totalMilestones": 3,
  "progress": 67,
  "status": "in_progress",
  "next_step": "Complete milestone 3"
}
```

---

## ✅ Verification Checklist

After first run, check:

- [ ] Workflow completed without errors
- [ ] New files created in your repo
- [ ] Commits appear in `dev` branch
- [ ] GitHub Issue created (if user input needed)
- [ ] `state/current-session.json` exists
- [ ] Checkpoints saved in `state/checkpoints/`

---

## 🐛 Troubleshooting

### "openclaw: command not found"

**Solution:**
```bash
# Add to PATH
export PATH="$PATH:$HOME/.openclaw/bin"

# Or install globally
npm install -g openclaw
```

### "Module not found: @langchain/langgraph"

**Solution:**
```bash
npm install @langchain/langgraph @langchain/core
```

### "No such file or directory: ideas/backlog"

**Solution:**
```bash
mkdir -p ideas/{backlog,in-progress,completed}
mkdir -p state/{checkpoints,backups,rollbacks,agent-outputs}
```

### Workflow doesn't run

**Solution:**
1. Check `.github/workflows/autonomous-dev.yml` exists
2. Verify cron syntax: `0 * * * *`
3. Check Actions permissions in repo settings
4. Enable Actions in repo (Settings → Actions → Allow all actions)

### "Permission denied" errors

**Solution:**
```bash
# Make scripts executable
chmod +x scripts/*.js
chmod +x scripts/utils/*.js
```

### OpenClaw can't access OpenCode models

**Solution:**
```bash
# Test model access
openclaw run --model opencode/gpt-5-nano "test"

# If fails, check API key (if required)
export OPENCODE_API_KEY=your_key

# Or configure in openclaw
openclaw config set model opencode/gpt-5-nano
```

---

## 🎯 Test Run (Local)

Before pushing, test locally:

```bash
# Set environment
export IDEA_ID=002-my-first-idea
export MODEL=opencode/gpt-5-nano
export GITHUB_TOKEN=your_token

# Run orchestrator
node scripts/orchestrator-langgraph.js
```

**Expected output:**
```
═══════════════════════════════════════════════════════════════════
🤖 LANGGRAPH AUTONOMOUS DEVELOPMENT ORCHESTRATOR
═══════════════════════════════════════════════════════════════════
📋 Idea: 002-my-first-idea
⏱️  Timeout: 23 minutes
🔄 Resume: No

📂 [LOAD_STATE] Loading session state...
   🆕 Starting new session: session-1707140400000

🔍 [ANALYZE_IDEA] Understanding the idea...
   Idea: 002-my-first-idea
   ✅ Complexity: low
   ✅ Confidence: 0.95
   ✅ Estimated milestones: 2

📋 [PLAN] Creating implementation plan...
   Attempt: 1/4
   ✅ Plan created: 2 milestones
      1. Create health endpoint handler
      2. Add to main router
   💾 Checkpoint saved: planning (20%)

💻 [PARALLEL_IMPLEMENTATION] Executing milestone...
   Milestone 1/2: Create health endpoint handler
   📍 Rollback point: abc123de
   🔀 Spawning 2 parallel agents...
   📊 Results: 2/2 succeeded
      ✅ Wrote server/routes/health.js
   💾 Checkpoint saved: implementing (50%)

💻 [PARALLEL_IMPLEMENTATION] Executing milestone...
   Milestone 2/2: Add to main router
   📍 Rollback point: def456gh
   🔀 Spawning 1 parallel agents...
   📊 Results: 1/1 succeeded
      ✅ Wrote server/index.js
   💾 Checkpoint saved: implementing (80%)

👀 [REVIEW_CODE] Reviewing implementation...
   📊 Code quality: 90/100
   📝 Issues: 0
   ✅ Review approved

🧪 [TEST] Running tests...
   ✅ Tests passed

═══════════════════════════════════════════════════════════════════
📊 FINAL RESULT
═══════════════════════════════════════════════════════════════════
Status: success
Phase: completed
Progress: 100%
Milestones: 2/2
Execution time: 180s
Memory used: 245MB
═══════════════════════════════════════════════════════════════════
```

---

## 🎨 Customize (Optional)

### Change Schedule

Edit `.github/workflows/autonomous-dev.yml`:

```yaml
schedule:
  - cron: '0 */2 * * *'  # Every 2 hours
  - cron: '0 9 * * 1-5'  # 9 AM on weekdays
```

### Change Models

Edit `config/models.json`:

```json
{
  "models": {
    "planner": {
      "model": "opencode/mixtral-8x7b"  # Upgrade to better model
    },
    "coder": {
      "model": "opencode/codellama-13b"  # Larger code model
    }
  }
}
```

### Adjust Parallelism

Edit `config/agent-config.json`:

```json
{
  "agents": {
    "coder": {
      "parallel_instances": 5  # More agents (faster)
    }
  }
}
```

---

## 📚 Next Steps

1. **Read the docs**:
   - [IMPLEMENTATION_GUIDE.md](IMPLEMENTATION_GUIDE.md) - Detailed setup
   - [EDGE_CASES.md](EDGE_CASES.md) - Error handling
   - [LANGGRAPH_ARCHITECTURE.md](LANGGRAPH_ARCHITECTURE.md) - How it works

2. **Monitor first runs**:
   - Watch Actions tab for 2-3 runs
   - Check commit history in `dev` branch
   - Review any GitHub Issues created

3. **Add more ideas**:
   - Create multiple ideas in backlog
   - System works through them sequentially
   - One idea per hour

4. **Tune for your project**:
   - Adjust agent prompts
   - Add custom validators
   - Extend edge case handling

---

## 🚀 You're Ready!

Your autonomous development system is now running.

**What happens next:**
- Every hour, the system wakes up
- Picks an idea from backlog
- Implements it autonomously (using OpenClaw + OpenCode models)
- Commits progress to dev branch
- Creates PR when ready (optional)

**You can:**
- Add ideas anytime
- Monitor via GitHub Issues
- Review PRs as they come
- Override with manual runs

---

## 💡 Pro Tips

1. **Start small** - Test with simple ideas first
2. **Be specific** - Clearer ideas = better results
3. **Check logs** - Actions logs show everything
4. **Review commits** - Each milestone is a commit
5. **Trust the system** - It handles most edge cases
6. **Respond to issues** - When it needs help, it asks

---

## 🔧 OpenClaw + OpenCode Setup

The system uses:
- **OpenClaw CLI** - Modern CLI tool for AI agents
- **OpenCode Models** - Free, high-quality AI models
  - `opencode/gpt-5-nano` - Planning & review
  - `opencode/codellama-7b` - Code generation
  - `opencode/mixtral-8x7b` - Complex reasoning

**Why OpenClaw?**
- Unified interface for multiple AI providers
- Built-in retry logic
- Better error handling
- JSON output formatting
- Free tier available

**Why OpenCode Models?**
- 100% free (no API key needed for free tier)
- Good quality for coding tasks
- Fast response times
- Generous rate limits

---

**Total time: 5 minutes**
**Cost: $0**
**Result: Autonomous development! 🎉**
