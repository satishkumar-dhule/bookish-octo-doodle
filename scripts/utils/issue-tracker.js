/**
 * Issue Tracker
 * GitHub Issues integration for tracking work and asking for user input
 */

import { execSync } from 'child_process';

export class IssueTracker {
  constructor() {
    this.token = process.env.GITHUB_TOKEN;
    this.repo = this.getRepoName();
  }

  getRepoName() {
    try {
      const remote = execSync('git config --get remote.origin.url', { encoding: 'utf-8' }).trim();
      const match = remote.match(/github\.com[:/](.+?)(?:\.git)?$/);
      return match ? match[1] : null;
    } catch {
      return null;
    }
  }

  async create({ title, body, labels = [], assignees = [] }) {
    try {
      const labelsArg = labels.map(l => `--label "${l}"`).join(' ');
      const assigneesArg = assignees.map(a => `--assignee "${a}"`).join(' ');

      const cmd = `gh issue create --title "${title}" --body "${body}" ${labelsArg} ${assigneesArg}`;
      const url = execSync(cmd, { encoding: 'utf-8' }).trim();

      const number = parseInt(url.split('/').pop());

      console.log(`✅ Created issue #${number}: ${title}`);

      return { number, url };
    } catch (error) {
      console.error('❌ Failed to create issue:', error.message);
      throw error;
    }
  }

  async update(issueNumber, { body, labels, state }) {
    try {
      let cmd = `gh issue edit ${issueNumber}`;

      if (body) cmd += ` --body "${body}"`;
      if (labels) cmd += ` ${labels.map(l => `--add-label "${l}"`).join(' ')}`;
      if (state) cmd += ` --state ${state}`;

      execSync(cmd);
      console.log(`✅ Updated issue #${issueNumber}`);
    } catch (error) {
      console.error('❌ Failed to update issue:', error.message);
      throw error;
    }
  }

  async close(issueNumber, comment = '') {
    try {
      if (comment) {
        execSync(`gh issue comment ${issueNumber} --body "${comment}"`);
      }
      execSync(`gh issue close ${issueNumber}`);
      console.log(`✅ Closed issue #${issueNumber}`);
    } catch (error) {
      console.error('❌ Failed to close issue:', error.message);
      throw error;
    }
  }

  async addComment(issueNumber, comment) {
    try {
      execSync(`gh issue comment ${issueNumber} --body "${comment}"`);
      console.log(`✅ Added comment to issue #${issueNumber}`);
    } catch (error) {
      console.error('❌ Failed to add comment:', error.message);
      throw error;
    }
  }

  async list(labels = ['autonomous']) {
    try {
      const labelsArg = labels.map(l => `--label "${l}"`).join(' ');
      const output = execSync(`gh issue list ${labelsArg} --json number,title,state`, {
        encoding: 'utf-8'
      });
      return JSON.parse(output);
    } catch (error) {
      console.error('❌ Failed to list issues:', error.message);
      return [];
    }
  }

  // Sync command for GitHub Actions step
  static async sync() {
    const stateFile = 'state/current-session.json';
    const fs = await import('fs/promises');

    try {
      const state = JSON.parse(await fs.readFile(stateFile, 'utf-8'));

      if (state.main_issue) {
        const tracker = new IssueTracker();
        const progress = `
## 📊 Progress: ${state.progress}%

**Status:** ${state.status}
**Milestone:** ${state.milestone || 'N/A'}
**Iterations:** ${state.iterations || 0}

${state.milestones?.length > 0 ? '### Completed Milestones\n' + state.milestones.map(m => `- ✅ ${m.name}`).join('\n') : ''}

**Last Updated:** ${new Date().toISOString()}
`;

        await tracker.addComment(state.main_issue, progress);
        console.log('✅ Synced progress to issue');
      }
    } catch (error) {
      console.error('⚠️ Could not sync to issues:', error.message);
    }
  }
}

// CLI support
if (import.meta.url === `file://${process.argv[1]}`) {
  const command = process.argv[2];
  if (command === 'sync') {
    IssueTracker.sync().catch(console.error);
  }
}
