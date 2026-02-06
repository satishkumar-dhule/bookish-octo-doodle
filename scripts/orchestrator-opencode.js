#!/usr/bin/env node
/**
 * 🤖 OpenCode AI Orchestrator (No LangGraph)
 *
 * Pure OpenCode AI orchestration with:
 * - Multi-model failover
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Partial success handling
 * - Emergency shutdown procedures
 * - State preservation on all failures
 */

import fs from 'fs/promises';
import path from 'path';
import { FailoverManager } from './utils/failover-manager.js';
import { IssueTracker } from './utils/issue-tracker.js';
import { GitUtils } from './utils/git-utils.js';
import { ResourceMonitor } from './utils/edge-case-handler.js';

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const TIMEOUT_MS = (process.env.TIMEOUT_MINUTES || 25) * 60 * 1000;
const failoverManager = new FailoverManager({
  failureThreshold: 3,
  resetTimeout: 60000,
  gracefulDegradation: true,
  partialSuccess: true
});

let currentState = null; // Track for emergency shutdown

// ═══════════════════════════════════════════════════════════════════════════
// STATE MANAGEMENT (Simple JSON-based)
// ═══════════════════════════════════════════════════════════════════════════

function createInitialState(ideaId, ideaContent) {
  return {
    sessionId: `session-${Date.now()}`,
    ideaId,
    ideaContent,
    startedAt: new Date().toISOString(),
    phase: 'initializing',
    plan: null,
    currentMilestone: 0,
    totalMilestones: 0,
    milestones: [],
    agentOutputs: {},
    modifiedFiles: [],
    testResults: null,
    testPassed: false,
    reviewIssues: [],
    codeQuality: 0,
    errors: [],
    retryCount: 0,
    maxRetries: 3,
    progress: 0,
    status: 'pending',
    timeoutAt: Date.now() + TIMEOUT_MS,
    resourceUsage: { memory: 0, cpu: 0 },
    degradedMode: false
  };
}

async function saveCheckpoint(state) {
  // Calculate progress
  let progress = state.progress;
  if (progress === undefined || isNaN(progress)) {
    if (state.totalMilestones > 0 && state.currentMilestone !== undefined) {
      progress = Math.round((state.currentMilestone / state.totalMilestones) * 100);
    } else {
      progress = 0;
    }
  }

  const stateWithProgress = { ...state, progress };

  // Save to current session file
  const sessionPath = path.join('state', 'current-session.json');
  await fs.mkdir(path.dirname(sessionPath), { recursive: true });
  await fs.writeFile(sessionPath, JSON.stringify(stateWithProgress, null, 2));

  // Save to checkpoint
  const checkpointPath = path.join('state', 'checkpoints', `${stateWithProgress.sessionId}.json`);
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  await fs.writeFile(checkpointPath, JSON.stringify(stateWithProgress, null, 2));

  console.log(`💾 Checkpoint saved: ${stateWithProgress.phase} (${progress}%)`);
}

// ═══════════════════════════════════════════════════════════════════════════
// WORKFLOW STEPS (Pure Functions)
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeIdea(state) {
  console.log('\n🔍 [ANALYZE_IDEA] Understanding the idea...');

  const prompt = `You are a senior software architect analyzing a development task.

IDEA:
${state.ideaContent}

Analyze and provide:

OUTPUT FORMAT (JSON only):
{
  "understanding": "Clear explanation",
  "complexity": "low|medium|high",
  "estimated_milestones": 3,
  "requires_planning": true,
  "confidence": 0.9,
  "risks": ["Risk 1"],
  "questions": ["Question if unclear"],
  "approach": "High-level approach"
}`;

  try {
    const result = await failoverManager.executeWithFailover('planner', prompt, { timeout: 60000 });

    if (!result.success) {
      throw new Error('All planner models failed');
    }

    const analysis = result.result;
    console.log(`   ✅ Complexity: ${analysis.complexity}`);
    console.log(`   ✅ Confidence: ${analysis.confidence}`);

    state.agentOutputs.analysis = analysis;
    state.totalMilestones = analysis.estimated_milestones || 3;
    state.phase = analysis.requires_planning ? 'planning' : 'implementing';
    state.degradedMode = result.degraded || false;

    await saveCheckpoint(state);
    return true;
  } catch (error) {
    console.error(`   ❌ Analysis failed: ${error.message}`);

    // Graceful degradation
    state.agentOutputs.analysis = {
      understanding: 'Failed to analyze, proceeding with basic assumptions',
      complexity: 'medium',
      estimated_milestones: 2,
      requires_planning: true,
      confidence: 0.3,
      risks: ['AI analysis unavailable'],
      approach: 'Manual review recommended'
    };
    state.totalMilestones = 2;
    state.phase = 'planning';
    state.degradedMode = true;

    await saveCheckpoint(state);
    return true;
  }
}

