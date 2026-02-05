/**
 * Comprehensive Edge Case Handler
 *
 * Handles all edge cases in autonomous development:
 * - Network failures
 * - Resource exhaustion
 * - Merge conflicts
 * - Circular dependencies
 * - State corruption
 * - Agent failures
 * - Timeout scenarios
 * - Race conditions
 */

import fs from 'fs/promises';
import { execSync } from 'child_process';
import path from 'path';

// ═══════════════════════════════════════════════════════════════════════════
// ERROR CLASSIFICATION
// ═══════════════════════════════════════════════════════════════════════════

export class EdgeCaseClassifier {
  static classify(error) {
    const errorMsg = error.message || String(error);

    return {
      type: this.getErrorType(errorMsg),
      severity: this.getSeverity(errorMsg),
      retryable: this.isRetryable(errorMsg),
      rollbackable: this.isRollbackable(errorMsg),
      userActionRequired: this.needsUserAction(errorMsg),
      recoveryStrategy: this.getRecoveryStrategy(errorMsg)
    };
  }

  static getErrorType(errorMsg) {
    const patterns = {
      network: /ECONNRESET|ETIMEDOUT|ENOTFOUND|fetch failed|network/i,
      timeout: /timeout|timed out/i,
      rateLimit: /rate limit|429|too many requests/i,
      memory: /out of memory|heap|ENOMEM/i,
      disk: /ENOSPC|no space left|disk full/i,
      permission: /EACCES|EPERM|permission denied/i,
      conflict: /merge conflict|CONFLICT|divergent/i,
      dependency: /cannot find module|MODULE_NOT_FOUND|dependency/i,
      syntax: /SyntaxError|parse error|invalid json/i,
      validation: /validation failed|invalid/i,
      git: /git error|fatal:|not a git repository/i,
      agent: /agent failed|agent timeout/i
    };

    for (const [type, pattern] of Object.entries(patterns)) {
      if (pattern.test(errorMsg)) return type;
    }

    return 'unknown';
  }

  static getSeverity(errorMsg) {
    // Critical: data loss, security, corruption
    if (/fatal|corrupt|lost|security|breach/i.test(errorMsg)) {
      return 'critical';
    }

    // High: blocks progress completely
    if (/error|failed|cannot|unable/i.test(errorMsg)) {
      return 'high';
    }

    // Medium: can work around
    if (/warning|deprecated|slow/i.test(errorMsg)) {
      return 'medium';
    }

    return 'low';
  }

  static isRetryable(errorMsg) {
    const retryablePatterns = [
      /timeout/i,
      /ECONNRESET/i,
      /ETIMEDOUT/i,
      /rate limit/i,
      /429/,
      /500/,
      /502/,
      /503/,
      /504/,
      /temporary failure/i,
      /try again/i
    ];

    return retryablePatterns.some(p => p.test(errorMsg));
  }

  static isRollbackable(errorMsg) {
    const rollbackablePatterns = [
      /conflict/i,
      /failed to apply/i,
      /corrupt/i,
      /invalid state/i
    ];

    return rollbackablePatterns.some(p => p.test(errorMsg));
  }

  static needsUserAction(errorMsg) {
    const userActionPatterns = [
      /permission denied/i,
      /authentication/i,
      /credentials/i,
      /merge conflict/i,
      /manual intervention/i,
      /review required/i
    ];

    return userActionPatterns.some(p => p.test(errorMsg));
  }

  static getRecoveryStrategy(errorMsg) {
    const type = this.getErrorType(errorMsg);

    const strategies = {
      network: 'retry_with_backoff',
      timeout: 'retry_with_increased_timeout',
      rateLimit: 'retry_with_delay',
      memory: 'reduce_concurrency',
      disk: 'cleanup_temp_files',
      permission: 'request_user_action',
      conflict: 'rollback_and_retry',
      dependency: 'install_dependencies',
      syntax: 'regenerate_code',
      validation: 'regenerate_with_constraints',
      git: 'reset_git_state',
      agent: 'retry_with_different_model'
    };

    return strategies[type] || 'escalate_to_user';
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// CONFLICT RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

export class ConflictResolver {
  static async detectConflicts(files) {
    const conflicts = [];

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');

        // Check for git conflict markers
        if (this.hasConflictMarkers(content)) {
          conflicts.push({
            file,
            type: 'merge',
            markers: this.extractConflictMarkers(content)
          });
        }

        // Check for semantic conflicts (duplicate functions, etc.)
        const semanticConflicts = await this.detectSemanticConflicts(file, content);
        if (semanticConflicts.length > 0) {
          conflicts.push({
            file,
            type: 'semantic',
            conflicts: semanticConflicts
          });
        }

      } catch (error) {
        // File doesn't exist or can't be read
      }
    }

    return conflicts;
  }

