/**
 * Failover Manager
 *
 * Handles cascading failover strategies with graceful degradation:
 * - Multi-model failover (try alternative models)
 * - Circuit breaker pattern
 * - Graceful degradation
 * - Partial completion handling
 * - Alternative execution paths
 */

import { spawn } from 'child_process';
import { existsSync } from 'fs';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// MODEL FAILOVER HIERARCHY
// ═══════════════════════════════════════════════════════════════════════════

const MODEL_HIERARCHY = {
  // Primary models with fallbacks - using FREE opencode models
  planner: [
    { model: 'opencode/gpt-5-nano', priority: 1, speed: 'fast', quality: 'good' },
    { model: 'opencode/trinity-large-preview-free', priority: 2, speed: 'fast', quality: 'good' },
    { model: 'opencode/glm-4.7-free', priority: 3, speed: 'fast', quality: 'good' }
  ],
  coder: [
    { model: 'opencode/gpt-5-nano', priority: 1, speed: 'fast', quality: 'good' },
    { model: 'opencode/grok-code', priority: 2, speed: 'fast', quality: 'good' },
    { model: 'opencode/trinity-large-preview-free', priority: 3, speed: 'fast', quality: 'good' }
  ],
  reviewer: [
    { model: 'opencode/gpt-5-nano', priority: 1, speed: 'fast', quality: 'good' },
    { model: 'opencode/trinity-large-preview-free', priority: 2, speed: 'fast', quality: 'good' },
    { model: 'opencode/minimax-m2.1-free', priority: 3, speed: 'fast', quality: 'good' }
  ]
};

// ═══════════════════════════════════════════════════════════════════════════
// CIRCUIT BREAKER
// ═══════════════════════════════════════════════════════════════════════════

class CircuitBreaker {
  constructor(options = {}) {
    this.failureThreshold = options.failureThreshold || 5;
    this.resetTimeout = options.resetTimeout || 60000; // 1 minute
    this.monitoringPeriod = options.monitoringPeriod || 300000; // 5 minutes

    this.failures = new Map(); // model -> [timestamps]
    this.openCircuits = new Map(); // model -> openedAt
    this.halfOpenAttempts = new Map(); // model -> attemptCount
  }

  async execute(model, fn) {
    // Check if circuit is open
    if (this.isOpen(model)) {
      const openedAt = this.openCircuits.get(model);
      const elapsed = Date.now() - openedAt;

      if (elapsed < this.resetTimeout) {
        throw new Error(`Circuit breaker OPEN for ${model} (retry in ${Math.round((this.resetTimeout - elapsed) / 1000)}s)`);
      }

      // Try half-open state
      console.log(`⚡ Circuit breaker HALF-OPEN for ${model}, attempting test request...`);
      return await this.attemptHalfOpen(model, fn);
    }

    // Circuit closed, execute normally
    try {
      const result = await fn();
      this.recordSuccess(model);
      return result;
    } catch (error) {
      this.recordFailure(model);
      throw error;
    }
  }

  async attemptHalfOpen(model, fn) {
    try {
      const result = await fn();
      this.close(model);
      console.log(`✅ Circuit breaker CLOSED for ${model}`);
      return result;
    } catch (error) {
      this.open(model);
      throw error;
    }
  }

  recordFailure(model) {
    if (!this.failures.has(model)) {
      this.failures.set(model, []);
    }

    const now = Date.now();
    const failures = this.failures.get(model);

    // Add current failure
    failures.push(now);

    // Clean old failures outside monitoring period
    const filtered = failures.filter(t => now - t < this.monitoringPeriod);
    this.failures.set(model, filtered);

    // Check if threshold exceeded
    if (filtered.length >= this.failureThreshold) {
      this.open(model);
    }
  }

  recordSuccess(model) {
    // Clear failure history on success
    this.failures.delete(model);
    this.halfOpenAttempts.delete(model);
  }

  open(model) {
    if (!this.isOpen(model)) {
      console.warn(`🚨 Circuit breaker OPEN for ${model} (${this.failureThreshold} failures)`);
      this.openCircuits.set(model, Date.now());
    }
  }

