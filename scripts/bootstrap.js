#!/usr/bin/env node

/**
 * Bootstrap Script
 *
 * Sets up the autonomous development system for first run.
 * Creates initial idea, sets up directories, and triggers first workflow.
 *
 * Usage:
 *   node scripts/bootstrap.js "Add user login feature"
 *   node scripts/bootstrap.js --vibe "make the app responsive"
 */

import { spawn } from 'child_process';
import fs from 'fs/promises';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const REQUIRED_DIRS = [
  'ideas/backlog',
  'ideas/in-progress',
  'ideas/completed',
  'state',
  'state/checkpoints',
  'logs'
];

const REQUIRED_FILES = [
  'package.json',
  '.github/workflows/autonomous-dev.yml'
];

// ═══════════════════════════════════════════════════════════════════════════
// SETUP FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Check if in git repository
 */
async function checkGitRepo() {
  return new Promise((resolve) => {
    const proc = spawn('git', ['rev-parse', '--git-dir'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.on('close', (code) => resolve(code === 0));
  });
}

/**
 * Initialize git repository
 */
async function initGitRepo() {
  console.log('📦 Initializing git repository...');

  await execCommand('git', ['init']);
  await execCommand('git', ['checkout', '-b', 'main']);

  // Create dev branch
  await execCommand('git', ['checkout', '-b', 'dev']);

  console.log('✅ Git repository initialized with main and dev branches');
}

/**
 * Create required directories
 */
async function setupDirectories() {
  console.log('📁 Creating directory structure...');

  for (const dir of REQUIRED_DIRS) {
    await fs.mkdir(dir, { recursive: true });
    console.log(`   ✓ ${dir}`);
  }

  console.log('✅ Directory structure created');
}

/**
 * Check required files exist
 */
async function checkRequiredFiles() {
  console.log('🔍 Checking required files...');

  const missing = [];

  for (const file of REQUIRED_FILES) {
    try {
      await fs.access(file);
      console.log(`   ✓ ${file}`);
    } catch {
      console.log(`   ✗ ${file} (missing)`);
      missing.push(file);
    }
  }

  if (missing.length > 0) {
    throw new Error(`Missing required files: ${missing.join(', ')}`);
  }

  console.log('✅ All required files present');
}

/**
 * Create initial idea
 */
async function createInitialIdea(vibe) {
  console.log('\n💡 Creating initial idea...');

  const { createIdeaFile, quickMode } = await import('./create-idea.js');

  const ideaData = await quickMode(vibe);
  const result = await createIdeaFile(ideaData);

  console.log(`✅ Initial idea created: ${result.filename}`);

  return result;
}

/**
 * Install dependencies
 */
async function installDependencies() {
  console.log('\n📦 Installing dependencies...');

  await execCommand('npm', ['install']);

  console.log('✅ Dependencies installed');
}

/**
 * Check if OpenClaw is installed
 */
async function checkOpenClaw() {
  console.log('\n🔍 Checking OpenClaw installation...');

  return new Promise((resolve) => {
    const proc = spawn('openclaw', ['--version'], {
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.on('close', (code) => {
      if (code === 0) {
        console.log('✅ OpenClaw is installed');
        resolve(true);
      } else {
        console.log('⚠️  OpenClaw not installed');
        resolve(false);
      }
    });
  });
}

/**
 * Install OpenClaw
 */
async function installOpenClaw() {
  console.log('\n📥 Installing OpenClaw CLI...');
  console.log('   This may take a moment...');

  try {
    await execCommand('npm', ['install', '-g', 'openclaw']);
    console.log('✅ OpenClaw installed successfully');
  } catch (error) {
    console.log('⚠️  Failed to install via npm, trying alternative method...');

    // Try alternative installation
    await execCommand('bash', ['-c', 'curl -sSL https://openclaw.dev/install.sh | bash']);
    console.log('✅ OpenClaw installed via shell script');
  }
}

/**
 * Create initial commit
 */
async function createInitialCommit() {
  console.log('\n💾 Creating initial commit...');

  await execCommand('git', ['add', '-A']);
  await execCommand('git', ['commit', '-m', '🎉 Initial setup: Autonomous development system']);

  console.log('✅ Initial commit created');
}

/**
 * Trigger first workflow run
 */
async function triggerWorkflow(ideaId) {
  console.log('\n🚀 Triggering first workflow run...');

  try {
    // Check if gh CLI is available
    await execCommand('gh', ['--version']);

    // Trigger workflow
    await execCommand('gh', [
      'workflow', 'run',
      'autonomous-dev.yml',
      '--ref', 'dev',
      '-f', `idea_id=${ideaId}`,
      '-f', 'force_new=true'
    ]);

    console.log('✅ Workflow triggered successfully');
    console.log('\n   View status: gh run list');
    console.log('   View logs: gh run view --log');

    return true;
  } catch (error) {
    console.log('⚠️  Could not trigger workflow automatically');
    console.log('   Reason: GitHub CLI (gh) not installed or not authenticated');
    console.log('\n   Manual trigger:');
    console.log(`   1. Push to GitHub: git push origin dev`);
    console.log(`   2. Go to Actions tab in GitHub`);
    console.log(`   3. Select "Autonomous Development" workflow`);
    console.log(`   4. Click "Run workflow"`);
    console.log(`   5. Select branch: dev`);
    console.log(`   6. Enter idea_id: ${ideaId}`);

    return false;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Execute command and return promise
 */
function execCommand(command, args) {
  return new Promise((resolve, reject) => {
    const proc = spawn(command, args, {
      stdio: 'inherit'
    });

    proc.on('close', (code) => {
      if (code === 0) {
        resolve();
      } else {
        reject(new Error(`${command} ${args.join(' ')} failed with code ${code}`));
      }
    });

    proc.on('error', reject);
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   🤖 Autonomous Development System - Bootstrap                   ║
║                                                                   ║
║   This will set up everything needed for your first run          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝
`);

  try {
    // Get idea/vibe from args
    let vibe;
    if (args.includes('--vibe') || args.includes('-v')) {
      const vibeIndex = args.findIndex(a => a === '--vibe' || a === '-v');
      vibe = args[vibeIndex + 1];
    } else if (args.length > 0 && !args[0].startsWith('-')) {
      vibe = args.join(' ');
    } else {
      console.log('❌ Please provide an initial idea or vibe');
      console.log('\nUsage:');
      console.log('  node scripts/bootstrap.js "Add user authentication"');
      console.log('  node scripts/bootstrap.js --vibe "optimize performance"');
      process.exit(1);
    }

    console.log(`\n🎯 Initial idea: "${vibe}"\n`);

    // Step 1: Check/init git
    const hasGit = await checkGitRepo();
    if (!hasGit) {
      await initGitRepo();
    } else {
      console.log('✅ Git repository already initialized');
    }

    // Step 2: Setup directories
    await setupDirectories();

    // Step 3: Check required files
    await checkRequiredFiles();

    // Step 4: Install dependencies
    await installDependencies();

    // Step 5: Check/install OpenClaw
    const hasOpenClaw = await checkOpenClaw();
    if (!hasOpenClaw) {
      await installOpenClaw();
    }

    // Step 6: Create initial idea
    const ideaResult = await createInitialIdea(vibe);

    // Step 7: Create initial commit
    await createInitialCommit();

    // Step 8: Trigger workflow (optional)
    console.log('\n');
    const triggered = await triggerWorkflow(ideaResult.ideaId);

    // Done!
    console.log(`
╔═══════════════════════════════════════════════════════════════════╗
║                                                                   ║
║   ✅ Bootstrap Complete!                                          ║
║                                                                   ║
╚═══════════════════════════════════════════════════════════════════╝

📊 Summary:
   ✓ Repository initialized
   ✓ Directory structure created
   ✓ Dependencies installed
   ✓ OpenClaw CLI ready
   ✓ Initial idea created (ID: ${ideaResult.ideaId})
   ${triggered ? '✓' : '⚠️'} Workflow ${triggered ? 'triggered' : 'pending'}

🚀 What's Next?

   ${triggered
      ? '1. Monitor workflow: gh run list\n   2. View logs: gh run view --log\n   3. Check progress: cat state/current-session.json'
      : '1. Push to GitHub: git push origin dev\n   2. Enable Actions in GitHub repo settings\n   3. Trigger workflow manually (see instructions above)\n   4. Or wait for next hourly run'
    }

   4. Add more ideas: node scripts/create-idea.js "your next idea"
   5. View ideas: ls ideas/backlog/

📚 Documentation:
   - Quick Start: cat QUICKSTART.md
   - Architecture: cat LANGGRAPH_ARCHITECTURE.md
   - Failover: cat FAILOVER_GUIDE.md

💡 The autonomous system will:
   • Run hourly automatically
   • Pick up ideas from ideas/backlog/
   • Create issues for tracking
   • Commit progress to dev branch
   • Resume from checkpoints on each run

Happy autonomous coding! 🎉
`);

  } catch (error) {
    console.error(`\n❌ Bootstrap failed: ${error.message}\n`);
    console.error(error.stack);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { setupDirectories, checkRequiredFiles, installDependencies };
