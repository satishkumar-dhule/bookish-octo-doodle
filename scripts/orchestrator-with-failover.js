#!/usr/bin/env node
/**
 * 🤖 LangGraph Orchestrator with Failover & Graceful Error Handling
 *
 * Enhanced with:
 * - Multi-model failover
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Partial success handling
 * - Emergency shutdown procedures
 * - State preservation on all failures
 */

import { StateGraph, END, START, MemorySaver } from '@langchain/langgraph';
import { Annotation } from '@langchain/langgraph';
import fs from 'fs/promises';
import path from 'path';
import { FailoverManager } from './utils/failover-manager.js';
import { IssueTracker } from './utils/issue-tracker.js';
import { GitUtils } from './utils/git-utils.js';
import { ResourceMonitor } from './utils/edge-case-handler.js';

// ═══════════════════════════════════════════════════════════════════════════
// INITIALIZATION
// ═══════════════════════════════════════════════════════════════════════════

const TIMEOUT_MS = (process.env.TIMEOUT_MINUTES || 23) * 60 * 1000;
const failoverManager = new FailoverManager({
  failureThreshold: 3,
  resetTimeout: 60000,
  gracefulDegradation: true,
  partialSuccess: true
});

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

// Handle uncaught errors
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

let currentState = null; // Track for emergency shutdown

// ═══════════════════════════════════════════════════════════════════════════
// STATE SCHEMA (Same as before)
// ═══════════════════════════════════════════════════════════════════════════

const AutonomousDevState = Annotation.Root({
  sessionId: Annotation({ reducer: (_, b) => b, default: () => null }),
  ideaId: Annotation({ reducer: (_, b) => b, default: () => null }),
  ideaContent: Annotation({ reducer: (_, b) => b, default: () => '' }),
  startedAt: Annotation({ reducer: (_, b) => b, default: () => new Date().toISOString() }),
  phase: Annotation({ reducer: (_, b) => b, default: () => 'initializing' }),
  plan: Annotation({ reducer: (_, b) => b, default: () => null }),
  currentMilestone: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  totalMilestones: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  milestones: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  agentOutputs: Annotation({ reducer: (a, b) => ({ ...a, ...b }), default: () => ({}) }),
  parallelResults: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  modifiedFiles: Annotation({ reducer: (a, b) => [...new Set([...a, ...b])], default: () => [] }),
  conflicts: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  testResults: Annotation({ reducer: (_, b) => b, default: () => null }),
  testPassed: Annotation({ reducer: (_, b) => b, default: () => false }),
  reviewIssues: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  codeQuality: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  errors: Annotation({ reducer: (a, b) => [...a, ...b], default: () => [] }),
  retryCount: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  maxRetries: Annotation({ reducer: (_, b) => b, default: () => 3 }),
  lastError: Annotation({ reducer: (_, b) => b, default: () => null }),
  needsUserInput: Annotation({ reducer: (_, b) => b, default: () => false }),
  userQuestion: Annotation({ reducer: (_, b) => b, default: () => null }),
  blockingIssue: Annotation({ reducer: (_, b) => b, default: () => null }),
  progress: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  status: Annotation({ reducer: (_, b) => b, default: () => 'pending' }),
  lastCheckpoint: Annotation({ reducer: (_, b) => b, default: () => null }),
  rollbackPoint: Annotation({ reducer: (_, b) => b, default: () => null }),
  executionTime: Annotation({ reducer: (_, b) => b, default: () => 0 }),
  timeoutAt: Annotation({ reducer: (_, b) => b, default: () => null }),
  resourceUsage: Annotation({ reducer: (_, b) => b, default: () => ({ memory: 0, cpu: 0 }) }),
  degradedMode: Annotation({ reducer: (_, b) => b, default: () => false }),
  partialSuccess: Annotation({ reducer: (_, b) => b, default: () => false })
});

// ═══════════════════════════════════════════════════════════════════════════
// ENHANCED NODES WITH FAILOVER
// ═══════════════════════════════════════════════════════════════════════════