  static hasConflictMarkers(content) {
    return content.includes('<<<<<<< HEAD') ||
           content.includes('=======') ||
           content.includes('>>>>>>> ');
  }

  static extractConflictMarkers(content) {
    const markers = [];
    const lines = content.split('\n');

    let inConflict = false;
    let conflictStart = -1;

    lines.forEach((line, i) => {
      if (line.startsWith('<<<<<<< HEAD')) {
        inConflict = true;
        conflictStart = i;
      } else if (line.startsWith('>>>>>>> ') && inConflict) {
        markers.push({
          start: conflictStart,
          end: i,
          lines: lines.slice(conflictStart, i + 1)
        });
        inConflict = false;
      }
    });

    return markers;
  }

  static async detectSemanticConflicts(file, content) {
    const conflicts = [];

    // Detect duplicate function definitions
    const funcPattern = /(?:function|const|let|var)\s+(\w+)\s*(?:=|\()/g;
    const functions = new Map();

    let match;
    while ((match = funcPattern.exec(content)) !== null) {
      const funcName = match[1];
      if (functions.has(funcName)) {
        conflicts.push({
          type: 'duplicate_function',
          name: funcName,
          locations: [functions.get(funcName), match.index]
        });
      } else {
        functions.set(funcName, match.index);
      }
    }

    // Detect duplicate imports
    const importPattern = /import\s+.*\s+from\s+['"](.+)['"]/g;
    const imports = new Map();

    while ((match = importPattern.exec(content)) !== null) {
      const moduleName = match[1];
      if (imports.has(moduleName)) {
        conflicts.push({
          type: 'duplicate_import',
          module: moduleName,
          locations: [imports.get(moduleName), match.index]
        });
      } else {
        imports.set(moduleName, match.index);
      }
    }

    return conflicts;
  }

  static async autoResolve(conflict) {
    if (conflict.type === 'semantic') {
      // Can auto-resolve some semantic conflicts
      for (const c of conflict.conflicts) {
        if (c.type === 'duplicate_import') {
          return await this.deduplicateImports(conflict.file);
        }
      }
    }

    // Can't auto-resolve merge conflicts
    return false;
  }

  static async deduplicateImports(file) {
    const content = await fs.readFile(file, 'utf-8');
    const lines = content.split('\n');
    const imports = new Set();
    const deduplicated = [];

    for (const line of lines) {
      if (line.trim().startsWith('import ')) {
        if (!imports.has(line)) {
          imports.add(line);
          deduplicated.push(line);
        }
      } else {
        deduplicated.push(line);
      }
    }

    await fs.writeFile(file, deduplicated.join('\n'));
    return true;
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// DEPENDENCY RESOLUTION
// ═══════════════════════════════════════════════════════════════════════════

export class DependencyResolver {
  static async checkCircularDependencies(files) {
    const graph = await this.buildDependencyGraph(files);
    return this.detectCycles(graph);
  }

  static async buildDependencyGraph(files) {
    const graph = new Map();

    for (const file of files) {
      try {
        const content = await fs.readFile(file, 'utf-8');
        const imports = this.extractImports(content);

        graph.set(file, imports.map(imp => this.resolveImport(file, imp)));
      } catch {
        graph.set(file, []);
      }
    }

    return graph;
  }

  static extractImports(content) {
    const imports = [];

    // ES6 imports
    const es6Pattern = /import\s+.*\s+from\s+['"](.+)['"]/g;
    let match;
    while ((match = es6Pattern.exec(content)) !== null) {
      imports.push(match[1]);
    }

    // CommonJS requires
    const cjsPattern = /require\(['"](.+)['"]\)/g;
    while ((match = cjsPattern.exec(content)) !== null) {
      imports.push(match[1]);
    }

    return imports;
  }

  static resolveImport(fromFile, importPath) {
    if (importPath.startsWith('.')) {
      // Relative import
      const dir = path.dirname(fromFile);
      return path.resolve(dir, importPath);
    }
    // External module
    return importPath;
  }

  static detectCycles(graph) {
    const visited = new Set();
    const recursionStack = new Set();
    const cycles = [];

    const dfs = (node, path = []) => {
      if (recursionStack.has(node)) {
        // Found cycle
        const cycleStart = path.indexOf(node);
        cycles.push(path.slice(cycleStart).concat(node));
        return;
      }

      if (visited.has(node)) return;

      visited.add(node);
      recursionStack.add(node);

      const dependencies = graph.get(node) || [];
      for (const dep of dependencies) {
        if (graph.has(dep)) {
          dfs(dep, path.concat(node));
        }
      }

      recursionStack.delete(node);
    };

    for (const node of graph.keys()) {
      dfs(node);
    }

    return cycles;
  }

  static async installMissingDependencies(dependencies) {
    if (dependencies.length === 0) return { success: true };

    console.log(`📦 Installing ${dependencies.length} dependencies...`);

    try {
      execSync(`npm install ${dependencies.join(' ')}`, {
        stdio: 'inherit',
        timeout: 300000
      });

      return { success: true };
    } catch (error) {
      return {
        success: false,
        error: error.message,
        failed: dependencies
      };
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// STATE CORRUPTION RECOVERY
// ═══════════════════════════════════════════════════════════════════════════

export class StateRecovery {
  static async validateState(state) {
    const issues = [];

    // Check required fields
    if (!state.sessionId) issues.push('Missing sessionId');
    if (!state.phase) issues.push('Missing phase');

    // Check data consistency
    if (state.currentMilestone > state.totalMilestones) {
      issues.push('currentMilestone > totalMilestones');
    }

    if (state.progress < 0 || state.progress > 100) {
      issues.push('Invalid progress value');
    }

    // Check for circular references
    try {
      JSON.stringify(state);
    } catch (error) {
      issues.push('Circular reference in state');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  static async repairState(state) {
    console.log('🔧 Attempting state repair...');

    const repaired = { ...state };

    // Fix missing fields
    if (!repaired.sessionId) {
      repaired.sessionId = `recovered-${Date.now()}`;
    }

    if (!repaired.phase) {
      repaired.phase = 'initializing';
    }

    // Fix invalid values
    if (repaired.currentMilestone > repaired.totalMilestones) {
      repaired.currentMilestone = repaired.totalMilestones;
    }

    repaired.progress = Math.max(0, Math.min(100, repaired.progress));

    // Remove circular references (basic approach)
    try {
      return JSON.parse(JSON.stringify(repaired));
    } catch {
      // If still circular, strip problematic fields
      const safe = {};
      for (const [key, value] of Object.entries(repaired)) {
        try {
          JSON.stringify(value);
          safe[key] = value;
        } catch {
          console.warn(`   Removed circular field: ${key}`);
        }
      }
      return safe;
    }
  }

  static async createBackup(state, label = 'auto') {
    const backupDir = path.join('state', 'backups');
    await fs.mkdir(backupDir, { recursive: true });

    const timestamp = new Date().toISOString().replace(/:/g, '-');
    const backupPath = path.join(backupDir, `${label}-${timestamp}.json`);

    await fs.writeFile(backupPath, JSON.stringify(state, null, 2));
    console.log(`💾 Backup saved: ${backupPath}`);

    return backupPath;
  }

  static async restoreFromBackup(backupPath) {
    const content = await fs.readFile(backupPath, 'utf-8');
    return JSON.parse(content);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCE MONITORING
// ═══════════════════════════════════════════════════════════════════════════

export class ResourceMonitor {
  static async checkResources() {
    const memory = process.memoryUsage();
    const cpu = process.cpuUsage();

    return {
      memory: {
        heapUsed: Math.round(memory.heapUsed / 1024 / 1024), // MB
        heapTotal: Math.round(memory.heapTotal / 1024 / 1024),
        external: Math.round(memory.external / 1024 / 1024),
        rss: Math.round(memory.rss / 1024 / 1024),
        percentage: Math.round((memory.heapUsed / memory.heapTotal) * 100)
      },
      cpu: {
        user: Math.round(cpu.user / 1000), // ms
        system: Math.round(cpu.system / 1000)
      },
      disk: await this.checkDiskSpace(),
      healthy: this.isHealthy(memory, cpu)
    };
  }

  static async checkDiskSpace() {
    try {
      const output = execSync('df -h .', { encoding: 'utf-8' });
      const lines = output.split('\n');
      if (lines.length >= 2) {
        const parts = lines[1].split(/\s+/);
        return {
          total: parts[1],
          used: parts[2],
          available: parts[3],
          percentage: parseInt(parts[4])
        };
      }
    } catch {
      return null;
    }
  }

  static isHealthy(memory, cpu) {
    const memoryPercent = (memory.heapUsed / memory.heapTotal) * 100;

    if (memoryPercent > 90) {
      console.warn('⚠️ High memory usage: ' + memoryPercent.toFixed(1) + '%');
      return false;
    }

    return true;
  }

  static async cleanupTempFiles() {
    console.log('🧹 Cleaning up temporary files...');

    try {
      // Clean node_modules/.cache
      execSync('rm -rf node_modules/.cache', { stdio: 'ignore' });

      // Clean old backups (keep last 10)
      const backupDir = path.join('state', 'backups');
      const backups = await fs.readdir(backupDir);

      if (backups.length > 10) {
        backups.sort().slice(0, -10).forEach(async (file) => {
          await fs.unlink(path.join(backupDir, file));
        });
      }

      console.log('✅ Cleanup complete');
      return true;
    } catch (error) {
      console.error('❌ Cleanup failed:', error.message);
      return false;
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// ROLLBACK MANAGER
// ═══════════════════════════════════════════════════════════════════════════

export class RollbackManager {
  static async createRollbackPoint(label = 'auto') {
    try {
      const commitHash = execSync('git rev-parse HEAD', { encoding: 'utf-8' }).trim();
      const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf-8' }).trim();

      const rollbackPoint = {
        commit: commitHash,
        branch,
        label,
        timestamp: new Date().toISOString(),
        files: await this.getModifiedFiles()
      };

      // Save rollback point
      const rollbackPath = path.join('state', 'rollbacks', `${label}-${Date.now()}.json`);
      await fs.mkdir(path.dirname(rollbackPath), { recursive: true });
      await fs.writeFile(rollbackPath, JSON.stringify(rollbackPoint, null, 2));

      console.log(`📍 Rollback point created: ${commitHash.substring(0, 8)}`);
      return rollbackPoint;

    } catch (error) {
      console.error('❌ Failed to create rollback point:', error.message);
      return null;
    }
  }

  static async rollback(rollbackPoint) {
    console.log(`⏪ Rolling back to ${rollbackPoint.commit.substring(0, 8)}...`);

    try {
      // Stash any uncommitted changes
      execSync('git stash push -m "Auto-stash before rollback"', { stdio: 'ignore' });

      // Hard reset to rollback point
      execSync(`git reset --hard ${rollbackPoint.commit}`, { stdio: 'inherit' });

      console.log('✅ Rollback successful');
      return true;

    } catch (error) {
      console.error('❌ Rollback failed:', error.message);

      // Try to recover
      try {
        execSync('git stash pop', { stdio: 'ignore' });
      } catch {}

      return false;
    }
  }

  static async getModifiedFiles() {
    try {
      const output = execSync('git diff --name-only HEAD', { encoding: 'utf-8' });
      return output.trim().split('\n').filter(Boolean);
    } catch {
      return [];
    }
  }

  static async listRollbackPoints() {
    const rollbackDir = path.join('state', 'rollbacks');

    try {
      const files = await fs.readdir(rollbackDir);
      const rollbackPoints = [];

      for (const file of files) {
        const content = await fs.readFile(path.join(rollbackDir, file), 'utf-8');
        rollbackPoints.push(JSON.parse(content));
      }

      return rollbackPoints.sort((a, b) =>
        new Date(b.timestamp) - new Date(a.timestamp)
      );

    } catch {
      return [];
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

export default {
  EdgeCaseClassifier,
  ConflictResolver,
  DependencyResolver,
  StateRecovery,
  ResourceMonitor,
  RollbackManager
};
