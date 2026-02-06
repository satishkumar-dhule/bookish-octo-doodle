/**
 * Git Utilities
 * Helper functions for git operations
 */

import { execSync } from 'child_process';

export class GitUtils {
  constructor(options = {}) {
    this.userEmail = options.userEmail || process.env.GIT_USER_EMAIL || 'satishkumar.dhule@gmail.com';
    this.userName = options.userName || process.env.GIT_USER_NAME || 'satishkumar-dhule';
  }

  ensureGitConfig() {
    try {
      // Check if git config is set
      const email = execSync('git config user.email', { encoding: 'utf-8', stdio: 'pipe' }).trim();
      const name = execSync('git config user.name', { encoding: 'utf-8', stdio: 'pipe' }).trim();

      if (!email || !name) {
        throw new Error('Git config not set');
      }
    } catch {
      // Set git config if not already set
      try {
        execSync(`git config user.email "${this.userEmail}"`);
        execSync(`git config user.name "${this.userName}"`);
        console.log(`✅ Git config set: ${this.userName} <${this.userEmail}>`);
      } catch (error) {
        console.error('⚠️ Failed to set git config:', error.message);
        throw error;
      }
    }
  }

  async commitAll(message) {
    try {
      // Ensure git config is set before committing
      this.ensureGitConfig();

      // Check if there are changes to commit
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      if (!status.trim()) {
        console.log('⏭️ No changes to commit');
        return;
      }

      execSync('git add -A', { stdio: 'pipe' });
      execSync(`git commit -m "${message}"`, { stdio: 'pipe' });
      console.log(`✅ Committed: ${message}`);
    } catch (error) {
      console.error('⚠️ Commit failed:', error.message);
      throw error;
    }
  }

  async getLastCommit() {
    try {
      return execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return null;
    }
  }

  async getDiff() {
    try {
      return execSync('git diff HEAD~1', { encoding: 'utf-8' });
    } catch {
      return '';
    }
  }

  async getCurrentBranch() {
    try {
      return execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();
    } catch {
      return 'unknown';
    }
  }

  async hasUncommittedChanges() {
    try {
      const status = execSync('git status --porcelain', { encoding: 'utf-8' });
      return status.trim().length > 0;
    } catch {
      return false;
    }
  }

  async rollback(commitHash) {
    try {
      // Stash any uncommitted changes first
      if (await this.hasUncommittedChanges()) {
        execSync('git stash push -m "Auto-stash before rollback"', { stdio: 'ignore' });
      }

      // Hard reset to specified commit
      execSync(`git reset --hard ${commitHash}`, { stdio: 'inherit' });
      console.log(`✅ Rolled back to ${commitHash.substring(0, 8)}`);
      return true;
    } catch (error) {
      console.error(`❌ Rollback failed: ${error.message}`);
      return false;
    }
  }

  async createBranch(branchName) {
    try {
      execSync(`git checkout -b ${branchName}`, { stdio: 'ignore' });
      return true;
    } catch {
      return false;
    }
  }

  async getModifiedFiles() {
    try {
      const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }
}