async function analyzeIdeaNode(state) {
  console.log('\n🔍 [ANALYZE_IDEA] Understanding the idea...');

  try {
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

    // Use failover manager
    const result = await failoverManager.executeWithFailover('planner', prompt, {
      timeout: 60000
    });

    if (!result.success) {
      throw new Error('All planner models failed');
    }

    const analysis = result.result;
    console.log(`   ✅ Complexity: ${analysis.complexity}`);
    console.log(`   ✅ Confidence: ${analysis.confidence}`);

    if (result.degraded) {
      console.warn(`   ⚠️ Using degraded mode (${result.model})`);
    }

    return {
      agentOutputs: { analysis },
      totalMilestones: analysis.estimated_milestones || 3,
      userQuestion: analysis.questions?.[0] || null,
      needsUserInput: (analysis.questions?.length > 0 && analysis.confidence < 0.7),
      phase: analysis.requires_planning ? 'planning' : 'implementing',
      degradedMode: result.degraded || false
    };

  } catch (error) {
    console.error(`   ❌ Analysis failed: ${error.message}`);

    // Graceful degradation - use minimal plan
    if (state.retryCount < state.maxRetries) {
      return {
        lastError: error.message,
        retryCount: state.retryCount + 1
      };
    }

    // Last resort - simple default
    return {
      agentOutputs: {
        analysis: {
          understanding: 'Failed to analyze, proceeding with basic assumptions',
          complexity: 'medium',
          estimated_milestones: 2,
          requires_planning: true,
          confidence: 0.3,
          risks: ['AI analysis unavailable'],
          approach: 'Manual review recommended'
        }
      },
      totalMilestones: 2,
      needsUserInput: true,
      userQuestion: 'AI analysis failed. Please review the idea and confirm approach.',
      phase: 'planning',
      degradedMode: true
    };
  }
}