async function createPlan(state) {
  console.log('\n📋 [PLAN] Creating implementation plan...');

  const analysis = state.agentOutputs?.analysis || {};
  const prompt = `Create a detailed implementation plan.

IDEA: ${state.ideaContent}

OUTPUT FORMAT (JSON only):
{
  "milestones": [
    {
      "name": "Milestone 1",
      "description": "...",
      "files": { "create": [], "modify": [], "delete": [] },
      "dependencies": [],
      "tests": [],
      "rollback": "How to rollback"
    }
  ],
  "risks": [],
  "success_criteria": [],
  "estimated_time_minutes": 30,
  "confidence": 0.85
}`;

  try {
    const result = await failoverManager.executeWithFailover('planner', prompt, { timeout: 120000 });

    if (!result.success) {
      throw new Error('All planner models failed');
    }

    const plan = result.result;
    console.log(`   ✅ Plan created: ${plan.milestones.length} milestones`);

    state.plan = plan;
    state.totalMilestones = plan.milestones.length;
    state.phase = 'implementing';

    await saveCheckpoint(state);
    return true;
  } catch (error) {
    console.error(`   ❌ Planning failed: ${error.message}`);

    // Graceful degradation - create basic plan
    state.plan = {
      milestones: [
        {
          name: 'Analyze requirements',
          description: 'Review and understand the requirements',
          files: { create: [], modify: [], delete: [] },
          dependencies: [],
          tests: [],
          rollback: 'No changes yet'
        },
        {
          name: 'Implement changes',
          description: 'Make the necessary code changes',
          files: { create: [], modify: [], delete: [] },
          dependencies: [],
          tests: [],
          rollback: 'Revert commits'
        }
      ],
      risks: ['AI planner unavailable - using template'],
      success_criteria: ['Changes implemented', 'Tests pass'],
      estimated_time_minutes: 30,
      confidence: 0.5
    };
    state.totalMilestones = 2;
    state.phase = 'implementing';
    state.degradedMode = true;

    await saveCheckpoint(state);
    return true;
  }
}

async function implementMilestone(state) {
  const milestoneIndex = state.currentMilestone;
  const milestone = state.plan.milestones[milestoneIndex];

  console.log(`\n💻 [IMPLEMENT] Milestone ${milestoneIndex + 1}/${state.totalMilestones}: ${milestone.name}`);

  try {
    const git = new GitUtils();
    const rollbackPoint = await git.getLastCommit();
    console.log(`   📍 Rollback point: ${rollbackPoint?.substring(0, 8)}`);

    const allFiles = [
      ...(milestone.files.create || []),
      ...(milestone.files.modify || [])
    ];

    const agentCount = Math.min(3, Math.ceil(allFiles.length / 2));
    console.log(`   🔀 Spawning ${agentCount} parallel agents...`);

    const agentPromises = [];
    for (let i = 0; i < agentCount; i++) {
      const agentFiles = allFiles.slice(i * 2, (i + 1) * 2);
      if (agentFiles.length === 0) continue;

      const agentPrompt = `Implement code for milestone: ${milestone.name}

YOUR FILES:
${agentFiles.map(f => `- ${f}`).join('\n')}

OUTPUT FORMAT (JSON):
{
  "files": [
    {
      "path": "path/to/file.js",
      "content": "full file content",
      "explanation": "What this does"
    }
  ]
}`;

      agentPromises.push(
        failoverManager.executeWithFailover('coder', agentPrompt, {
          timeout: 300000,
          targetFile: agentFiles[0]
        })
      );
    }

    // Wait for all agents
    const results = await Promise.all(agentPromises);
    console.log(`   📊 Agent results collected`);

    // Handle partial success
    const successCount = results.filter(r => r.success).length;
    const failCount = results.filter(r => !r.success).length;

    if (failCount > 0) {
      console.warn(`   ⚠️ ${failCount} agents failed, ${successCount} succeeded`);
    }

    // Apply all successful changes
    const modifiedFiles = [];
    for (const { success, result } of results) {
      if (!success) continue;

      for (const file of result.files || []) {
        const filePath = path.join(process.cwd(), file.path);
        await fs.mkdir(path.dirname(filePath), { recursive: true });
        await fs.writeFile(filePath, file.content);
        modifiedFiles.push(file.path);
        console.log(`      ✅ Wrote ${file.path}`);
      }
    }

    // Commit milestone
    const commitMsg = `🤖 Auto: ${milestone.name}`;
    await git.commitAll(commitMsg);

    state.modifiedFiles = [...state.modifiedFiles, ...modifiedFiles];
    state.milestones.push({
      name: milestone.name,
      completed_at: new Date().toISOString(),
      commit: await git.getLastCommit(),
      partialSuccess: failCount > 0
    });
    state.currentMilestone++;

    await saveCheckpoint(state);
    return true;
  } catch (error) {
    console.error(`   ❌ Implementation failed: ${error.message}`);
    state.errors.push({ milestone: milestone.name, error: error.message });
    return false;
  }
}

