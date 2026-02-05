#!/usr/bin/env node

/**
 * Create Idea Script
 *
 * Quickly create a new idea from a simple description or vibe.
 * Can be used via CLI or programmatically.
 *
 * Usage:
 *   node scripts/create-idea.js "Add user authentication"
 *   node scripts/create-idea.js --vibe "make the app faster"
 *   node scripts/create-idea.js --interactive
 */

import fs from 'fs/promises';
import path from 'path';
import readline from 'readline';

// ═══════════════════════════════════════════════════════════════════════════
// CONFIGURATION
// ═══════════════════════════════════════════════════════════════════════════

const IDEAS_DIR = 'ideas/backlog';
const TEMPLATE_PATH = 'ideas/backlog/template.md';

// ═══════════════════════════════════════════════════════════════════════════
// AI-POWERED IDEA EXPANSION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Expand a vibe/description into a full idea using AI
 */
async function expandIdeaWithAI(vibe) {
  console.log('🤖 Expanding your idea with AI...');

  const { spawn } = await import('child_process');

  const prompt = `Given this brief idea or vibe: "${vibe}"

Please create a detailed development idea with:
1. A clear, descriptive title (max 60 chars)
2. Detailed description of what needs to be built
3. Context explaining why this is needed
4. 3-5 specific acceptance criteria
5. Technical approach or notes
6. Estimated priority (Low/Medium/High/Critical)
7. Estimated complexity (Low/Medium/High)
8. Appropriate labels (feature/bug/refactor/documentation/testing)

Return ONLY a valid JSON object with this structure:
{
  "title": "...",
  "description": "...",
  "context": "...",
  "acceptance_criteria": ["...", "..."],
  "technical_notes": "...",
  "priority": "Medium",
  "complexity": "Medium",
  "labels": ["feature"]
}`;

  return new Promise((resolve, reject) => {
    let output = '';
    let error = '';

    const proc = spawn('openclaw', [
      'run',
      '--model', 'opencode/gpt-5-nano',
      '--format', 'json',
      prompt
    ], {
      timeout: 60000,
      stdio: ['ignore', 'pipe', 'pipe']
    });

    proc.stdout.on('data', (data) => { output += data.toString(); });
    proc.stderr.on('data', (data) => { error += data.toString(); });

    proc.on('close', (code) => {
      if (code === 0 && output) {
        try {
          // Parse streaming JSON events
          const lines = output.split('\n').filter(l => l.trim());
          let fullText = '';

          for (const line of lines) {
            try {
              const event = JSON.parse(line);
              if (event.type === 'text' && event.part?.text) {
                fullText += event.part.text;
              }
            } catch {
              // Not a JSON event, might be the final output
              fullText = line;
            }
          }

          // Extract JSON from output
          const jsonMatch = fullText.match(/\{[\s\S]*\}/) || fullText.match(/```json\s*([\s\S]*?)\s*```/);
          if (jsonMatch) {
            const jsonStr = jsonMatch[1] || jsonMatch[0];
            const parsed = JSON.parse(jsonStr);
            resolve(parsed);
          } else {
            throw new Error('No JSON found in output');
          }
        } catch (parseError) {
          reject(new Error(`Failed to parse AI response: ${parseError.message}`));
        }
      } else {
        reject(new Error(error || `AI expansion failed with code ${code}`));
      }
    });

    proc.on('error', (err) => reject(err));
  });
}

// ═══════════════════════════════════════════════════════════════════════════
// IDEA CREATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generate next idea ID
 */
async function getNextIdeaId() {
  try {
    const files = await fs.readdir(IDEAS_DIR);
    const ideaFiles = files.filter(f => f.match(/^\d{3}-.*\.md$/));

    if (ideaFiles.length === 0) {
      return '001';
    }

    const maxId = Math.max(...ideaFiles.map(f => parseInt(f.substring(0, 3))));
    return String(maxId + 1).padStart(3, '0');
  } catch (error) {
    return '001';
  }
}

/**
 * Create slug from title
 */
function slugify(title) {
  return title
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .substring(0, 50);
}

/**
 * Create idea markdown file
 */
async function createIdeaFile(ideaData) {
  const ideaId = await getNextIdeaId();
  const slug = slugify(ideaData.title);
  const filename = `${ideaId}-${slug}.md`;
  const filepath = path.join(IDEAS_DIR, filename);

  const criteria = ideaData.acceptance_criteria
    .map(c => `- [ ] ${c}`)
    .join('\n');

  const labels = Array.isArray(ideaData.labels)
    ? ideaData.labels.join(', ')
    : ideaData.labels;

  const content = `# ${ideaData.title}

## Description
${ideaData.description}

## Context
${ideaData.context}

## Acceptance Criteria
${criteria}

## Technical Notes
${ideaData.technical_notes || 'No specific technical notes provided.'}

${ideaData.files_involved ? `## Files Involved
${ideaData.files_involved.map(f => `- \`${f}\``).join('\n')}

` : ''}## Priority
${ideaData.priority}

## Estimated Complexity
${ideaData.complexity}

## Labels
${labels}

---

**Created:** ${new Date().toISOString().split('T')[0]}
**ID:** ${ideaId}
`;

  await fs.mkdir(IDEAS_DIR, { recursive: true });
  await fs.writeFile(filepath, content);

  return { ideaId, filename, filepath };
}

