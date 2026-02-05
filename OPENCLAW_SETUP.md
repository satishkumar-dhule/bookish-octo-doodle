# 🦅 OpenClaw Setup Guide

Complete guide for using OpenClaw CLI with OpenCode models in the autonomous development system.

---

## 🎯 What is OpenClaw?

**OpenClaw** is a modern CLI tool for running AI agents with:
- Unified interface for multiple AI providers
- Built-in JSON formatting
- Automatic retry logic
- Better error handling
- Rate limiting support

**OpenCode Models** are free, high-quality AI models for coding:
- No API key needed (free tier)
- Good quality for development tasks
- Fast response times
- Generous rate limits

**Together**: OpenClaw accesses OpenCode's models seamlessly!

---

## ⚡ Installation

### Method 1: npm (Recommended)
```bash
npm install -g openclaw
openclaw --version
```

### Method 2: curl (if available)
```bash
curl -sSL https://openclaw.dev/install.sh | bash
```

### Method 3: yarn
```bash
yarn global add openclaw
```

### Verify Installation
```bash
openclaw --version
# Should output: openclaw v1.x.x
```

---

## 🔧 Configuration

### Basic Setup
```bash
# Set default model
openclaw config set default-model opencode/gpt-5-nano

# Set output format
openclaw config set output-format json

# View config
openclaw config list
```

### Advanced Configuration
```bash
# Set rate limits
openclaw config set rate-limit 60

# Set timeout
openclaw config set timeout 300000

# Set retry attempts
openclaw config set max-retries 3
```

---

## 🎨 Available OpenCode Models

### 1. **opencode/gpt-5-nano**
- **Use**: Planning, review, general tasks
- **Speed**: ⚡⚡⚡ (< 2 seconds)
- **Quality**: ⭐⭐⭐ (Good)
- **Context**: 8K tokens
- **Cost**: Free

```bash
openclaw run --model opencode/gpt-5-nano "Create a plan"
```

### 2. **opencode/codellama-7b**
- **Use**: Code generation, refactoring
- **Speed**: ⚡⚡ (2-4 seconds)
- **Quality**: ⭐⭐⭐⭐ (Very good)
- **Context**: 16K tokens
- **Cost**: Free

```bash
openclaw run --model opencode/codellama-7b "Write a function"
```

### 3. **opencode/codellama-13b** (Optional)
- **Use**: Complex code, algorithms
- **Speed**: ⚡ (4-8 seconds)
- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Context**: 16K tokens
- **Cost**: Free

```bash
openclaw run --model opencode/codellama-13b "Optimize this code"
```

### 4. **opencode/mixtral-8x7b** (Optional)
- **Use**: Complex reasoning, architecture
- **Speed**: ⚡ (5-10 seconds)
- **Quality**: ⭐⭐⭐⭐⭐ (Excellent)
- **Context**: 32K tokens
- **Cost**: Free

```bash
openclaw run --model opencode/mixtral-8x7b "Design a system"
```

---

## 📝 Usage Examples

### Simple Code Generation
```bash
openclaw run \
  --model opencode/codellama-7b \
  --format json \
  "Create a TypeScript function that calculates factorial"
```

**Output:**
```json
{
  "code": "function factorial(n: number): number {\n  if (n <= 1) return 1;\n  return n * factorial(n - 1);\n}",
  "explanation": "Recursive factorial function with TypeScript types"
}
```

### Planning Task
```bash
openclaw run \
  --model opencode/gpt-5-nano \
  --format json \
  "Plan implementation of user authentication"
```

**Output:**
```json
{
  "milestones": [
    "Create user model and database schema",
    "Implement registration endpoint",
    "Add login with JWT",
    "Add password hashing",
    "Create protected routes middleware"
  ],
  "complexity": "medium",
  "estimated_time": "4 hours"
}
```

### Code Review
```bash
openclaw run \
  --model opencode/gpt-5-nano \
  --format json \
  "Review this code: $(cat server.js)"
```

**Output:**
```json
{
  "issues": [
    {
      "severity": "high",
      "line": 42,
      "issue": "SQL injection vulnerability",
      "fix": "Use parameterized queries"
    }
  ],
  "quality_score": 75,
  "approved": false
}
```

---

## 🔄 Integration with Orchestrator

### How the Orchestrator Uses OpenClaw

**File**: `scripts/orchestrator-langgraph.js`

```javascript
async function runOpenClawAgent(prompt, options = {}) {
  const model = options.model || 'opencode/gpt-5-nano';
  const timeout = options.timeout || 300000;

  return new Promise((resolve, reject) => {
    const proc = spawn('openclaw', [
      'run',
      '--model', model,
      '--format', 'json',
      prompt
    ], { timeout });

    // Handle output...
  });
}
```

### Agent Execution Flow

1. **Orchestrator** calls `runOpenClawAgent()`
2. **Spawns** openclaw process
3. **OpenClaw** connects to OpenCode API
4. **OpenCode** generates response
5. **OpenClaw** formats as JSON
6. **Orchestrator** parses and applies

---

## 🎯 Environment Variables

### Set in GitHub Actions
```yaml
env:
  MODEL: opencode/gpt-5-nano
  OPENCLAW_TIMEOUT: 300000
  OPENCLAW_MAX_RETRIES: 3
```

### Set Locally
```bash
export MODEL=opencode/codellama-7b
export OPENCLAW_TIMEOUT=300000
export OPENCLAW_API_KEY=your_key  # If needed
```

### In package.json
```json
{
  "scripts": {
    "start": "MODEL=opencode/gpt-5-nano node scripts/orchestrator-langgraph.js"
  }
}
```

---

## 🚨 Error Handling

### Common Errors & Solutions

#### 1. "openclaw: command not found"
```bash
# Solution
npm install -g openclaw
export PATH="$PATH:$HOME/.openclaw/bin"
```