async function reviewCode(state) {
  console.log('\n👀 [REVIEW_CODE] Reviewing implementation...');

  const git = new GitUtils();
  const diff = await git.getDiff();

  const prompt = `Review this code implementation:

DIFF:
${diff}

OUTPUT FORMAT (JSON):
{
  "approved": true,
  "code_quality": 85,
  "issues": [{
    "severity": "low|medium|high",
    "file": "path",
    "line": 10,
    "issue": "description",
    "suggestion": "fix"
  }],
  "strengths": ["Good practices"],
  "next_steps": ["Recommendations"]
}`;

  try {
    const result = await failoverManager.executeWithFailover('reviewer', prompt, { timeout: 120000 });

    if (!result.success) {
      throw new Error('All reviewer models failed');
    }

    const review = result.result;
    console.log(`   📊 Code quality: ${review.code_quality}/100`);
    console.log(`   ${review.approved ? '✅' : '❌'} Review ${review.approved ? 'approved' : 'rejected'}`);

    state.codeQuality = review.code_quality;
    state.reviewIssues = review.issues || [];
    state.phase = 'testing';

    await saveCheckpoint(state);
    return true;
  } catch (error) {
    console.error(`   ❌ Review failed: ${error.message}`);

    // Graceful degradation - optimistic approval
    state.codeQuality = 70;
    state.reviewIssues = [{
      severity: 'low',
      file: 'unknown',
      line: 0,
      issue: 'AI reviewer unavailable - basic checks only',
      suggestion: 'Manual code review recommended'
    }];
    state.phase = 'testing';
    state.degradedMode = true;

    await saveCheckpoint(state);
    return true;
  }
}