// ═══════════════════════════════════════════════════════════════════════════
// INTERACTIVE MODE
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Interactive idea creation
 */
async function interactiveMode() {
  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
  });

  const question = (prompt) => new Promise((resolve) => {
    rl.question(prompt, resolve);
  });

  console.log('\n✨ Interactive Idea Creation\n');

  const title = await question('💡 Idea title: ');
  const description = await question('📝 Description: ');
  const context = await question('🎯 Why is this needed? ');

  console.log('\n📋 Acceptance Criteria (one per line, empty line to finish):');
  const criteria = [];
  while (true) {
    const criterion = await question(`   ${criteria.length + 1}. `);
    if (!criterion.trim()) break;
    criteria.push(criterion);
  }

  const technical = await question('⚙️  Technical notes (optional): ');
  const priority = await question('🎚️  Priority (Low/Medium/High/Critical) [Medium]: ') || 'Medium';
  const complexity = await question('📊 Complexity (Low/Medium/High) [Medium]: ') || 'Medium';
  const labels = await question('🏷️  Labels (comma-separated) [feature]: ') || 'feature';

  rl.close();

  return {
    title,
    description,
    context,
    acceptance_criteria: criteria,
    technical_notes: technical,
    priority,
    complexity,
    labels: labels.split(',').map(l => l.trim())
  };
}

// ═══════════════════════════════════════════════════════════════════════════
// QUICK MODE (FROM VIBE)
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Quick idea creation from vibe/description
 */
async function quickMode(vibe) {
  console.log(`\n💡 Creating idea from: "${vibe}"\n`);

  // Try AI expansion first
  try {
    const expanded = await expandIdeaWithAI(vibe);
    console.log('✅ AI expansion successful\n');
    return expanded;
  } catch (error) {
    console.warn(`⚠️  AI expansion failed: ${error.message}`);
    console.log('📝 Creating basic idea instead...\n');

    // Fallback to basic idea
    return {
      title: vibe.substring(0, 60),
      description: vibe,
      context: 'Automatically created from quick description',
      acceptance_criteria: [
        'Implement the described functionality',
        'Add tests',
        'Update documentation'
      ],
      technical_notes: 'Details to be determined during implementation',
      priority: 'Medium',
      complexity: 'Medium',
      labels: ['feature']
    };
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// MAIN
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const args = process.argv.slice(2);

  try {
    let ideaData;

    if (args.includes('--interactive') || args.includes('-i')) {
      ideaData = await interactiveMode();
    } else if (args.includes('--vibe') || args.includes('-v')) {
      const vibeIndex = args.findIndex(a => a === '--vibe' || a === '-v');
      const vibe = args[vibeIndex + 1];
      if (!vibe) {
        throw new Error('Please provide a vibe/description after --vibe');
      }
      ideaData = await quickMode(vibe);
    } else if (args.length > 0 && !args[0].startsWith('-')) {
      // Treat first arg as vibe
      ideaData = await quickMode(args.join(' '));
    } else {
      // Show usage
      console.log(`
📝 Create Idea - Quick Start for Autonomous Dev System

Usage:
  node scripts/create-idea.js "your idea description"
  node scripts/create-idea.js --vibe "make the app faster"
  node scripts/create-idea.js --interactive
  node scripts/create-idea.js --help

Examples:
  # Quick mode (AI-powered expansion)
  node scripts/create-idea.js "Add user authentication with JWT"

  # Interactive mode
  node scripts/create-idea.js --interactive

  # From environment variable (for automation)
  IDEA_VIBE="optimize database queries" node scripts/create-idea.js

Options:
  --vibe, -v <description>  Create from brief description (AI-expanded)
  --interactive, -i         Interactive mode with prompts
  --help, -h               Show this help

The created idea will be:
  1. Saved to ideas/backlog/XXX-title.md
  2. Ready to be picked up by the autonomous system
  3. Processed in the next scheduled run (or trigger manually)
`);
      process.exit(0);
    }

    // Create the idea file
    const result = await createIdeaFile(ideaData);

    console.log('✅ Idea created successfully!\n');
    console.log(`📁 File: ${result.filename}`);
    console.log(`🆔 ID: ${result.ideaId}`);
    console.log(`📝 Title: ${ideaData.title}`);
    console.log(`\n🚀 Next steps:`);
    console.log(`   1. Review the file: cat ${result.filepath}`);
    console.log(`   2. Wait for next scheduled run (hourly)`);
    console.log(`   3. Or trigger manually: gh workflow run autonomous-dev.yml --ref dev -f idea_id=${result.ideaId}`);
    console.log(`\n💡 The autonomous system will pick this up automatically!`);

    // Output machine-readable format for scripting
    if (process.env.OUTPUT_JSON === 'true') {
      console.log('\n---JSON-OUTPUT---');
      console.log(JSON.stringify({
        ideaId: result.ideaId,
        filename: result.filename,
        filepath: result.filepath,
        title: ideaData.title
      }));
    }

  } catch (error) {
    console.error(`\n❌ Error: ${error.message}\n`);
    process.exit(1);
  }
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}

export { createIdeaFile, expandIdeaWithAI, quickMode, interactiveMode };
