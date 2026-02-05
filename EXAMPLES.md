# 💡 Real-World Examples

Complete examples showing how to use the autonomous development system with the new quick-start features.

---

## Example 1: Complete First-Time Setup

**Scenario:** You just cloned this repo and want to start autonomous development.

```bash
# Step 1: One command to set up everything
node scripts/bootstrap.js "Add REST API for user management"

# Output:
# ╔═══════════════════════════════════════════════════════════════════╗
# ║   🤖 Autonomous Development System - Bootstrap                   ║
# ╚═══════════════════════════════════════════════════════════════════╝
#
# 🎯 Initial idea: "Add REST API for user management"
#
# ✅ Git repository initialized
# ✅ Directory structure created
# ✅ Dependencies installed
# ✅ OpenClaw installed
# 🤖 Expanding your idea with AI...
# ✅ Initial idea created: 001-add-rest-api-for-user-management.md
# ✅ Initial commit created
# 🚀 Triggering first workflow run...
# ✅ Workflow triggered successfully
#
# ╔═══════════════════════════════════════════════════════════════════╗
# ║   ✅ Bootstrap Complete!                                          ║
# ╚═══════════════════════════════════════════════════════════════════╝

# Step 2: Watch it work
gh run view --log --follow

# That's it! System is now autonomous.
```

**What happens next:**
1. Workflow analyzes your idea
2. Creates 3-4 milestones for implementation
3. Implements each milestone (writes actual code)
4. Commits each milestone to dev branch
5. Creates GitHub Issues for tracking
6. Resumes automatically on next hour

---

## Example 2: Add Idea with Simple Description

**Scenario:** You want to add a new feature but don't want to write detailed specs.

```bash
# Just describe it casually
node scripts/create-idea.js "the app needs pagination on the users list"

# Output:
# 🤖 Expanding your idea with AI...
# ✅ AI expansion successful
#
# ✅ Idea created successfully!
# 📁 File: 002-implement-pagination-for-users-list.md
# 🆔 ID: 002
# 📝 Title: Implement Pagination for Users List
#
# 🚀 Next steps:
#    1. Review the file: cat ideas/backlog/002-implement-pagination-for-users-list.md
#    2. Wait for next scheduled run (hourly)
#    3. Or trigger manually: gh workflow run autonomous-dev.yml --ref dev -f idea_id=002
```

**AI expanded it to:**
```markdown
# Implement Pagination for Users List

## Description
Add server-side pagination to the users list endpoint to improve
performance and user experience when dealing with large datasets.

## Context
Currently, the users list endpoint returns all users at once, which
causes slow page loads and poor UX with many users. Pagination will
allow loading data in chunks.

## Acceptance Criteria
- [ ] Add pagination parameters to GET /api/users (page, limit)
- [ ] Return total count in response headers
- [ ] Add page navigation UI components
- [ ] Handle edge cases (empty pages, invalid page numbers)
- [ ] Add tests for pagination logic

## Technical Notes
- Use LIMIT/OFFSET for SQL queries
- Default page size: 25 items
- Maximum page size: 100 items
- Return X-Total-Count header
- Consider cursor-based pagination for better performance

## Priority
High

## Estimated Complexity
Medium
```

---

## Example 3: Quick Vibe to Running Code

**Scenario:** You have a vague idea and want to see it implemented ASAP.

```bash
# Step 1: Create from vibe via GitHub Actions
# Go to: Actions → Autonomous Development → Run workflow
# Enter vibe: "add dark mode"
# Click: Run workflow

# Step 2: Monitor in real-time
gh run view --log --follow

# Output (live):
# 🤖 AUTONOMOUS DEVELOPMENT ORCHESTRATOR
# ═══════════════════════════════════════
# 💡 Creating idea from vibe: "add dark mode"
# 🤖 AI expanding idea...
# ✅ Idea created: 001-add-dark-mode-support.md
#
# 🔍 Analyzing idea...
#    Complexity: Medium
#    Estimated milestones: 3
#
# 📋 Creating plan...
#    Milestone 1: Add dark mode state management
#    Milestone 2: Create dark mode toggle component
#    Milestone 3: Apply dark mode styles
#
# 💻 Implementing milestone 1...
#    ✅ Created: src/contexts/ThemeContext.jsx
#    ✅ Created: src/hooks/useDarkMode.js
#    💾 Committed to dev
#
# 💻 Implementing milestone 2...
#    ✅ Created: src/components/DarkModeToggle.jsx
#    ✅ Modified: src/components/Header.jsx
#    💾 Committed to dev
#
# 💻 Implementing milestone 3...
#    ✅ Modified: src/styles/theme.css
#    ✅ Modified: src/App.jsx
#    💾 Committed to dev
#
# 👀 Reviewing code...
#    Code quality: 92/100
#    ✅ Approved
#
# ✅ Idea completed successfully!

# Step 3: Check the results
git log dev --oneline -5

# Output:
# abc123 🤖 Auto: Apply dark mode styles [skip ci]
# def456 🤖 Auto: Create dark mode toggle [skip ci]
# ghi789 🤖 Auto: Add dark mode state management [skip ci]
```