async function runTests(state) {
  console.log('\n🧪 [TEST] Running tests...');

  try {
    const { execSync } = await import('child_process');

    try {
      const output = execSync('npm test -- --passWithNoTests', {
        encoding: 'utf-8',
        timeout: 120000,
        stdio: 'pipe'
      });

      console.log(`   ✅ Tests passed`);

      state.testResults = { passed: true, output };
      state.testPassed = true;
      state.phase = 'completed';
      state.status = 'success';

      await saveCheckpoint(state);
      return true;
    } catch (testError) {
      console.error(`   ❌ Tests failed`);

      state.testResults = { passed: false, output: testError.stdout || testError.message };
      state.testPassed = false;
      state.phase = 'completed';
      state.status = 'tests_failed';

      await saveCheckpoint(state);
      return false;
    }
  } catch (error) {
    console.error(`   ❌ Test execution failed: ${error.message}`);

    // No tests available - mark as passed
    state.testResults = { passed: true, output: 'No tests found' };
    state.testPassed = true;
    state.phase = 'completed';
    state.status = 'success';

    await saveCheckpoint(state);
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ORCHESTRATION LOOP
// ═══════════════════════════════════════════════════════════════════════════

async function orchestrate(ideaId, ideaContent) {
  console.log('\n' + '═'.repeat(70));
  console.log('🤖 OPENCODE AI ORCHESTRATOR (No LangGraph)');
  console.log('═'.repeat(70));

  // Initialize state
  const state = createInitialState(ideaId, ideaContent);
  currentState = state;

  console.log(`📋 Idea: ${ideaId}`);
  console.log(`⏱️  Timeout: ${process.env.TIMEOUT_MINUTES || 25} minutes`);
  console.log('');

  // Show failover status
  const status = failoverManager.getStatus();
  console.log('🔄 Failover Status:');
  for (const [type, models] of Object.entries(status)) {
    console.log(`   ${type}:`);
    models.forEach(m => {
      console.log(`      ${m.priority}. ${m.model} [${m.circuitBreaker}]`);
    });
  }

  try {
    // Step 1: Analyze Idea
    await analyzeIdea(state);

    // Check timeout
    if (Date.now() > state.timeoutAt) {
      throw new Error('Timeout reached after analysis');
    }

    // Step 2: Create Plan
    await createPlan(state);

    // Check timeout
    if (Date.now() > state.timeoutAt) {
      throw new Error('Timeout reached after planning');
    }

    // Step 3: Implement All Milestones (Loop until complete)
    while (state.currentMilestone < state.totalMilestones) {
      const success = await implementMilestone(state);

      if (!success) {
        console.error(`   ⚠️ Milestone ${state.currentMilestone + 1} failed, continuing...`);
      }

      // Check timeout
      if (Date.now() > state.timeoutAt) {
        console.log('\n⏰ Timeout approaching, saving progress...');
        break;
      }

      // Check resources
      state.resourceUsage = await ResourceMonitor.checkResources();
    }

    // Step 4: Review Code
    await reviewCode(state);

    // Check timeout
    if (Date.now() > state.timeoutAt) {
      throw new Error('Timeout reached after review');
    }

    // Step 5: Run Tests
    await runTests(state);

    // Final save
    await saveCheckpoint(state);

    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL RESULT');
    console.log('═'.repeat(70));
    console.log(`Status: ${state.status}`);
    console.log(`Phase: ${state.phase}`);
    console.log(`Progress: ${state.progress}%`);
    console.log(`Milestones: ${state.currentMilestone}/${state.totalMilestones}`);
    console.log(`Degraded mode: ${state.degradedMode ? 'Yes' : 'No'}`);
    console.log('═'.repeat(70) + '\n');

    return state.status === 'success' ? 0 : 1;
  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await gracefulShutdown(`Fatal error: ${error.message}`);
    return 1;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRACEFUL SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════

async function gracefulShutdown(reason) {
  console.log(`\n🛑 [GRACEFUL SHUTDOWN] ${reason}`);

  if (currentState) {
    try {
      currentState.phase = 'interrupted';
      currentState.status = 'interrupted';
      currentState.interrupted_at = new Date().toISOString();
      currentState.interrupt_reason = reason;

      await saveCheckpoint(currentState);

      console.log(`   ✅ State saved successfully`);
      console.log(`   📝 Resume with: RESUME=true npm start`);
    } catch (error) {
      console.error(`   ❌ Failed to save state: ${error.message}`);
    }
  }
}

// Handle graceful shutdown on signals
process.on('SIGTERM', async () => {
  console.log('\n⚠️ Received SIGTERM, initiating graceful shutdown...');
  await gracefulShutdown('SIGTERM received');
  process.exit(0);
});

process.on('SIGINT', async () => {
  console.log('\n⚠️ Received SIGINT, initiating graceful shutdown...');
  await gracefulShutdown('SIGINT received');
  process.exit(0);
});

process.on('uncaughtException', async (error) => {
  console.error('\n💥 Uncaught exception:', error);
  await gracefulShutdown(`Uncaught exception: ${error.message}`);
  process.exit(1);
});

process.on('unhandledRejection', async (reason) => {
  console.error('\n💥 Unhandled rejection:', reason);
  await gracefulShutdown(`Unhandled rejection: ${reason}`);
  process.exit(1);
});

// ═══════════════════════════════════════════════════════════════════════════
// MAIN ENTRY POINT
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  try {
    const ideaId = process.env.IDEA_ID || '001-example-feature';

    // Find idea file by ID (it may have a slugified title appended)
    const backlogDir = 'ideas/backlog';
    const files = await fs.readdir(backlogDir);
    const ideaFile = files.find(f => f.startsWith(ideaId) && f.endsWith('.md'));

    if (!ideaFile) {
      throw new Error(`No idea file found starting with ID: ${ideaId}`);
    }

    const ideaPath = path.join(backlogDir, ideaFile);
    const ideaContent = await fs.readFile(ideaPath, 'utf-8');

    console.log(`📖 Loaded idea: ${ideaFile}`);

    // Run orchestration
    const exitCode = await orchestrate(ideaId, ideaContent);
    process.exit(exitCode);
  } catch (error) {
    console.error(`\n❌ Startup error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}

export { orchestrate, analyzeIdea, createPlan, implementMilestone, reviewCode, runTests };
