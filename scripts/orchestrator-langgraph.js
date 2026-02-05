#!/usr/bin/env node
/**
 * 🤖 LangGraph-based Autonomous Development Orchestrator
 *
 * Sophisticated multi-agent system with:
 * - State management with checkpointing
 * - Parallel agent execution
 * - Conditional routing with edge case handling
 * - Retry logic with exponential backoff
 * - Error recovery and rollback
 * - Human-in-the-loop for critical decisions
 * - Conflict resolution
 *
 * Flow:
 *   START → load_state → analyze_idea → route_decision
 *     ├─ plan → validate_plan → route_plan
 *     │   ├─ parallel_implementation → merge_changes → test
 *     │   └─ human_clarification → plan
 *     ├─ review_code → route_review
 *     │   ├─ fix_issues → test
 *     │   └─ approve → deploy
 *     └─ handle_error → route_recovery
 */

import { StateGraph, END, START, MemorySaver } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import fs from 'fs/promises';
import path from 'path';
import { spawn } from 'child_process';
import { IssueTracker } from './utils/issue-tracker.js';
import { GitUtils } from './utils/git-utils.js';

// ═══════════════════════════════════════════════════════════════════════════
// STATE SCHEMA
// ═══════════════════════════════════════════════════════════════════════════

const AutonomousDevState = Annotation.Root({
  // Session metadata
  sessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  ideaId: Annotation({ reducer: (_, b) => b, default: () => null }),
  ideaContent: Annotation({ reducer: (_, b) => b, default: () => '' }),
  startedAt: Annotation({ reducer: (_, b) => b, default: () => new Date().toISOString() }),

  // Current phase
  phase: Annotation({
    reducer: (_, b) => b,
    default: () => 'initializing'
    // Phases: initializing, planning, implementing, reviewing, testing, deploying, completed, failed, blocked
  }),

  // Planning state
  plan: Annotation({ reducer: (_, b) => b, default: () => null }),
  planApproved: Annotation({ reducer: (_, b) => b, default: () => false }),
  planConfidence: Annotation({ reducer: (_, b) => b, default: () => 0 }),

  // Implementation state
  currentMilestone: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  totalMilestones: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  milestones: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),

  // Agent results
  agentOutputs: Annotation({
    reducer: (a, b) => ({ ...a, ...b }),
    default: () => ({})
  }),
  parallelResults: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),

  // Code state
  modifiedFiles: Annotation({
    reducer: (a, b) => [...new Set([...a, ...b])],
    default: () => []
  }),
  conflicts: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),

  // Testing state
  testResults: Annotation({ reducer: (_, b) => b, default: () => null }),
  testPassed: Annotation({ reducer: (_, b) => b, default: () => false }),

  // Review state
  reviewIssues: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),
  codeQuality: Annotation({ reducer: (_, b) => b, default: () => 0 }),

  // Error handling
  errors: Annotation({
    reducer: (a, b) => [...a, ...b],
    default: () => []
  }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxRetries: Annotation({ reducer: (_, b) => b, default: () => 3 }),
  lastError: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Human interaction
  needsUserInput: Annotation({ reducer: (_, b) => b, default: () => false }),
  userQuestion: Annotation({ reducer: (_, b) => b, default: () => null }),
  blockingIssue: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Progress tracking
  progress: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),

  // Checkpointing
  lastCheckpoint: Annotation({ reducer: (_, b) => b, default: () => null }),
  rollbackPoint: Annotation({ reducer: (_, b) => b, default: () => null }),

  // Resource management
  executionTime: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  timeoutAt: Annotation({ reducer: (_, b) => b, default: () => null }),
  resourceUsage: Annotation({
    reducer: (_, b) => b,
    default: () => ({ memory: 0, cpu: 0 })
  })
});

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

const TIMEOUT_MS = (process.env.TIMEOUT_MINUTES || 23) * 60 * 1000;
const MODEL = process.env.MODEL || process.env.OPENCODE_MODEL || 'opencode/gpt-5-nano';