**Time elapsed:** ~15 minutes from idea to working code!

---

## Example 4: Interactive Idea Creation

**Scenario:** You want full control over the idea specification.

```bash
node scripts/create-idea.js --interactive

# Interactive prompts:
# 💡 Idea title: Add Redis caching layer
# 📝 Description: Implement Redis caching to reduce database load
# 🎯 Why is this needed? Current DB queries are causing performance bottlenecks
#
# 📋 Acceptance Criteria (one per line, empty line to finish):
#    1. Install and configure Redis client
#    2. Cache user profile queries (TTL: 1 hour)
#    3. Cache product listings (TTL: 30 min)
#    4. Add cache invalidation on updates
#    5. Monitor cache hit rate
#    (empty line)
#
# ⚙️  Technical notes (optional): Use ioredis library, cluster mode for production
# 🎚️  Priority (Low/Medium/High/Critical) [Medium]: High
# 📊 Complexity (Low/Medium/High) [Medium]: High
# 🏷️  Labels (comma-separated) [feature]: feature, performance, backend
#
# ✅ Idea created successfully!
# 📁 File: 003-add-redis-caching-layer.md
```

---

## Example 5: Batch Idea Creation

**Scenario:** You're planning a sprint and want to add multiple ideas at once.

```bash
# Create multiple ideas in one go
for idea in \
  "Add user avatar upload" \
  "Implement password reset flow" \
  "Add email verification" \
  "Create admin dashboard"
do
  node scripts/create-idea.js "$idea"
  sleep 2  # Wait for AI
done

# Output:
# ✅ Idea created: 001-add-user-avatar-upload.md
# ✅ Idea created: 002-implement-password-reset-flow.md
# ✅ Idea created: 003-add-email-verification.md
# ✅ Idea created: 004-create-admin-dashboard.md

# Check the backlog
ls ideas/backlog/

# Output:
# 001-add-user-avatar-upload.md
# 002-implement-password-reset-flow.md
# 003-add-email-verification.md
# 004-create-admin-dashboard.md

# System will work through them automatically
# One idea per hour, 4 ideas = 4 hours
```

---

## Example 6: Emergency Fix

**Scenario:** Production bug needs immediate attention.

```bash
# Step 1: Create urgent idea
node scripts/create-idea.js "URGENT: login page returns 500 error"

# Output:
# ✅ Idea created: 005-urgent-fix-login-page-500-error.md
#    Priority: Critical (detected from URGENT)
#    Complexity: Low (likely a quick fix)

# Step 2: Trigger immediately with force_new
gh workflow run autonomous-dev.yml \
  --ref dev \
  -f idea_id=005 \
  -f force_new=true

# Step 3: Watch closely
gh run view --log --follow

# Step 4: Once fixed, test and merge
git checkout dev
git pull
npm test
git checkout main
git merge dev
git push

# Downtime: ~20 minutes (vs hours manually)
```

---

## Example 7: Weekend Automation

**Scenario:** Set up work for the weekend so it's done by Monday.

```bash
# Friday afternoon: Add all weekend tasks
cat << 'EOF' | while read idea; do
  node scripts/create-idea.js "$idea"
  sleep 2
done
Refactor authentication module
Add unit tests for payment service
Update API documentation
Optimize image loading
Fix mobile navigation bugs
EOF

# Output:
# ✅ Created 5 ideas: 006-010

# System works through them over the weekend
# 5 ideas × 1 hour each = 5 hours of autonomous work

# Monday morning: Check results
gh run list --limit 10
git log dev --oneline --since="Friday"

# Output:
# 15 commits over the weekend
# All 5 ideas completed
# PRs created and ready for review
```

---

## Example 8: Continuous Improvement Loop

**Scenario:** Ongoing development with regular idea additions.

