#!/usr/bin/env node
/**
 * 🤖 Autonomous Development Orchestrator
 *
 * Coordinates multiple OpenCode agents to work on ideas autonomously:
 * 1. Reads idea from backlog
 * 2. Spawns parallel agents (planner, coder, reviewer)
 * 3. Manages GitHub Issues
 * 4. Commits milestones to dev branch
 * 5. Saves state for resume
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';
import { StateManager } from './utils/state-manager.js';
import { IssueTracker } from './utils/issue-tracker.js';
import { GitUtils } from './utils/git-utils.js';

const STATE_FILE = 'state/current-session.json';
const TIMEOUT_MS = (process.env.TIMEOUT_MINUTES || 23) * 60 * 1000;
const MAX_ITERATIONS = parseInt(process.env.MAX_ITERATIONS || '10');

class AutonomousOrchestrator {
  constructor() {
    this.state = new StateManager(STATE_FILE);
    this.issues = new IssueTracker();
    this.git = new GitUtils();
    this.startTime = Date.now();
    this.iteration = 0;
  }

  async run() {
    console.log('🚀 Starting Autonomous Development Session');
    console.log(`⏱️  Timeout: ${TIMEOUT_MS / 60000} minutes`);
    console.log(`🔄 Max Iterations: ${MAX_ITERATIONS}`);

    try {
      // Load or initialize state
      const shouldResume = process.env.RESUME === 'true';
      if (shouldResume) {
        await this.state.load();
        console.log('📂 Resumed from:', this.state.data.idea_id);
      } else {
        await this.initializeNewSession();
      }

      // Main work loop
      while (this.shouldContinue()) {
        this.iteration++;
        console.log(`\n━━━ Iteration ${this.iteration}/${MAX_ITERATIONS} ━━━`);

        const result = await this.executeIteration();

        if (result.completed) {
          console.log('✅ Work completed!');
          await this.markAsCompleted();
          break;
        }

        if (result.needsUserInput) {
          console.log('❓ User input required');
          await this.createBlockingIssue(result.question);
          break;
        }

        await this.saveState();
      }

      console.log('\n🎉 Session finished');
      await this.generateReport();

    } catch (error) {
      console.error('❌ Error:', error.message);
      await this.state.save({ error: error.message });
      process.exit(1);
    }
  }

  async initializeNewSession() {
    console.log('🆕 Initializing new session');

    // Get idea to work on
    const ideaId = process.env.IDEA_ID || await this.selectNextIdea();
    const ideaPath = path.join('ideas/backlog', `${ideaId}.md`);
    const ideaContent = await fs.readFile(ideaPath, 'utf-8');

    this.state.initialize({
      idea_id: ideaId,
      idea_content: ideaContent,
      status: 'planning',
      progress: 0,
      started_at: new Date().toISOString(),
      iterations: 0,
      milestones: [],
      issues: []
    });

    // Move idea to in-progress
    await fs.rename(ideaPath, path.join('ideas/in-progress', `${ideaId}.md`));

    // Create tracking issue
    const issue = await this.issues.create({
      title: `🤖 Auto: Working on ${ideaId}`,
      body: `## Idea\n\n${ideaContent}\n\n## Progress\n\n- [ ] Planning\n- [ ] Implementation\n- [ ] Review\n- [ ] Testing`,
      labels: ['autonomous', 'in-progress']
    });

    this.state.data.main_issue = issue.number;
    await this.saveState();

    console.log(`📋 Created tracking issue #${issue.number}`);
  }

  async executeIteration() {
    const { status, idea_content } = this.state.data;

    switch (status) {
      case 'planning':
        return await this.planningPhase(idea_content);

      case 'implementing':
        return await this.implementationPhase();

      case 'reviewing':
        return await this.reviewPhase();

      case 'testing':
        return await this.testingPhase();

      default:
        throw new Error(`Unknown status: ${status}`);
    }
  }

  async planningPhase(ideaContent) {
    console.log('📋 Planning phase...');

    const prompt = `
You are a senior software architect. Analyze this idea and create an implementation plan.

IDEA:
${ideaContent}

CODEBASE CONTEXT:
${await this.getCodebaseContext()}

OUTPUT FORMAT (JSON only):
{
  "understanding": "What the idea is asking for",
  "approach": "High-level approach",
  "milestones": ["milestone 1", "milestone 2", ...],
  "files_to_create": ["path/to/file.js"],
  "files_to_modify": ["path/to/file.js"],
  "dependencies": ["package-name"],
  "questions": ["question if unclear"],
  "estimated_complexity": "low|medium|high"
}
`;

    const plan = await this.runAgent('planner', prompt);

    if (plan.questions && plan.questions.length > 0) {
      return {
        needsUserInput: true,
        question: plan.questions[0]
      };
    }

    this.state.data.plan = plan;
    this.state.data.status = 'implementing';
    this.state.data.progress = 20;
    this.state.data.milestone = 'Plan created';

    await this.saveState();

    return { completed: false };
  }

  async implementationPhase() {
    console.log('💻 Implementation phase...');

    const { plan, iterations } = this.state.data;
    const currentMilestone = plan.milestones[iterations] || plan.milestones[0];

    console.log(`  📍 Milestone: ${currentMilestone}`);

    // Spawn 3 parallel coder agents for different files
    const agents = await this.spawnParallelAgents([
      { name: 'coder-1', task: this.getCoderTask(currentMilestone, 0) },
      { name: 'coder-2', task: this.getCoderTask(currentMilestone, 1) },
      { name: 'coder-3', task: this.getCoderTask(currentMilestone, 2) }
    ]);

    // Apply changes
    for (const agent of agents) {
      if (agent.result.code) {
        await this.applyCode(agent.result);
      }
    }

    // Commit milestone
    const commitMsg = `🤖 Auto: ${currentMilestone}`;
    await this.git.commitAll(commitMsg);

    this.state.data.milestones.push({
      name: currentMilestone,
      completed_at: new Date().toISOString(),
      commit: await this.git.getLastCommit()
    });

    this.state.data.iterations++;
    this.state.data.progress = Math.min(80, 20 + (this.state.data.iterations / plan.milestones.length) * 60);

    // Check if all milestones done
    if (this.state.data.iterations >= plan.milestones.length) {
      this.state.data.status = 'reviewing';
      this.state.data.milestone = 'Implementation complete';
    }

    await this.saveState();

    return { completed: false };
  }

  async reviewPhase() {
    console.log('👀 Review phase...');

    const prompt = `
Review the changes made for this implementation.

PLAN:
${JSON.stringify(this.state.data.plan, null, 2)}

CHANGES:
${await this.git.getDiff()}

OUTPUT FORMAT (JSON):
{
  "issues": ["Issue 1", "Issue 2"],
  "suggestions": ["Suggestion 1"],
  "approved": true/false,
  "next_steps": ["Step 1"]
}
`;

    const review = await this.runAgent('reviewer', prompt);

    if (!review.approved) {
      // Create issue for manual review
      await this.createBlockingIssue(
        `Review found issues:\n${review.issues.map(i => `- ${i}`).join('\n')}`
      );
      return { needsUserInput: true, question: 'Review found issues' };
    }

    this.state.data.status = 'testing';
    this.state.data.progress = 90;
    this.state.data.milestone = 'Review passed';
    await this.saveState();

    return { completed: false };
  }

  async testingPhase() {
    console.log('🧪 Testing phase...');

    const testResult = await this.runTests();

    if (!testResult.passed) {
      await this.createBlockingIssue(
        `Tests failed:\n${testResult.failures.map(f => `- ${f}`).join('\n')}`
      );
      return { needsUserInput: true, question: 'Tests failed' };
    }

    return { completed: true };
  }

  async runAgent(name, prompt) {
    console.log(`  🤖 Running ${name} agent...`);

    return new Promise((resolve, reject) => {
      const model = process.env.OPENCODE_MODEL || 'opencode/gpt-5-nano';
      let output = '';

      const proc = spawn('opencode', [
        'run',
        '--model', model,
        '--format', 'json',
        prompt
      ]);

      proc.stdout.on('data', (data) => { output += data.toString(); });
      proc.stderr.on('data', (data) => { console.error(`  ⚠️ ${name}:`, data.toString()); });

      proc.on('close', (code) => {
        if (code !== 0) {
          reject(new Error(`${name} failed with code ${code}`));
          return;
        }

        try {
          const result = this.parseAgentOutput(output);
          console.log(`  ✅ ${name} completed`);
          resolve(result);
        } catch (err) {
          reject(new Error(`${name} output parse error: ${err.message}`));
        }
      });
    });
  }

  async spawnParallelAgents(agentConfigs) {
    console.log(`  🔀 Spawning ${agentConfigs.length} parallel agents...`);

    const promises = agentConfigs.map(async ({ name, task }) => {
      try {
        const result = await this.runAgent(name, task);
        return { name, result, success: true };
      } catch (error) {
        console.error(`  ❌ ${name} failed:`, error.message);
        return { name, result: null, success: false, error: error.message };
      }
    });

    return await Promise.all(promises);
  }

  parseAgentOutput(output) {
    // Parse JSON from opencode event stream
    const lines = output.split('\n').filter(l => l.trim());
    let fullText = '';

    for (const line of lines) {
      try {
        const event = JSON.parse(line);
        if (event.type === 'text' && event.part?.text) {
          fullText += event.part.text;
        }
      } catch {
        // Not JSON event, might be raw output
      }
    }

    const text = fullText || output;

    // Try to extract JSON
    try {
      return JSON.parse(text.trim());
    } catch {
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        return JSON.parse(match[0]);
      }
      throw new Error('No valid JSON found in output');
    }
  }

  getCoderTask(milestone, index) {
    const { plan } = this.state.data;
    const files = plan.files_to_create.concat(plan.files_to_modify);
    const targetFiles = files.slice(index * 3, (index + 1) * 3); // 3 files per agent

    if (targetFiles.length === 0) return null;

    return `
Implement this milestone: ${milestone}

FILES TO WORK ON:
${targetFiles.map(f => `- ${f}`).join('\n')}

PLAN CONTEXT:
${JSON.stringify(plan, null, 2)}

OUTPUT FORMAT (JSON):
{
  "file": "path/to/file.js",
  "code": "full file content here",
  "explanation": "What this code does"
}
`;
  }

  async applyCode({ file, code }) {
    const filePath = path.join(process.cwd(), file);
    await fs.mkdir(path.dirname(filePath), { recursive: true });
    await fs.writeFile(filePath, code);
    console.log(`  📝 Wrote ${file}`);
  }

  async runTests() {
    // Run tests and return results
    // Implement based on your test framework
    return { passed: true, failures: [] };
  }

  async createBlockingIssue(question) {
    const issue = await this.issues.create({
      title: `⏸️ User Input Needed: ${this.state.data.idea_id}`,
      body: `## Question\n\n${question}\n\n## Context\n\n${JSON.stringify(this.state.data, null, 2)}`,
      labels: ['autonomous', 'needs-user-input'],
      assignees: ['@me'] // Assigns to repo owner
    });

    this.state.data.blocked_by_issue = issue.number;
    this.state.data.status = 'blocked';
    await this.saveState();

    console.log(`📌 Created blocking issue #${issue.number}`);
  }

  async markAsCompleted() {
    const { idea_id, main_issue } = this.state.data;

    // Move idea to completed
    await fs.rename(
      path.join('ideas/in-progress', `${idea_id}.md`),
      path.join('ideas/completed', `${idea_id}.md`)
    );

    // Close issue
    if (main_issue) {
      await this.issues.close(main_issue, '✅ Completed autonomously');
    }

    this.state.data.status = 'completed';
    this.state.data.progress = 100;
    this.state.data.completed_at = new Date().toISOString();
    await this.saveState();
  }

  shouldContinue() {
    const elapsed = Date.now() - this.startTime;
    return elapsed < TIMEOUT_MS && this.iteration < MAX_ITERATIONS;
  }

  async saveState() {
    this.state.data.last_updated = new Date().toISOString();
    await this.state.save();
  }

  async getCodebaseContext() {
    // Return relevant context about the codebase
    return 'Codebase context...';
  }

  async selectNextIdea() {
    // Select the next idea from backlog
    const files = await fs.readdir('ideas/backlog');
    return files[0]?.replace('.md', '') || 'none';
  }

  async generateReport() {
    const report = {
      ...this.state.data,
      duration_minutes: (Date.now() - this.startTime) / 60000,
      iterations_completed: this.iteration
    };

    await fs.writeFile(
      `state/agent-outputs/session-${Date.now()}.json`,
      JSON.stringify(report, null, 2)
    );

    console.log('\n📊 Report saved');
  }
}

// Run
const orchestrator = new AutonomousOrchestrator();
orchestrator.run().catch(console.error);
