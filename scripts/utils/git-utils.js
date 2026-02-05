/**
 * Git Utilities
 * Helper functions for git operations
 */

import { execSync } from 'child_process';

export class GitUtils {
  async commitAll(message) {
    try {
      execSync('git add -A');
      execSync(`git commit -m "${message}" || true`);
      console.log(`✅ Committed: ${message}`);
    } catch (error) {
      console.error('⚠️ Commit failed:', error.message);
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