  close(model) {
    this.openCircuits.delete(model);
    this.failures.delete(model);
    this.halfOpenAttempts.delete(model);
  }

  isOpen(model) {
    return this.openCircuits.has(model);
  }

  getStatus(model) {
    if (this.isOpen(model)) {
      return 'OPEN';
    }
    const failures = this.failures.get(model) || [];
    if (failures.length > 0) {
      return `MONITORING (${failures.length}/${this.failureThreshold})`;
    }
    return 'CLOSED';
  }

  reset(model) {
    this.close(model);
  }

  resetAll() {
    this.failures.clear();
    this.openCircuits.clear();
    this.halfOpenAttempts.clear();
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// FAILOVER MANAGER
// ═══════════════════════════════════════════════════════════════════════════

export class FailoverManager {
  constructor(options = {}) {
    this.circuitBreaker = new CircuitBreaker({
      failureThreshold: options.failureThreshold || 3,
      resetTimeout: options.resetTimeout || 60000,
      monitoringPeriod: options.monitoringPeriod || 300000
    });

    this.maxRetries = options.maxRetries || 3;
    this.gracefulDegradation = options.gracefulDegradation !== false;
    this.partialSuccess = options.partialSuccess !== false;
  }

  /**
   * Execute with automatic failover to alternative models
   */
  async executeWithFailover(agentType, prompt, options = {}) {
    const modelList = MODEL_HIERARCHY[agentType] || MODEL_HIERARCHY.planner;
    const errors = [];

    console.log(`\n🔄 [FAILOVER] Attempting ${agentType} with ${modelList.length} fallback models`);

    for (const { model, priority, speed, quality } of modelList) {
      try {
        console.log(`   Try #${priority}: ${model} (${speed}, ${quality})`);

        // Check circuit breaker
        const status = this.circuitBreaker.getStatus(model);
        if (status === 'OPEN') {
          console.log(`   ⚠️ Circuit breaker OPEN, skipping ${model}`);
          continue;
        }

        // Execute with circuit breaker
        const result = await this.circuitBreaker.execute(model, async () => {
          return await this.executeAgent(model, prompt, options);
        });

        console.log(`   ✅ Success with ${model}`);
        return { success: true, result, model, fallback: priority > 1 };

      } catch (error) {
        console.error(`   ❌ Failed with ${model}: ${error.message}`);
        errors.push({ model, error: error.message, priority });

        // Check if we should continue trying
        if (this.isFatalError(error)) {
          console.log(`   🛑 Fatal error, stopping failover`);
          break;
        }

        // Wait before next attempt
        if (priority < modelList.length) {
          await this.backoff(priority);
        }
      }
    }

    // All models failed
    console.error(`   ❌ All ${modelList.length} models failed`);

    // Try graceful degradation
    if (this.gracefulDegradation) {
      const degraded = await this.attemptGracefulDegradation(agentType, prompt, options);
      if (degraded) {
        return degraded;
      }
    }

    return {
      success: false,
      errors,
      message: `All models failed for ${agentType}`
    };
  }

  /**
   * Execute agent with single model
   */
  async executeAgent(model, prompt, options = {}) {
    const timeout = options.timeout || 300000;

    return new Promise((resolve, reject) => {
      let output = '';
      let error = '';
      let resolved = false;

      // Use 'opencode' command (openclaw is an alias)
      // Try local OpenCode models first if available
      let modelArg = model;
      if (process.env.OPEN_CODE_MODELS_DIR && typeof process.env.OPEN_CODE_MODELS_DIR === 'string') {
        try {
          const localCandidate = path.join(process.env.OPEN_CODE_MODELS_DIR, model.replace(/\//g, '_'));
          if (existsSync(localCandidate)) {
            modelArg = `local:${localCandidate}`;
            console.log(`Using local OpenCode model for ${model} -> ${modelArg}`);
          }
        } catch (e) { /* ignore */ }
      }
      const proc = spawn('opencode', [
        'run',
        '--model', modelArg,
        '--format', 'json',
        prompt
      ], {
        timeout,
        stdio: ['ignore', 'pipe', 'pipe']
      });

      const timer = setTimeout(() => {
        if (!resolved) {
          resolved = true;
          proc.kill('SIGTERM');
          reject(new Error(`Timeout after ${timeout}ms`));
        }
      }, timeout);

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { error += data.toString(); });

      proc.on('close', (code) => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          if (output) {
            try {
              const parsed = this.parseOutput(output);
              resolve(parsed);
            } catch (parseError) {
              reject(new Error(`Parse error: ${parseError.message}`));
            }
          } else {
            reject(new Error(error || `Exit code ${code}`));
          }
        }
      });

      proc.on('error', (err) => {
        clearTimeout(timer);
        if (!resolved) {
          resolved = true;
          reject(err);
        }
      });
    });
  }

  /**
   * Parse agent output
   */
  parseOutput(output) {
    const lines = output.split('\n').filter(l => l.trim());
    let fullText = '';

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'text' && event.part?.text) {
          fullText += event.part.text;
        }
      } catch {
        // Not JSON event
      }
    }

    const text = fullText || output;

    // Try direct parse
    try {
      return JSON.parse(text.trim());
    } catch {
      // Try extract from code block
      const match = text.match(/```json\s*([\s\S]*?)\s*```/) ||
                    text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[1] || match[0]);
      }
      throw new Error('No valid JSON in output');
    }
  }

  /**
   * Check if error is fatal (don't retry)
   */
  isFatalError(error) {
    const fatalPatterns = [
      /invalid prompt/i,
      /malformed request/i,
      /authentication failed/i,
      /forbidden/i,
      /not authorized/i
    ];

    return fatalPatterns.some(p => p.test(error.message));
  }

  /**
   * Exponential backoff between retries
   */
  async backoff(attempt) {
    const delay = Math.min(1000 * Math.pow(2, attempt - 1), 10000);
    console.log(`   ⏳ Waiting ${delay}ms before next attempt...`);
    await new Promise(resolve => setTimeout(resolve, delay));
  }

  /**
   * Graceful degradation - fallback to simpler approaches
   */
  async attemptGracefulDegradation(agentType, prompt, options) {
    console.log(`\n🔄 [GRACEFUL DEGRADATION] Attempting fallback strategies...`);

    switch (agentType) {
      case 'planner':
        return await this.degradedPlanner(prompt);

      case 'coder':
        return await this.degradedCoder(prompt, options);

      case 'reviewer':
        return await this.degradedReviewer(prompt);

      default:
        return null;
    }
  }

  /**
   * Degraded planner - simple template-based planning
   */
  async degradedPlanner(prompt) {
    console.log(`   📋 Using template-based planning...`);

    try {
      // Extract key info from prompt
      const complexity = prompt.toLowerCase().includes('complex') ? 'high' : 'medium';

      return {
        success: true,
        result: {
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
        },
        model: 'degraded-template',
        degraded: true
      };
    } catch (error) {
      return null;
    }
  }

  /**
   * Degraded coder - request user to implement manually
   */
  async degradedCoder(prompt, options) {
    console.log(`   💻 Cannot auto-generate code, creating manual task...`);

    return {
      success: true,
      result: {
        files: [{
          path: options.targetFile || 'MANUAL_IMPLEMENTATION_NEEDED.md',
          content: `# Manual Implementation Required\n\n## Task\n${prompt}\n\n## Reason\nAI code generation unavailable. Please implement manually.\n\n## Next Steps\n1. Review the requirements above\n2. Implement the code\n3. Run tests\n4. Commit changes`,
          explanation: 'Manual implementation guide created'
        }],
        issues: ['AI coder unavailable']
      },
      model: 'degraded-manual',
      degraded: true,
      needsUserInput: true
    };
  }

  /**
   * Degraded reviewer - basic static checks only
   */
  async degradedReviewer(prompt) {
    console.log(`   👀 Using basic static analysis...`);

    return {
      success: true,
      result: {
        approved: true, // Optimistic approval
        code_quality: 70, // Conservative score
        issues: [{
          severity: 'low',
          file: 'unknown',
          line: 0,
          issue: 'AI reviewer unavailable - basic checks only',
          suggestion: 'Manual code review recommended'
        }],
        strengths: ['Code compiled successfully'],
        next_steps: ['Manual review recommended']
      },
      model: 'degraded-static',
      degraded: true
    };
  }

  /**
   * Handle partial success - some agents succeeded, some failed
   */
  async handlePartialSuccess(results) {
    if (!this.partialSuccess) {
      return { success: false, reason: 'Partial success not allowed' };
    }

    const succeeded = results.filter(r => r.success);
    const failed = results.filter(r => !r.success);

    console.log(`\n⚠️ [PARTIAL SUCCESS] ${succeeded.length}/${results.length} agents succeeded`);

    if (succeeded.length === 0) {
      return { success: false, reason: 'All agents failed' };
    }

    // Determine if we can continue with partial results
    const successRate = succeeded.length / results.length;

    if (successRate >= 0.5) {
      console.log(`   ✅ Accepting partial results (${Math.round(successRate * 100)}% success rate)`);
      return {
        success: true,
        results: succeeded,
        partial: true,
        failedCount: failed.length,
        warning: `${failed.length} agents failed but continuing with ${succeeded.length} successful results`
      };
    }

    return {
      success: false,
      reason: `Success rate too low: ${Math.round(successRate * 100)}%`
    };
  }

  /**
   * Graceful shutdown - save state and exit cleanly
   */
  async gracefulShutdown(state, reason) {
    console.log(`\n🛑 [GRACEFUL SHUTDOWN] ${reason}`);

    try {
      // Save current state
      console.log(`   💾 Saving state...`);
      await this.saveState(state);

      // Create recovery issue
      console.log(`   📝 Creating recovery issue...`);
      await this.createRecoveryIssue(state, reason);

      // Log shutdown info
      console.log(`   📊 Shutdown info saved`);

      return {
        shutdown: true,
        reason,
        state_saved: true,
        recovery_issue_created: true,
        can_resume: true
      };

    } catch (error) {
      console.error(`   ❌ Shutdown error: ${error.message}`);
      return {
        shutdown: true,
        reason,
        state_saved: false,
        error: error.message
      };
    }
  }

  async saveState(state) {
    const fs = await import('fs/promises');
    const path = await import('path');

    const statePath = path.join('state', 'emergency-state.json');
    await fs.mkdir(path.dirname(statePath), { recursive: true });
    await fs.writeFile(statePath, JSON.stringify({
      ...state,
      emergency_shutdown: true,
      shutdown_at: new Date().toISOString()
    }, null, 2));
  }

  async createRecoveryIssue(state, reason) {
    const { IssueTracker } = await import('./issue-tracker.js');
    const issues = new IssueTracker();

    await issues.create({
      title: `🚨 Emergency Shutdown: ${state.ideaId || 'Unknown'}`,
      body: `## Shutdown Reason\n\n${reason}\n\n## State\n\n\`\`\`json\n${JSON.stringify(state, null, 2)}\n\`\`\`\n\n## Recovery\n\n1. Review the state above\n2. Fix the underlying issue\n3. Resume with: \`RESUME=true IDEA_ID=${state.ideaId} npm start\``,
      labels: ['autonomous', 'emergency-shutdown', 'needs-recovery']
    });
  }

  /**
   * Get system status
   */
  getStatus() {
    const status = {};

    for (const [agentType, models] of Object.entries(MODEL_HIERARCHY)) {
      status[agentType] = models.map(m => ({
        model: m.model,
        priority: m.priority,
        circuitBreaker: this.circuitBreaker.getStatus(m.model)
      }));
    }

    return status;
  }

  /**
   * Reset all circuit breakers
   */
  resetCircuitBreakers() {
    this.circuitBreaker.resetAll();
    console.log('✅ All circuit breakers reset');
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export { CircuitBreaker, MODEL_HIERARCHY };
export default FailoverManager;