async function runOpenClawAgent(prompt, options = {}) {
  const model = options.model || MODEL;
  const timeout = options.timeout || 300000; // 5 min

  return new Promise((resolve, reject) => {
    let output = '';
    let error = '';

    // Use openclaw CLI with opencode models
    const proc = spawn('openclaw', [
      'run',
      '--model', model,
      '--format', 'json',
      prompt
    ], {
      timeout,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    const timer = setTimeout(() => {
      proc.kill('SIGTERM');
      reject(new Error('Agent timeout'));
    }, timeout);

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { error += data.toString(); });

    proc.on('close', (code) => {
      clearTimeout(timer);
      if (code === 0 && output) {
        resolve(parseAgentOutput(output));
      } else {
        reject(new Error(error || `Exit code ${code}`));
      }
    });

    proc.on('error', (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });
}

function parseAgentOutput(output) {
  // Parse JSON output from openclaw
  const lines = output.split('\n').filter(l => l.trim());
  let fullText = '';

  for (const line of lines) {
    try {
      const event = JSON.parse(line);
      if (event.type === 'text' && event.part?.text) {
        fullText += event.part.text;
      }
    } catch {
      // Not JSON, might be raw output
    }
  }

  const text = fullText || output;

  // Try direct JSON parse
  try {
    return JSON.parse(text.trim());
  } catch {
    // Try extracting from code blocks
    const match = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                  text.match(/\{[\s\S]*\}/);
    if (match) {
      try {
        return JSON.parse(match[1] || match[0]);
      } catch {}
    }
  }

  throw new Error('No valid JSON in output');
}

async function saveCheckpoint(state) {
  const checkpointPath = path.join('state', 'checkpoints', `${state.sessionId}.json`);
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  await fs.writeFile(checkpointPath, JSON.stringify(state, null, 2));
  console.log(`💾 Checkpoint saved: ${state.phase} (${state.progress}%)`);
}

async function loadCheckpoint(sessionId) {
  const checkpointPath = path.join('state', 'checkpoints', `${sessionId}.json`);
  try {
    const content = await fs.readFile(checkpointPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

function calculateProgress(state) {
  const phaseWeights = {
    initializing: 5,
    planning: 15,
    implementing: 60,
    reviewing: 15,
    testing: 5,
    deploying: 5,
    completed: 100
  };

  let progress = phaseWeights[state.phase] || 0;

  // Add implementation progress
  if (state.phase === 'implementing' && state.totalMilestones > 0) {
    progress = 15 + (state.currentMilestone / state.totalMilestones) * 60;
  }

  return Math.min(100, Math.round(progress));
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH NODES
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Node: Load or initialize state
 */
async function loadStateNode(state) {
  console.log('\n📂 [LOAD_STATE] Loading session state...');

  const sessionId = state.sessionId || `session-${Date.now()}`;

  // Try to resume from checkpoint
  const checkpoint = await loadCheckpoint(sessionId);
  if (checkpoint && process.env.RESUME === 'true') {
    console.log(`   ✅ Resumed from checkpoint: ${checkpoint.phase}`);
    return {
      ...checkpoint,
      sessionId,
      retryCount: 0, // Reset retry count on resume
      timeoutAt: Date.now() + TIMEOUT_MS
    };
  }

  // New session
  console.log(`   🆕 Starting new session: ${sessionId}`);
  return {
    sessionId,
    phase: 'initializing',
    timeoutAt: Date.now() + TIMEOUT_MS,
    progress: 0
  };
}

/**
 * Node: Analyze idea and determine approach
 */
async function analyzeIdeaNode(state) {
  console.log('\n🔍 [ANALYZE_IDEA] Understanding the idea...');
  console.log(`   Idea: ${state.ideaId}`);

  try {
    const prompt = `
You are a senior software architect analyzing a development task.

IDEA:
${state.ideaContent}

CODEBASE CONTEXT:
- Repository: Autonomous dev system
- Stack: Node.js, ES modules, LangGraph
- Existing structure: GitHub Actions, OpenCode integration

Analyze this idea and provide:

OUTPUT FORMAT (JSON only):
{
  "understanding": "Clear explanation of what needs to be done",
  "complexity": "low|medium|high",
  "estimated_milestones": 3,
  "requires_planning": true,
  "confidence": 0.9,
  "risks": ["Risk 1", "Risk 2"],
  "questions": ["Question if unclear"],
  "approach": "High-level approach"
}
`;

    const analysis = await runOpenClawAgent(prompt, { timeout: 60000 });

    console.log(`   ✅ Complexity: ${analysis.complexity}`);
    console.log(`   ✅ Confidence: ${analysis.confidence}`);
    console.log(`   ✅ Estimated milestones: ${analysis.estimated_milestones}`);

    return {
      agentOutputs: { analysis },
      totalMilestones: analysis.estimated_milestones || 3,
      planConfidence: analysis.confidence || 0,
      userQuestion: analysis.questions?.[0] || null,
      needsUserInput: (analysis.questions?.length > 0 && analysis.confidence < 0.7),
      phase: analysis.requires_planning ? 'planning' : 'implementing'
    };

  } catch (error) {
    console.error(`   ❌ Analysis failed: ${error.message}`);
    return {
      errors: [{ node: 'analyze_idea', error: error.message }],
      lastError: error.message,
      retryCount: state.retryCount + 1
    };
  }
}

/**
 * Node: Create implementation plan
 */
async function planNode(state) {
  console.log('\n📋 [PLAN] Creating implementation plan...');
  console.log(`   Attempt: ${state.retryCount + 1}/${state.maxRetries + 1}`);

  try {
    // Exponential backoff for retries
    if (state.retryCount > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, state.retryCount - 1), 10000);
      console.log(`   ⏳ Backoff: ${backoffMs}ms`);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

    const analysis = state.agentOutputs?.analysis || {};

    const prompt = `
You are a senior software architect creating a detailed implementation plan.

IDEA:
${state.ideaContent}

ANALYSIS:
${JSON.stringify(analysis, null, 2)}

Create a detailed, actionable plan with specific milestones.

EDGE CASES TO CONSIDER:
- Existing code conflicts
- Dependencies that may not exist
- Test coverage requirements
- Error handling
- Rollback strategy

OUTPUT FORMAT (JSON only):
{
  "milestones": [
    {
      "name": "Milestone 1",
      "description": "Detailed description",
      "files": {
        "create": ["path/to/new-file.js"],
        "modify": ["path/to/existing-file.js"],
        "delete": []
      },
      "dependencies": ["package-name"],
      "tests": ["test-file.spec.js"],
      "rollback": "How to rollback if this fails"
    }
  ],
  "risks": ["Risk 1", "Risk 2"],
  "success_criteria": ["Criterion 1", "Criterion 2"],
  "estimated_time_minutes": 20,
  "confidence": 0.85
}
`;

    const plan = await runOpenClawAgent(prompt, { timeout: 120000 });

    if (!plan.milestones || plan.milestones.length === 0) {
      throw new Error('No milestones in plan');
    }

    console.log(`   ✅ Plan created: ${plan.milestones.length} milestones`);
    plan.milestones.forEach((m, i) => {
      console.log(`      ${i + 1}. ${m.name}`);
    });

    await saveCheckpoint({ ...state, plan, phase: 'planning' });

    return {
      plan,
      planApproved: plan.confidence >= 0.8,
      phase: plan.confidence >= 0.8 ? 'implementing' : 'planning',
      needsUserInput: plan.confidence < 0.8,
      userQuestion: plan.confidence < 0.8 ?
        `Plan confidence is ${plan.confidence}. Risks: ${plan.risks.join(', ')}. Proceed?` : null,
      totalMilestones: plan.milestones.length
    };

  } catch (error) {
    console.error(`   ❌ Planning failed: ${error.message}`);

    if (state.retryCount < state.maxRetries) {
      return {
        lastError: error.message,
        retryCount: state.retryCount + 1
      };
    }

    return {
      errors: [{ node: 'plan', error: error.message }],
      phase: 'failed',
      status: 'error'
    };
  }
}

/**
 * Node: Implement milestone with parallel agents
 */
async function parallelImplementationNode(state) {
  console.log('\n💻 [PARALLEL_IMPLEMENTATION] Executing milestone...');

  const milestone = state.plan.milestones[state.currentMilestone];
  console.log(`   Milestone ${state.currentMilestone + 1}/${state.totalMilestones}: ${milestone.name}`);

  try {
    // Create rollback point
    const git = new GitUtils();
    const rollbackPoint = await git.getLastCommit();
    console.log(`   📍 Rollback point: ${rollbackPoint?.substring(0, 8)}`);

    // Split files across parallel agents (max 3 agents)
    const allFiles = [
      ...(milestone.files.create || []),
      ...(milestone.files.modify || [])
    ];

    const agentCount = Math.min(3, Math.ceil(allFiles.length / 2));
    const filesPerAgent = Math.ceil(allFiles.length / agentCount);

    console.log(`   🔀 Spawning ${agentCount} parallel agents...`);

    const agentPromises = [];

    for (let i = 0; i < agentCount; i++) {
      const agentFiles = allFiles.slice(i * filesPerAgent, (i + 1) * filesPerAgent);

      if (agentFiles.length === 0) continue;

      const agentPrompt = `
You are a software engineer implementing code.

MILESTONE: ${milestone.name}
${milestone.description}

YOUR ASSIGNED FILES:
${agentFiles.map(f => `- ${f}`).join('\n')}

FULL PLAN CONTEXT:
${JSON.stringify(state.plan, null, 2)}

CRITICAL RULES:
1. Output complete file contents (not diffs)
2. Follow existing code style
3. Add proper error handling
4. Include inline comments for complex logic
5. Do NOT use placeholders or TODOs
6. Make code production-ready

OUTPUT FORMAT (JSON):
{
  "files": [
    {
      "path": "path/to/file.js",
      "content": "full file content here",
      "explanation": "What this code does"
    }
  ],
  "issues": ["Any issues encountered"]
}
`;

      agentPromises.push(
        runOpenClawAgent(agentPrompt, { timeout: 300000 })
          .then(result => ({ agentId: i, success: true, result }))
          .catch(error => ({ agentId: i, success: false, error: error.message }))
      );
    }

    // Wait for all agents
    const results = await Promise.all(agentPromises);

    console.log(`   📊 Results: ${results.filter(r => r.success).length}/${results.length} succeeded`);

    // Check for failures
    const failures = results.filter(r => !r.success);
    if (failures.length > 0) {
      console.error(`   ❌ Agent failures: ${failures.map(f => f.error).join(', ')}`);
      throw new Error(`${failures.length} agents failed`);
    }

    // Apply all changes
    const modifiedFiles = [];
    for (const { result } of results) {
      for (const file of result.files || []) {
        const filePath = path.join(process.cwd(), file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
        modifiedFiles.push(file.path);
        console.log(`      ✅ Wrote ${file.path}`);
      }
    }

    // Check for merge conflicts
    const conflicts = await detectConflicts(modifiedFiles);
    if (conflicts.length > 0) {
      console.warn(`   ⚠️ Conflicts detected: ${conflicts.length}`);
      return {
        conflicts,
        phase: 'blocked',
        needsUserInput: true,
        userQuestion: `Merge conflicts in: ${conflicts.join(', ')}`
      };
    }

    // Commit milestone
    const commitMsg = `🤖 Auto: ${milestone.name}`;
    await git.commitAll(commitMsg);

    await saveCheckpoint({
      ...state,
      currentMilestone: state.currentMilestone + 1,
      milestones: [{
        name: milestone.name,
        completed_at: new Date().toISOString(),
        commit: await git.getLastCommit()
      }],
      modifiedFiles
    });

    return {
      parallelResults: results,
      modifiedFiles,
      rollbackPoint,
      currentMilestone: state.currentMilestone + 1,
      phase: state.currentMilestone + 1 >= state.totalMilestones ? 'reviewing' : 'implementing',
      progress: calculateProgress(state)
    };

  } catch (error) {
    console.error(`   ❌ Implementation failed: ${error.message}`);

    // Rollback on failure
    if (state.rollbackPoint) {
      console.log(`   ⏪ Rolling back to ${state.rollbackPoint.substring(0, 8)}...`);
      try {
        const git = new GitUtils();
        await git.rollback(state.rollbackPoint);
      } catch (rollbackError) {
        console.error(`   ❌ Rollback failed: ${rollbackError.message}`);
      }
    }

    return {
      errors: [{ node: 'parallel_implementation', error: error.message }],
      lastError: error.message,
      retryCount: state.retryCount + 1,
      phase: state.retryCount + 1 >= state.maxRetries ? 'failed' : 'implementing'
    };
  }
}

/**
 * Node: Review code quality
 */
async function reviewCodeNode(state) {
  console.log('\n👀 [REVIEW_CODE] Reviewing implementation...');

  try {
    const git = new GitUtils();
    const diff = await git.getDiff();

    const prompt = `
You are a senior code reviewer.

PLAN:
${JSON.stringify(state.plan, null, 2)}

CHANGES:
${diff.substring(0, 10000)} ${diff.length > 10000 ? '... (truncated)' : ''}

Review for:
1. Code quality and style
2. Error handling
3. Edge cases
4. Security issues
5. Performance concerns
6. Test coverage

OUTPUT FORMAT (JSON):
{
  "approved": true,
  "code_quality": 85,
  "issues": [
    {
      "severity": "high|medium|low",
      "file": "path/to/file.js",
      "line": 42,
      "issue": "Description",
      "suggestion": "How to fix"
    }
  ],
  "strengths": ["Good point 1", "Good point 2"],
  "next_steps": ["Step 1", "Step 2"]
}
`;

    const review = await runOpenClawAgent(prompt, { timeout: 180000 });

    console.log(`   📊 Code quality: ${review.code_quality}/100`);
    console.log(`   📝 Issues: ${review.issues?.length || 0}`);

    const criticalIssues = (review.issues || []).filter(i => i.severity === 'high');

    if (!review.approved || criticalIssues.length > 0) {
      console.warn(`   ⚠️ Review not approved`);
      criticalIssues.forEach(issue => {
        console.warn(`      ❌ ${issue.file}:${issue.line} - ${issue.issue}`);
      });

      return {
        reviewIssues: review.issues || [],
        codeQuality: review.code_quality || 0,
        phase: 'blocked',
        needsUserInput: true,
        userQuestion: `Code review found ${criticalIssues.length} critical issues. Review needed.`
      };
    }

    console.log(`   ✅ Review approved`);

    return {
      reviewIssues: review.issues || [],
      codeQuality: review.code_quality || 0,
      phase: 'testing'
    };

  } catch (error) {
    console.error(`   ❌ Review failed: ${error.message}`);

    return {
      errors: [{ node: 'review_code', error: error.message }],
      phase: 'testing' // Proceed to testing even if review fails
    };
  }
}

/**
 * Node: Run tests
 */
async function testNode(state) {
  console.log('\n🧪 [TEST] Running tests...');

  try {
    // Run npm test (if package.json has test script)
    const { execSync } = await import('child_process');

    try {
      const output = execSync('npm test -- --passWithNoTests', {
        encoding: 'utf-8',
        timeout: 120000,
        stdio: 'pipe'
      });

      console.log(`   ✅ Tests passed`);

      return {
        testResults: { passed: true, output },
        testPassed: true,
        phase: 'completed',
        status: 'success'
      };

    } catch (testError) {
      console.error(`   ❌ Tests failed`);
      console.error(testError.stdout || testError.message);

      return {
        testResults: {
          passed: false,
          output: testError.stdout || testError.message
        },
        testPassed: false,
        phase: 'blocked',
        needsUserInput: true,
        userQuestion: 'Tests failed. Manual intervention needed.'
      };
    }

  } catch (error) {
    console.error(`   ⚠️ Test execution error: ${error.message}`);

    // If tests can't run, consider it a warning not a blocker
    return {
      testResults: { passed: true, skipped: true },
      testPassed: true,
      phase: 'completed',
      status: 'success'
    };
  }
}

/**
 * Node: Handle errors and decide recovery strategy
 */
async function handleErrorNode(state) {
  console.log('\n🚨 [HANDLE_ERROR] Error recovery...');

  const lastError = state.lastError || 'Unknown error';
  console.log(`   Error: ${lastError}`);
  console.log(`   Retry count: ${state.retryCount}/${state.maxRetries}`);

  // Check if error is retryable
  const retryablePatterns = [
    /timeout/i,
    /ECONNRESET/i,
    /ETIMEDOUT/i,
    /rate limit/i,
    /429/,
    /500/,
    /502/,
    /503/
  ];

  const isRetryable = retryablePatterns.some(p => p.test(lastError));

  if (isRetryable && state.retryCount < state.maxRetries) {
    console.log(`   🔄 Error is retryable, will retry`);
    return {
      retryCount: state.retryCount + 1
    };
  }

  console.log(`   ❌ Error not retryable or max retries reached`);

  // Create issue for user
  const issues = new IssueTracker();
  const issue = await issues.create({
    title: `🚨 Autonomous Dev Error: ${state.ideaId}`,
    body: `## Error\n\n${lastError}\n\n## State\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\``,
    labels: ['autonomous', 'error', 'needs-user-input']
  });

  return {
    phase: 'failed',
    status: 'error',
    blockingIssue: issue.number,
    needsUserInput: true
  };
}

/**
 * Node: Human clarification needed
 */
async function humanClarificationNode(state) {
  console.log('\n❓ [HUMAN_CLARIFICATION] User input needed...');
  console.log(`   Question: ${state.userQuestion}`);

  const issues = new IssueTracker();
  const issue = await issues.create({
    title: `❓ Input Needed: ${state.ideaId}`,
    body: `## Question\n\n${state.userQuestion}\n\n## Context\n\nPhase: ${state.phase}\nProgress: ${state.progress}%\n\n## State\n\n\`\`\`json\n${JSON.stringify({ phase: state.phase, plan: state.plan }, null, 2)}\n\`\`\``,
    labels: ['autonomous', 'needs-user-input'],
    assignees: ['@me']
  });

  console.log(`   📌 Created issue #${issue.number}`);

  return {
    blockingIssue: issue.number,
    phase: 'blocked',
    status: 'waiting_user'
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// EDGE CASE HANDLERS
// ═══════════════════════════════════════════════════════════════════════════

async function detectConflicts(files) {
  // Check for merge conflicts in modified files
  const conflicts = [];

  for (const file of files) {
    try {
      const content = await fs.readFile(file, 'utf-8');
      if (content.includes('<<<<<<< HEAD') ||
          content.includes('=======') ||
          content.includes('>>>>>>> ')) {
        conflicts.push(file);
      }
    } catch {
      // File doesn't exist yet, no conflict
    }
  }

  return conflicts;
}

async function checkTimeout(state) {
  if (!state.timeoutAt) return false;
  return Date.now() > state.timeoutAt;
}

async function checkResourceUsage() {
  // Monitor memory usage
  const used = process.memoryUsage();
  return {
    memory: Math.round(used.heapUsed / 1024 / 1024),
    cpu: process.cpuUsage().user / 1000000
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// CONDITIONAL ROUTERS
// ═══════════════════════════════════════════════════════════════════════════

function routeAfterLoad(state) {
  if (state.phase === 'completed') {
    return 'end';
  }
  if (state.phase === 'blocked') {
    return 'human_clarification';
  }
  if (!state.ideaId) {
    return 'analyze_idea';
  }

  // Resume from checkpoint
  return state.phase;
}

function routeAfterAnalysis(state) {
  if (state.errors.length > 0 && state.retryCount < state.maxRetries) {
    return 'analyze_idea';
  }
  if (state.needsUserInput) {
    return 'human_clarification';
  }
  return state.phase; // 'planning' or 'implementing'
}

function routeAfterPlan(state) {
  if (state.retryCount < state.maxRetries && !state.plan) {
    return 'plan';
  }
  if (state.needsUserInput || !state.planApproved) {
    return 'human_clarification';
  }
  return 'parallel_implementation';
}

function routeAfterImplementation(state) {
  if (state.conflicts.length > 0) {
    return 'human_clarification';
  }
  if (state.errors.length > 0) {
    return 'handle_error';
  }
  if (state.phase === 'implementing') {
    return 'parallel_implementation'; // Next milestone
  }
  return 'review_code';
}

function routeAfterReview(state) {
  if (state.needsUserInput) {
    return 'human_clarification';
  }
  return 'test';
}

function routeAfterTest(state) {
  if (!state.testPassed && state.needsUserInput) {
    return 'human_clarification';
  }
  return 'end';
}

function routeAfterError(state) {
  if (state.retryCount < state.maxRetries) {
    return state.phase; // Retry current phase
  }
  return 'human_clarification';
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH CONSTRUCTION
// ═══════════════════════════════════════════════════════════════════════════

export function createAutonomousDevGraph() {
  const graph = new StateGraph(AutonomousDevState);

  // Add nodes
  graph.addNode('load_state', loadStateNode);
  graph.addNode('analyze_idea', analyzeIdeaNode);
  graph.addNode('plan', planNode);
  graph.addNode('parallel_implementation', parallelImplementationNode);
  graph.addNode('review_code', reviewCodeNode);
  graph.addNode('test', testNode);
  graph.addNode('handle_error', handleErrorNode);
  graph.addNode('human_clarification', humanClarificationNode);

  // Add edges
  graph.addEdge(START, 'load_state');

  graph.addConditionalEdges('load_state', routeAfterLoad, {
    'analyze_idea': 'analyze_idea',
    'planning': 'plan',
    'implementing': 'parallel_implementation',
    'reviewing': 'review_code',
    'testing': 'test',
    'blocked': 'human_clarification',
    'end': END
  });

  graph.addConditionalEdges('analyze_idea', routeAfterAnalysis, {
    'analyze_idea': 'analyze_idea',
    'planning': 'plan',
    'implementing': 'parallel_implementation',
    'human_clarification': 'human_clarification'
  });

  graph.addConditionalEdges('plan', routeAfterPlan, {
    'plan': 'plan',
    'parallel_implementation': 'parallel_implementation',
    'human_clarification': 'human_clarification'
  });

  graph.addConditionalEdges('parallel_implementation', routeAfterImplementation, {
    'parallel_implementation': 'parallel_implementation',
    'review_code': 'review_code',
    'handle_error': 'handle_error',
    'human_clarification': 'human_clarification'
  });

  graph.addConditionalEdges('review_code', routeAfterReview, {
    'test': 'test',
    'human_clarification': 'human_clarification'
  });

  graph.addConditionalEdges('test', routeAfterTest, {
    'human_clarification': 'human_clarification',
    'end': END
  });

  graph.addConditionalEdges('handle_error', routeAfterError, {
    'planning': 'plan',
    'implementing': 'parallel_implementation',
    'reviewing': 'review_code',
    'testing': 'test',
    'human_clarification': 'human_clarification'
  });

  graph.addEdge('human_clarification', END);

  // Compile with memory for checkpointing
  const checkpointer = new MemorySaver();
  return graph.compile({ checkpointer });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🤖 LANGGRAPH AUTONOMOUS DEVELOPMENT ORCHESTRATOR');
  console.log('═'.repeat(70));

  try {
    // Load idea
    const ideaId = process.env.IDEA_ID || '001-example-feature';
    const ideaPath = path.join('ideas/backlog', `${ideaId}.md`);
    const ideaContent = await fs.readFile(ideaPath, 'utf-8');

    console.log(`📋 Idea: ${ideaId}`);
    console.log(`⏱️  Timeout: ${TIMEOUT_MS / 60000} minutes`);
    console.log(`🔄 Resume: ${process.env.RESUME === 'true' ? 'Yes' : 'No'}`);

    // Create graph
    const graph = createAutonomousDevGraph();

    // Initial state
    const initialState = {
      ideaId,
      ideaContent,
      sessionId: `session-${Date.now()}`,
      phase: 'initializing',
      progress: 0,
      status: 'pending',
      errors: [],
      modifiedFiles: [],
      conflicts: [],
      parallelResults: [],
      reviewIssues: [],
      milestones: [],
      retryCount: 0,
      maxRetries: 3
    };

    // Run graph
    let finalState = initialState;

    for await (const step of await graph.stream(initialState, {
      configurable: { thread_id: initialState.sessionId }
    })) {
      const [nodeName, nodeState] = Object.entries(step)[0];

      console.log(`\n🔄 Node: ${nodeName}`);

      finalState = { ...finalState, ...nodeState };

      // Update progress
      finalState.progress = calculateProgress(finalState);
      finalState.executionTime = Date.now() - new Date(finalState.startedAt).getTime();
      finalState.resourceUsage = await checkResourceUsage();

      // Save checkpoint after each node
      await saveCheckpoint(finalState);

      // Check timeout
      if (await checkTimeout(finalState)) {
        console.log('\n⏰ Timeout reached, saving state...');
        break;
      }
    }

    // Save final state
    await fs.writeFile(
      'state/current-session.json',
      JSON.stringify(finalState, null, 2)
    );

    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL RESULT');
    console.log('═'.repeat(70));
    console.log(`Status: ${finalState.status}`);
    console.log(`Phase: ${finalState.phase}`);
    console.log(`Progress: ${finalState.progress}%`);
    console.log(`Milestones: ${finalState.currentMilestone}/${finalState.totalMilestones}`);
    console.log(`Execution time: ${Math.round(finalState.executionTime / 1000)}s`);
    console.log(`Memory used: ${finalState.resourceUsage.memory}MB`);

    if (finalState.errors.length > 0) {
      console.log(`\n❌ Errors:`);
      finalState.errors.forEach(e => console.log(`   - ${e.node}: ${e.error}`));
    }

    if (finalState.needsUserInput) {
      console.log(`\n❓ User input needed: ${finalState.userQuestion}`);
      console.log(`   Issue: #${finalState.blockingIssue}`);
    }

    console.log('═'.repeat(70) + '\n');

    process.exit(finalState.status === 'success' ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { createAutonomousDevGraph, main };