#### 2. "Model not accessible: opencode/gpt-5-nano"
```bash
# Test model access
openclaw run --model opencode/gpt-5-nano "test"

# If fails, check available models
openclaw models list

# Or use different provider syntax
openclaw run --provider opencode --model gpt-5-nano "test"
```

#### 3. "Rate limit exceeded"
```bash
# In config/models.json, add delay
{
  "rate_limits": {
    "requests_per_minute": 50,
    "delayBetweenRequestsMs": 2000
  }
}
```

#### 4. "Timeout error"
```bash
# Increase timeout
openclaw run \
  --model opencode/codellama-7b \
  --timeout 600000 \
  "Complex task..."
```

#### 5. "JSON parse error"
```bash
# Ensure JSON format
openclaw run \
  --model opencode/gpt-5-nano \
  --format json \
  --strict \
  "Your prompt"
```

---

## 📊 Performance Tuning

### Faster Execution
```json
{
  "models": {
    "planner": { "model": "opencode/gpt-5-nano" },     // Fastest
    "coder": { "model": "opencode/codellama-7b" },     // Fast
    "reviewer": { "model": "opencode/gpt-5-nano" }     // Fastest
  }
}
```

### Better Quality
```json
{
  "models": {
    "planner": { "model": "opencode/mixtral-8x7b" },   // Best
    "coder": { "model": "opencode/codellama-13b" },    // Better
    "reviewer": { "model": "opencode/mixtral-8x7b" }   // Best
  }
}
```

### Balanced (Recommended)
```json
{
  "models": {
    "planner": { "model": "opencode/gpt-5-nano" },     // Fast for planning
    "coder": { "model": "opencode/codellama-7b" },     // Good code quality
    "reviewer": { "model": "opencode/gpt-5-nano" }     // Fast review
  }
}
```

---

## 🔍 Debugging

### Enable Verbose Logging
```bash
# Set debug mode
export OPENCLAW_DEBUG=true

# Run with verbose output
openclaw run --verbose --model opencode/gpt-5-nano "test"
```

### Check OpenClaw Status
```bash
# Version info
openclaw --version

# Config info
openclaw config list

# Available models
openclaw models list

# Connection test
openclaw test
```

### Test Model Individually
```bash
# Quick test
openclaw run --model opencode/gpt-5-nano "Hello"

# With JSON output
openclaw run --model opencode/codellama-7b --format json "Create hello world"

# With timeout
openclaw run --model opencode/mixtral-8x7b --timeout 60000 "Complex task"
```

---

## 📈 Rate Limits & Quotas

### OpenCode Free Tier
- **Requests per minute**: 60
- **Requests per day**: 1,000
- **Context window**: Up to 32K tokens
- **No credit card required**

### Staying Within Limits
```javascript
// In orchestrator
const delay = 2000; // 2 seconds between requests

await new Promise(resolve => setTimeout(resolve, delay));
await runOpenClawAgent(prompt);
```

### Monitoring Usage
```bash
# Check today's usage
openclaw usage today

# Check this month
openclaw usage month

# Check limits
openclaw limits
```

---

## 🎓 Best Practices

### 1. **Choose Right Model for Task**
```javascript
const modelForTask = {
  planning: 'opencode/gpt-5-nano',      // Fast
  coding: 'opencode/codellama-7b',      // Specialized
  review: 'opencode/gpt-5-nano',        // Fast
  complex: 'opencode/mixtral-8x7b'      // High quality
};
```

### 2. **Add Proper Error Handling**
```javascript
try {
  const result = await runOpenClawAgent(prompt);
} catch (error) {
  if (error.message.includes('rate limit')) {
    // Wait and retry
    await sleep(60000);
    return runOpenClawAgent(prompt);
  }
  throw error;
}
```

### 3. **Use JSON Format**
```javascript
const result = await runOpenClawAgent(prompt, {
  model: 'opencode/gpt-5-nano',
  format: 'json'
});

const parsed = JSON.parse(result);
```

### 4. **Set Reasonable Timeouts**
```javascript
const timeouts = {
  planning: 60000,    // 1 minute
  coding: 300000,     // 5 minutes
  review: 120000      // 2 minutes
};
```

### 5. **Cache Responses**
```javascript
const cache = new Map();

async function cachedAgent(prompt) {
  if (cache.has(prompt)) {
    return cache.get(prompt);
  }

  const result = await runOpenClawAgent(prompt);
  cache.set(prompt, result);
  return result;
}
```

---

## 📚 Additional Resources

### OpenClaw Documentation
- Official docs: `https://openclaw.dev/docs`
- API reference: `https://openclaw.dev/api`
- Examples: `https://openclaw.dev/examples`

### OpenCode Models
- Model cards: `https://opencode.ai/models`
- Pricing: `https://opencode.ai/pricing` (free tier)
- Limits: `https://opencode.ai/limits`

### Community
- GitHub: `https://github.com/openclaw/openclaw`
- Discord: `https://discord.gg/openclaw`
- Forum: `https://forum.openclaw.dev`

---

## ✅ Quick Reference

### Installation
```bash
npm install -g openclaw
```

### Basic Usage
```bash
openclaw run --model opencode/gpt-5-nano "Your prompt"
```

### With JSON
```bash
openclaw run --model opencode/codellama-7b --format json "Code task"
```

### In Orchestrator
```javascript
const result = await runOpenClawAgent(prompt, {
  model: 'opencode/gpt-5-nano',
  timeout: 300000
});
```

### Model Selection
- Fast: `opencode/gpt-5-nano`
- Code: `opencode/codellama-7b`
- Best: `opencode/mixtral-8x7b`

---

**You're all set to use OpenClaw + OpenCode models!** 🚀