```bash
# Week 1: Initial features
node scripts/create-idea.js "Build user authentication"
node scripts/create-idea.js "Create product catalog"
node scripts/create-idea.js "Implement shopping cart"

# Week 2: Refinements (based on Week 1 results)
node scripts/create-idea.js "Add password strength requirements"
node scripts/create-idea.js "Improve product search performance"
node scripts/create-idea.js "Add cart persistence"

# Week 3: New features (building on Week 2)
node scripts/create-idea.js "Implement payment gateway"
node scripts/create-idea.js "Add order history"
node scripts/create-idea.js "Create email notifications"

# System continuously works through the backlog
# You review and add new ideas based on progress
# Continuous autonomous development!
```

---

## Example 9: Testing Failover

**Scenario:** Verify the system handles errors gracefully.

```bash
# Simulate primary model failure
FORCE_PRIMARY_FAIL=true node scripts/orchestrator-with-failover.js

# Output:
# 🔄 [FAILOVER] Attempting coder with 3 fallback models
#    Try #1: opencode/codellama-7b (fast, good)
#    ❌ Failed: Simulated failure
#    Try #2: opencode/codellama-13b (medium, very-good)
#    ✅ Success with opencode/codellama-13b
#
# ⚠️ Circuit breaker MONITORING for opencode/codellama-7b (1/5)
#
# ✅ Milestone completed using fallback model

# Simulate all models failing
FORCE_ALL_MODELS_FAIL=true node scripts/orchestrator-with-failover.js

# Output:
# 🔄 [FAILOVER] Attempting coder with 3 fallback models
#    Try #1: Failed
#    Try #2: Failed
#    Try #3: Failed
#    ❌ All 3 models failed
#
# 🔄 [GRACEFUL DEGRADATION] Attempting fallback strategies...
#    📋 Using template-based planning...
#    ✅ Created template plan with 2 milestones
#
# ⚠️ Running in degraded mode
#    Quality may be lower than normal
#    Manual review recommended
```

---

## Example 10: From Zero to Production

**Complete journey from empty repo to deployed app.**

```bash
# Day 1: Bootstrap with first feature
node scripts/bootstrap.js "Create a task management app"

# System creates:
# - Initial project structure
# - Basic task CRUD operations
# - Simple UI

# Day 2: Add more features
node scripts/create-idea.js "Add user accounts"
node scripts/create-idea.js "Add task categories"
node scripts/create-idea.js "Add due dates and reminders"

# Day 3: Polish
node scripts/create-idea.js "Add dark mode"
node scripts/create-idea.js "Make responsive"
node scripts/create-idea.js "Add loading states"

# Day 4: Testing & docs
node scripts/create-idea.js "Add E2E tests"
node scripts/create-idea.js "Write API documentation"
node scripts/create-idea.js "Add deployment instructions"

# Day 5: Review and deploy
git checkout dev
git log --oneline  # Review all changes
npm test          # Run tests
git checkout main
git merge dev
git push

# Deploy to production
npm run deploy

# Result: Full app in 5 days with minimal manual coding
```

---

## Key Takeaways

1. **Bootstrap** - One command to set up everything
2. **Quick Ideas** - Just describe what you want, AI handles details
3. **Vibe Mode** - Ultra-casual descriptions work perfectly
4. **Batch Creation** - Add multiple ideas at once
5. **Immediate Trigger** - Don't wait for hourly run
6. **Automatic Resume** - Never lose progress
7. **Failover** - Handles errors gracefully
8. **Track Everything** - GitHub Issues + commit history

---

## 🎯 Best Practices

1. **Start Small** - Test with simple ideas first
2. **Be Specific** - Better descriptions = better results
3. **Review Dev Branch** - Check commits before merging to main
4. **Monitor Issues** - Respond when system needs input
5. **Trust the System** - It handles most edge cases
6. **Add Context** - More context = better implementation
7. **Use Priorities** - Mark urgent items for faster attention

---

## 📊 Success Metrics

| Metric | Without System | With System | Improvement |
|--------|---------------|-------------|-------------|
| Time to first code | 2 hours | 10 minutes | **92% faster** |
| Ideas to implementation | 1 day | 1 hour | **96% faster** |
| Manual coding time | 8 hours | 1 hour review | **87% reduction** |
| Context switching | High | Low | **Autonomous** |
| Weekend productivity | 0 | 5 features | **∞% increase** |

---

**Try these examples yourself!**

Start with Example 1 (bootstrap), then try Examples 2-3 to add your own ideas.

Happy autonomous coding! 🚀