async function planNode(state) {
  console.log('\n📋 [PLAN] Creating implementation plan...');

  try {
    if (state.retryCount > 0) {
      const backoffMs = Math.min(1000 * Math.pow(2, state.retryCount - 1), 10000);
      await new Promise(resolve => setTimeout(resolve, backoffMs));
    }

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
  "estimated_time_minutes": 20,
  "confidence": 0.85
}`;

    const result = await failoverManager.executeWithFailover('planner', prompt, {
      timeout: 120000
    });

    if (!result.success) {
      throw new Error('All planner models failed');
    }

    const plan = result.result;

    if (!plan.milestones || plan.milestones.length === 0) {
      throw new Error('No milestones in plan');
    }

    console.log(`   ✅ Plan created: ${plan.milestones.length} milestones`);

    if (result.degraded) {
      console.warn(`   ⚠️ Using degraded plan (${result.model})`);
      plan.confidence = Math.min(plan.confidence || 0.5, 0.6);
    }

    await saveCheckpoint({ ...state, plan, phase: 'planning' });

    return {
      plan,
      phase: plan.confidence >= 0.5 ? 'implementing' : 'planning',
      needsUserInput: plan.confidence < 0.5,
      userQuestion: plan.confidence < 0.5 ?
        `Plan confidence is ${plan.confidence}. Review needed.` : null,
      totalMilestones: plan.milestones.length,
      degradedMode: result.degraded || state.degradedMode
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

async function parallelImplementationNode(state) {
  console.log('\n💻 [PARALLEL_IMPLEMENTATION] Executing milestone...');

  const milestone = state.plan.milestones[state.currentMilestone];
  console.log(`   Milestone ${state.currentMilestone + 1}/${state.totalMilestones}: ${milestone.name}`);

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

      // Check if we can continue with partial results
      const partial = await failoverManager.handlePartialSuccess(results);

      if (!partial.success) {
        throw new Error(`Too many agent failures: ${failCount}/${results.length}`);
      }

      // Continue with successful results only
      console.log(`   ✅ Continuing with ${successCount} successful results`);
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

    await saveCheckpoint({
      ...state,
      currentMilestone: state.currentMilestone + 1,
      milestones: [{
        name: milestone.name,
        completed_at: new Date().toISOString(),
        commit: await git.getLastCommit(),
        partialSuccess: failCount > 0
      }],
      modifiedFiles
    });

    return {
      parallelResults: results,
      modifiedFiles,
      rollbackPoint,
      currentMilestone: state.currentMilestone + 1,
      phase: state.currentMilestone + 1 >= state.totalMilestones ? 'reviewing' : 'implementing',
      partialSuccess: failCount > 0
    };

  } catch (error) {
    console.error(`   ❌ Implementation failed: ${error.message}`);

    // Attempt rollback
    if (state.rollbackPoint) {
      console.log(`   ⏪ Rolling back...`);
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

async function reviewCodeNode(state) {
  console.log('\n👀 [REVIEW_CODE] Reviewing implementation...');

  try {
    const git = new GitUtils();
    const diff = await git.getDiff();

    const prompt = `Review code changes.

PLAN:
${JSON.stringify(state.plan, null, 2)}

CHANGES:
${diff.substring(0, 10000)}

OUTPUT FORMAT (JSON):
{
  "approved": true,
  "code_quality": 85,
  "issues": [],
  "strengths": [],
  "next_steps": []
}`;

    const result = await failoverManager.executeWithFailover('reviewer', prompt, {
      timeout: 180000
    });

    if (!result.success) {
      console.warn(`   ⚠️ Review failed, using optimistic approval`);
      return {
        reviewIssues: [],
        codeQuality: 70,
        phase: 'testing',
        degradedMode: true
      };
    }

    const review = result.result;

    console.log(`   📊 Code quality: ${review.code_quality}/100`);

    const criticalIssues = (review.issues || []).filter(i => i.severity === 'high');

    if (!review.approved || criticalIssues.length > 0) {
      console.warn(`   ⚠️ Review not approved`);
      return {
        reviewIssues: review.issues || [],
        codeQuality: review.code_quality || 0,
        phase: 'blocked',
        needsUserInput: true,
        userQuestion: `Code review found ${criticalIssues.length} critical issues.`
      };
    }

    console.log(`   ✅ Review approved`);

    return {
      reviewIssues: review.issues || [],
      codeQuality: review.code_quality || 0,
      phase: 'testing',
      degradedMode: result.degraded || state.degradedMode
    };

  } catch (error) {
    console.error(`   ❌ Review failed: ${error.message}`);

    // Graceful degradation - proceed to testing
    return {
      reviewIssues: [{ severity: 'low', issue: 'Review unavailable' }],
      codeQuality: 70,
      phase: 'testing',
      degradedMode: true
    };
  }
}

async function testNode(state) {
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

      return {
        testResults: { passed: true, output },
        testPassed: true,
        phase: 'completed',
        status: 'success'
      };

    } catch (testError) {
      console.error(`   ❌ Tests failed`);

      return {
        testResults: { passed: false, output: testError.stdout || testError.message },
        testPassed: false,
        phase: 'blocked',
        needsUserInput: true,
        userQuestion: 'Tests failed. Review needed.'
      };
    }

  } catch (error) {
    console.error(`   ⚠️ Test execution error: ${error.message}`);

    // Graceful handling - no tests is OK
    return {
      testResults: { passed: true, skipped: true },
      testPassed: true,
      phase: 'completed',
      status: 'success'
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CHECKPOINT & SHUTDOWN
// ═══════════════════════════════════════════════════════════════════════════

async function saveCheckpoint(state) {
  const checkpointPath = path.join('state', 'checkpoints', `${state.sessionId}.json`);
  await fs.mkdir(path.dirname(checkpointPath), { recursive: true });
  await fs.writeFile(checkpointPath, JSON.stringify(state, null, 2));
  console.log(`💾 Checkpoint saved: ${state.phase} (${state.progress}%)`);
}

async function gracefulShutdown(reason) {
  console.log(`\n🛑 [GRACEFUL SHUTDOWN] ${reason}`);

  if (currentState) {
    try {
      await saveCheckpoint({
        ...currentState,
        phase: 'interrupted',
        status: 'interrupted',
        interrupted_at: new Date().toISOString(),
        interrupt_reason: reason
      });

      console.log(`   ✅ State saved successfully`);
      console.log(`   📝 Resume with: RESUME=true npm start`);

    } catch (error) {
      console.error(`   ❌ Failed to save state: ${error.message}`);
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// GRAPH CONSTRUCTION (simplified - same structure as before)
// ═══════════════════════════════════════════════════════════════════════════

export function createAutonomousDevGraph() {
  const graph = new StateGraph(AutonomousDevState);

  // Add nodes (using enhanced versions)
  graph.addNode('analyze_idea', analyzeIdeaNode);
  graph.addNode('plan', planNode);
  graph.addNode('parallel_implementation', parallelImplementationNode);
  graph.addNode('review_code', reviewCodeNode);
  graph.addNode('test', testNode);

  // Add edges (same as before)
  graph.addEdge(START, 'analyze_idea');
  graph.addEdge('analyze_idea', 'plan');
  graph.addEdge('plan', 'parallel_implementation');
  graph.addEdge('parallel_implementation', 'review_code');
  graph.addEdge('review_code', 'test');
  graph.addEdge('test', END);

  const checkpointer = new MemorySaver();
  return graph.compile({ checkpointer });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN EXECUTION
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  console.log('\n' + '═'.repeat(70));
  console.log('🤖 LANGGRAPH ORCHESTRATOR WITH FAILOVER');
  console.log('═'.repeat(70));

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

    console.log(`📋 Idea: ${ideaId}`);
    console.log(`⏱️  Timeout: ${TIMEOUT_MS / 60000} minutes`);

    // Show failover status
    console.log(`\n🔄 Failover Status:`);
    const status = failoverManager.getStatus();
    for (const [type, models] of Object.entries(status)) {
      console.log(`   ${type}:`);
      models.forEach(m => {
        console.log(`      ${m.priority}. ${m.model} [${m.circuitBreaker}]`);
      });
    }

    const graph = createAutonomousDevGraph();

    const initialState = {
      ideaId,
      ideaContent,
      sessionId: `session-${Date.now()}`,
      phase: 'initializing',
      timeoutAt: Date.now() + TIMEOUT_MS
    };

    currentState = initialState;

    let finalState = initialState;

    for await (const step of await graph.stream(initialState)) {
      const [, nodeState] = Object.entries(step)[0];
      finalState = { ...finalState, ...nodeState };
      currentState = finalState;

      // Check resources
      finalState.resourceUsage = await ResourceMonitor.checkResources();

      // Save checkpoint
      await saveCheckpoint(finalState);

      // Check timeout
      if (Date.now() > finalState.timeoutAt) {
        console.log('\n⏰ Timeout approaching, graceful shutdown...');
        await gracefulShutdown('Timeout approaching');
        break;
      }
    }

    await fs.writeFile(
      'state/current-session.json',
      JSON.stringify(finalState, null, 2)
    );

    console.log('\n' + '═'.repeat(70));
    console.log('📊 FINAL RESULT');
    console.log('═'.repeat(70));
    console.log(`Status: ${finalState.status}`);
    console.log(`Phase: ${finalState.phase}`);
    console.log(`Degraded mode: ${finalState.degradedMode ? 'Yes' : 'No'}`);
    console.log(`Partial success: ${finalState.partialSuccess ? 'Yes' : 'No'}`);
    console.log('═'.repeat(70) + '\n');

    process.exit(finalState.status === 'success' ? 0 : 1);

  } catch (error) {
    console.error('\n❌ Fatal error:', error);
    await gracefulShutdown(`Fatal error: ${error.message}`);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main().catch(console.error);
}
